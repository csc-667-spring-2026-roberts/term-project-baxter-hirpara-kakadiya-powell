/**
 * @file public/js/lobby.ts
 * @author Tyler Baxter
 * @date 2026-04-04
 *
 * Lobby client JS. Fetches game list via API and renders game cards.
 * Create game form is a standard POST (handled by EJS partial).
 */

import { gameStatus, GamesEventEnum } from "../shared/env.js";
import type { Game } from "../models/types.js";

// SSE: lobby-wide events (game list updates)
function connectSSE(url: string, onMessage: (ev: MessageEvent<string>) => void): void {
  let src = new EventSource(url);

  const attach = (s: EventSource): void => {
    s.onmessage = onMessage;
    s.onerror = (): void => {
      if (s.readyState === EventSource.CLOSED) {
        setTimeout(() => {
          src = new EventSource(url);
          attach(src);
        }, 2000);
      }
    };
  };

  attach(src);
}

connectSSE("/api/lobby/sse", (ev) => {
  const data = JSON.parse(ev.data) as { type: string; games?: Game[] };

  if (data.type === GamesEventEnum.GAMES_UPDATED && data.games) {
    allGames = data.games;
    filter();
  }
});

// global, so that we only call once on dom load - don't put in function to
// constantly re-call. if we only need to do something on setup, then do it once
// here
const gamesList = document.querySelector<HTMLDivElement>("#games-list");
if (!gamesList) {
  throw new Error("missing #games-list");
}
const gameCardTemplate = document.querySelector<HTMLTemplateElement>("#game-card-template");
if (!gameCardTemplate) {
  throw new Error("missing #game-card-template");
}
const filters = document.querySelector<HTMLElement>("#lobby-filters");
if (!filters) {
  throw new Error("missing #lobby-filters");
}

let allGames: Game[] = [];
let games: Game[] = [];

/* xxx unused
async function _joinGame(gameId: string): Promise<void> {
  const resp = await fetch(`/api/games/${gameId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    console.error("failed to join game");
  }
}
*/

/**
 * @pre game is a valid, pre-validated object from the backend. we're not
 * responsible for fallbacks in the render call.
 */
function renderGameCard(game: Game): HTMLElement {
  const clone = gameCardTemplate.content.cloneNode(true) as DocumentFragment;
  const card = clone.firstElementChild;
  if (!(card instanceof HTMLElement)) {
    throw new Error("empty game card template");
  }

  const player_count = String(game.player_count);
  const max_seats = String(game.max_seats);

  const smallBlind: string = String(game.small_blind);
  const bigBlind: string = String(game.big_blind);
  const status: string = gameStatus(game.status);

  const playersText = `${player_count}/${max_seats} seats`;
  const blindsText = `$${smallBlind}/$${bigBlind}`;

  const playersEl = card.querySelector<HTMLElement>("[data-game-players]");
  if (playersEl) {
    playersEl.textContent = playersText;
  }
  const blindsEl = card.querySelector<HTMLElement>("[data-game-blinds]");
  if (blindsEl) {
    blindsEl.textContent = blindsText;
  }
  const statusEl = card.querySelector<HTMLElement>("[data-game-status]");
  if (statusEl) {
    statusEl.textContent = status;
  }

  // xxx do we want to show join button, then redirect to login without auth,
  // or do we want to just show spectate? what's better ux?
  // having a "Login to Join" button is probably the best ux, that
  // way the user has a clear pathway on HOW TO join, but to keep things
  // simpler, we'll just redirect a non-auth'd user to the login page when
  // they hit this endpoint. it works, is simple, and the ux isn't horrible
  const joinForm = card.querySelector<HTMLFormElement>("[data-join-form]");
  if (joinForm) {
    joinForm.action = `/api/games/${game.id}/join`;
  }

  const spectateButton = card.querySelector<HTMLButtonElement>("[data-spectate-button]");
  if (spectateButton) {
    spectateButton.addEventListener("click", () => {
      window.location.href = `/game/${game.id}`;
    });
  }

  return card;
}

/**
 * Helper function to be called on load or filter change.
 */
function renderGames(): void {
  gamesList.innerHTML = "";
  if (games.length === 0) {
    gamesList.innerHTML = "<p>No games match filter.</p>";
    return;
  }
  // accumulate all elements before drawing, so we don't redraw
  gamesList.append(...games.map(renderGameCard));
}

function getCheckedEl(name: string): HTMLInputElement | null {
  return filters.querySelector(`input[name="${name}"]:checked`);
}

function filter(): void {
  let filtered = allGames;

  const blindsEl = getCheckedEl("blinds");
  if (blindsEl?.value) {
    const sm = Number(blindsEl.dataset.smallBlind);
    const big = Number(blindsEl.dataset.bigBlind);
    filtered = filtered.filter((g) => g.small_blind === sm && g.big_blind === big);
  }

  const seatsEl = getCheckedEl("seats");
  if (seatsEl?.value) {
    const seats = Number(seatsEl.dataset.maxSeats);
    filtered = filtered.filter((g) => g.max_seats === seats);
  }

  games = filtered;
  renderGames();
}

function loadGames(): void {
  fetch("/api/games")
    .then((res) => res.json() as Promise<{ games: Game[] }>)
    .then((data) => {
      allGames = data.games;
      games = allGames;

      if (games.length === 0) {
        gamesList.innerHTML = "<p>No games created yet. Create one!</p>";
        return;
      }

      renderGames();
    })
    .catch((err: unknown) => {
      const s = "Failed to load games";
      console.error(`${s}:`, err);
      gamesList.innerHTML = `<p>${s}.</p>`;
    });
}

document.addEventListener("DOMContentLoaded", loadGames);
filters.addEventListener("change", filter);

// create game: fetch create, then POST to join via dynamic form
const createDialog = document.querySelector<HTMLDialogElement>("#create-game-dialog");
const createSubmit = document.querySelector<HTMLButtonElement>("#create-game-submit");

if (createDialog && createSubmit) {
  createSubmit.addEventListener("click", () => {
    const blindsEl = createDialog.querySelector<HTMLInputElement>('input[name="blinds"]:checked');
    const seatsEl = createDialog.querySelector<HTMLInputElement>('input[name="seats"]:checked');
    if (!blindsEl || !seatsEl) return;

    fetch("/api/games/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blinds: blindsEl.value, seats: seatsEl.value }),
    })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          throw new Error("not authenticated");
        }
        if (!res.ok) throw new Error("create failed");
        return res.json() as Promise<{ game: { id: string } }>;
      })
      .then((data) => {
        // POST to join via dynamic form — server handles redirect
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `/api/games/${data.game.id}/join`;
        document.body.appendChild(form);
        form.submit();
      })
      .catch((err: unknown) => {
        console.error("Failed to create game:", err);
      });
  });
}
