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
const filters = document.querySelector("#lobby-filters") as HTMLElement;

let allGames: Game[] = [];
let games: Game[] = [];

/**
 * @pre game is a valid, pre-validated object from the backend. we're not
 * responsible for fallbacks in the render call.
 */
function renderGameCard(game: Game): HTMLElement {
  const clone = gameCardTemplate.content.cloneNode(true) as DocumentFragment;

  const player_count = String(game.player_count);
  const max_seats = String(game.max_seats);

  const smallBlind: string = String(game.small_blind);
  const bigBlind: string = String(game.big_blind);
  const status: string = gameStatus(game.status);

  const playersText = `${player_count}/${max_seats} seats`;
  const blindsText = `$${smallBlind}/$${bigBlind}`;

  (clone.querySelector("[data-game-players]") as HTMLElement).textContent = playersText;
  (clone.querySelector("[data-game-blinds]") as HTMLElement).textContent = blindsText;
  (clone.querySelector("[data-game-status]") as HTMLElement).textContent = status;

  const joinForm = clone.querySelector("[data-join-form]") as HTMLFormElement;
  // xxx do we want to show join button, then redirect to login without auth,
  // or do we want to just show spectate? what's better ux?
  // having a "Login to Join" button is probably the best ux, that
  // way the user has a clear pathway on HOW TO join, but to keep things
  // simpler, we'll just redirect a non-auth'd user to the login page when
  // they hit this endpoint. it works, is simple, and the ux isn't horrible
  joinForm.action = `/api/games/${game.id}/join`;

  const spectateButton = clone.querySelector("[data-spectate-button]") as HTMLButtonElement;
  spectateButton.addEventListener("click", () => {
    window.location.href = `/game/${game.id}`;
  });

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
