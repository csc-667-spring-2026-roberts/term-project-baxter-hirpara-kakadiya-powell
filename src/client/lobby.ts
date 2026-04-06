/**
 * @file public/js/lobby.ts
 * @author Tyler Baxter
 * @date 2026-04-04
 *
 * Lobby client JS. Fetches game list via API and renders game cards.
 * Create game form is a standard POST (handled by EJS partial).
 */

import { gameStatus } from "../shared/env.js";
import type { Game } from "../models/types.js";

// global, so that we only call once on dom load - don't put in function to
// constantly re-call. if we only need to do something on setup, then do it once
// here
const gamesList = document.querySelector("#games-list") as HTMLDivElement;
const gameCardTemplate = document.querySelector("#game-card-template") as HTMLTemplateElement;
const filterSelect = document.querySelector("#filter-select") as HTMLSelectElement;

let games: Game[] = [];

/**
 * @pre game is a valid, pre-validated object from the backend. we're not
 * responsible for fallbacks in the render call.
 */
function renderGameCard(game: Game): HTMLElement {
  const clone = gameCardTemplate.content.cloneNode(true) as DocumentFragment;

  const player_count = game.player_count;
  const max_seats = game.max_seats;

  const smallBlind: string = game.small_blind.toFixed(2);
  const bigBlind: string = game.big_blind.toFixed(2);
  const status: string = gameStatus(game.status);

  const playersText = `${String(player_count)}/${String(max_seats)} players`;
  const blindsText = (`${smallBlind}/${bigBlind} blinds`(
    clone.querySelector("[data-game-players]") as HTMLElement,
  ).textContent = playersText);
  (clone.querySelector("[data-game-blinds]") as HTMLElement).textContent = blindsText;
  (clone.querySelector("[data-game-status]") as HTMLElement).textContent = status;

  const joinForm = clone.querySelector("[data-join-form]") as HTMLFormElement;
  joinForm.action = `/api/games/${game.id}/join`;

  const spectateLink = clone.querySelector("[data-spectate-link]") as HTMLAnchorElement;
  spectateLink.href = `/api/games/${game.id}/spectate`;

  return clone.firstElementChild as HTMLElement;
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

function filter(): void {
  if (!filterSelect.value) {
    return;
  }

  const opt = filterSelect.selectedOptions[0];
  if (!opt) {
    return;
  }

  const sm = Number(opt.dataset.smallBlind);
  const big = Number(opt.dataset.bigBlind);
  const seats = Number(opt.dataset.maxSeats);

  games = games.filter((g) => g.small_blind === sm && g.big_blind === big && g.max_seats === seats);

  renderGames();
}

function loadGames(): void {
  fetch("/api/games")
    .then((res) => res.json() as Promise<{ games: Game[] }>)
    .then((data) => {
      games = data.games;

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
filterSelect.addEventListener("change", filter);
