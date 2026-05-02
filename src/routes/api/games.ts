/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @file routes/api/games.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Game API routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware.js";
import GameRepository from "../../models/game.js";
import { shuffleDeck } from "../../shared/util.js";
import { GameParams, TypedRequest, GameRequest, GameEventBody } from "../../types.js";
import { GameConfig } from "../../shared/types.js";
import { Game } from "../../models/types.js";
import {
  GAME_CONFIGS,
  GameStatus,
  GamesEventEnum,
  ACTION_MAP,
  ActionEnum,
  Action,
} from "../../shared/env.js";
import { HttpError, ResponseError } from "../../util/error.js";
import logger from "../../util/logger.js";
import { broadcast, addClient } from "../../sse.js";

// xxx short-circuit to be simple
const DEFAULT_BUYIN = 100;

const router = Router();

/**
 * List all available games.
 *
 * @note NO requireAuth, so that guests can spectate games from the lobby (but
 * can't join)
 */
router.get("/games", async (req: Request<GameParams>, res: Response, next: NextFunction) => {
  /**
   * @note since this an api request, ${error_handling_policy - blank json?}
   */
  try {
    // games
    // xxx let's have find available take an optional search predicate to apply
    // more query filters!
    const games = await GameRepository.findAvailableAll(req.session.userId);
    if (!games) {
      // not an error, just display an empty list
      // xxx maybe we want to change the contract of findAvailableAll to just
      // always return an empty list, if this is our common case
    }

    res.json({ games: games ?? [] });
  } catch (err) {
    // xxx do we want to do this? log THIS error, then clobber it and replace
    // with bad response error
    logger.error(String(err));
    next(new ResponseError({ games: [] }, "failed to get games"));
  }
});

router.get(
  "/games/find",
  requireAuth,
  async (req: Request<GameParams>, res: Response, next: NextFunction) => {
    // this needs to go into game params, or since this is special, maybe its
    // own param obj? need to let the api decide...
    const smallBlind = Number(req.query.small_blind as string);
    const bigBlind = Number(req.query.big_blind as string);

    if (!smallBlind || !bigBlind) {
      next(new ResponseError({ game: null }, "invalid blinds", 400));
      return;
    }

    try {
      const games = await GameRepository.findAvailableBlind(smallBlind, bigBlind);
      if (!games) {
        // xxx err
        console.log("null games");
        return;
      }

      // coherce undefined to null, if undefined
      const game = games[0] ?? null;
      res.json({ game });
    } catch (err) {
      logger.error(String(err));
      next(new ResponseError({ game: null }, "no games found for blinds", 500));
    }
  },
);

/**
 * Create a new game.
 */
router.post(
  "/games/create",
  requireAuth,
  async (
    req: TypedRequest<{ blinds: string; seats: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    const { blinds, seats } = req.body;
    let cfg: GameConfig | null = null;

    if (blinds && seats) {
      const [sm, big] = blinds.split("/").map(Number);
      const maxSeats = Number(seats);
      cfg =
        Object.values(GAME_CONFIGS).find(
          (c) => c.smallBlind === sm && c.bigBlind === big && c.maxSeats === maxSeats,
        ) ?? null;
    }

    if (!cfg) {
      req.flash("error", "invalid game configuration");
      res.redirect("back");
      return;
    }

    const g: Partial<Game> = {
      status: GameStatus.WAITING,
      pot_amount: 0,
      max_seats: cfg.maxSeats,
      small_blind: cfg.smallBlind,
      big_blind: cfg.bigBlind,
      last_raise_amount: 0,
      deck_position: 0,
      player_count: 0,
    };

    try {
      const game: Game | null = await GameRepository.create(g);
      if (!game) {
        // xxx do we want to just flash, or redirect to an error page?
        // flash:
        //  pros: non-invasive, keeps user on current page
        //  cons: not robust, this is a FATAL server error
        // HttpError:
        //  pros: this is a FATAL server error, act like it
        //  cons: INVASIVE
        // SOLUTION: choosing HttpError for now, since this is FATAL server error
        next(new HttpError("failed to create game", 404));
        return;
      }

      const cards: number[] = shuffleDeck();
      if (!(await GameRepository.upsertCards(game.id, cards))) {
        if (!(await GameRepository.delete(game.id))) {
          throw new Error(`FATAL: failed to delete game_id (${game.id}) with invalid cards`);
        }
        next(new HttpError("failed to shuffle deck", 404));
        return;
      }

      // lobby broadcast: new game created
      const games = await GameRepository.findAvailableAll();
      broadcast({ type: GamesEventEnum.GAMES_UPDATED, games: games ?? [] }, (c) => !c.gameId);

      res.json({ game });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Join a game.
 */
router.post(
  "/games/:id/join",
  requireAuth,
  async (req: Request<GameParams>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const userId = req.session.userId as string;

    try {
      // game data:
      const game = await GameRepository.findById(id);
      if (!game) {
        next(new HttpError("Game not found", 404));
        return;
      }

      // seat is optional — from game page (specific seat) or lobby (auto-assign)
      const seatNo = req.query.seat ? Number(req.query.seat) : null;

      // let model handle validation of userId + seat assignment
      if (!(await GameRepository.addUser(game.id, userId, DEFAULT_BUYIN, seatNo))) {
        // xxx this should be flash, but since we can come from a different page
        // (i.e., create -> join), then we have awkward timing and need to
        // handle our next/session store carefully
        next(new HttpError("Failed to join game", 404));
        return;
      }

      // lobby broadcast: player_count changed
      const games = await GameRepository.findAvailableAll();
      broadcast({ type: GamesEventEnum.GAMES_UPDATED, games: games ?? [] });

      // game-room broadcast
      broadcast({ type: ACTION_MAP[ActionEnum.PLAYER_JOINED], userId }, (c) => c.gameId === id);

      res.redirect(`/game/${id}`);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Exit a game.
 * xxx logic to remove player from game
 */
router.post(
  "/games/:id/exit",
  requireAuth,
  async (req: Request<GameParams>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const userId = req.session.userId as string;

    try {
      // xxx logic to remove player from game
      if (!(await GameRepository.removeUser(id, userId))) {
        next(new HttpError("Failed to exit game", 404));
        return;
      }

      const games = await GameRepository.findAvailableAll();
      broadcast({ type: GamesEventEnum.GAMES_UPDATED, games: games ?? [] }, (c) => !c.gameId);
      broadcast({ type: ACTION_MAP[ActionEnum.PLAYER_LEFT], userId }, (c) => c.gameId === id);

      res.redirect("/lobby");
    } catch (err) {
      next(err);
    }
  },
);

/**
 * User actions (bet, call, raise, check, fold, all-in).
 */
router.post("/games/:id/action", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * Deal hands to all players (start of hand).
 */
router.post("/games/:id/deal", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

const FLOP_LEN: number = 3;
const HAND_LEN: number = 2;
// 2 min
const TURN_DEADLINE_SECS = 120;

function startGame(id: string) {
	thisGame (c) => c.gameId === id;

	// this game started
	broadcast({ type: ACTION_MAP[ActionEnum.GAME_STARTED], gameId }, thisGame);

    // all games broadcast: game started
    const games = await GameRepository.findAvailableAll();
    broadcast({ type: GamesEventEnum.GAMES_UPDATED, games: games ?? [] });
	// xxx should games be a map, so we don't have to re-lookup...?
	// xxx might expose unintended data to frontend

	// deal community cards
	const flop = await GameRepository.dealCards(id, CardLocation.COMMUNITY, FLOP_LEN);
	if (!flop) {
		// xxx we have problems... we've already committed a ton of state.
		// handle gracefully
		logger.error("dealing flop failed");
		return;
	}
	broadcast({ 
		type: ACTION_MAP[ActionEnum.DEAL_COMMUNITY], 
		communityCards: flop,
		gameId,
	}, thisGame);

	const game = await GameRepository.findById(id);
	if (!game) {
		// xxx
		logger.error(`error finding game for gameId: ${id}`);
		return;
	}

	// xxx expose in game model? how common is this?
	const players = await GameRepository.getUsers(id);
	if (!players) {
		// xxx
		logger.error(`error finding players for gameId: ${id}`);
		return;
	}
	for (const p of players) {
		// xxx have an animation for
		const hand = await GameRepository.dealCards(id, CardLocation.HAND, HAND_LEN);
		if (!hand) {
			// xxx
			logger.error(`error dealing hand for userId: ${p.user_id}`);
			return;
		}
		broadcast({ 
			type: ACTION_MAP[ActionEnum.DEAL_HAND], 
			playerCards,
			gameId,
		}, (c) => c.userId=== p.user_user});
	}

	const nextGame = await.GameRepository.nextTurn(id);
	broadcast({
		type: ACTION_MAP[ActionEnum.NEXT_TURN],
		game,
		gameId,
	}, thisGame);
}

function handleEvent(gameId: string, ev: GameEventBody): boolean {
	const userId: string = ev.userId;
  const action: Action = ev.action;
  const value: Maybe<number> = ev.value;
  let player = await GameRepository.getUser(userId);
  if (!player) {
		// xxx fatal, we don't expect this... handle better
		logger.error(`failed to get user for userId: ${userId}`);
		return false;
  }
  switch (action) {
  case ActionEnum.BET: 
  case ActionEnum.CALL:
  case ActionEnum.RAISE: {
	if (value == null) {
		// "invalid bet amount"
		return false;
	}
	player.last_bet = value;
	ok = await GameRepository.updateBalance(gameId, userId, value);
	if (!ok) {
		// show "invalid bet" to frontend
		return ok;
	}			
	amt = await GameRepository.updatePot(gameId, userId, value);
	// in the case of a bet, we always validate that the user has the bet, so			
	// always expect amt === value
	if (amt !== value) {
		// show "unable to add bet to pot" to frontend
		return false;
	}
	ok = await GameRepository.updateUser(gameId, player);
	if (!ok) {
		// xxx
		return ok;
	}
	break;
  }
  case ActionEnum.CHECK: {	// xxx does check ever affect balance?
	// go next
    break;
  }
  case ActionEnum.FOLD: {
	player.last_bet = null;
	// remove eligibility from all pots
	amt = await GameRepository.removePotUser(id, userId);
	if (amt == null) {
		// xxx "unable to fold". very fatal, what do we do?
		logger.error(`FATAL: unable to fold for userId (${userId}) in gameId (${id})`);
		return false;
	}
	ok = await GameRepository.updateUser(gameId, player);
	if (!ok) {
		// xxx
		return ok;
	}
	break;
  }
  case ActionEnum.ALL_IN: {
	const amt = player.balance;
	if (amt <= 0) {
		// unexpected case, should already be validated against
		return false;
	}
	const betAmt = await GameRepository.updatePot(gameId, player.user_id, amt);
	if (betAmt != amt) {
		logger.warn(`final bet amount (${betAmt}) did not match expected bet
    break;
  }
  default:
    logger.error(`invalid action: ${action}`);
}


/**
 * SSE endpoint for live game state.
 */
router.get("/games/:id/events", requireAuth, (req: GameRequest<GameEventBody>, res: Response) => {
  const action = req.body.action;
  //handleAction(action);
});

/**
 * Get play-by-play for a game.
 * xxx STRETCH
 */
router.get("/games/:id/history", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.render("/");
});

export default router;
