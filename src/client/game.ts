/**
 * @file game.js
 * @author Tyler Baxter
 * @data 2026-03-22
 *
 * Client-side game render logic.
 */

import { indexToCard } from "../shared/util.js";

// UTIL
const Action = Object.freeze({
  DEAL_COMMUNITY: 0,
  DEAL_HAND: 1,
  BET: 2,
  CALL: 3,
  RAISE: 4,
  CHECK: 5,
  FOLD: 6,
  ALL_IN: 7,
  SHOWDOWN: 8,
  PAYOUT: 9,
});

const CARD_SVG = "/img/svg-cards.svg";
const CARD_VIEWBOX = "0 0 169.075 244.64";

function renderCard(cardNum: number, container: Element): void {
  const { rank, suit } = indexToCard(cardNum);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

  svg.setAttribute("viewBox", CARD_VIEWBOX);
  svg.classList.add("card", suit);
  use.setAttribute("href", `${CARD_SVG}#${suit}_${rank}`);

  svg.appendChild(use);
  container.appendChild(svg);
}

function renderCardBack(container: Element, fill = "#000"): void {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

  svg.setAttribute("viewBox", CARD_VIEWBOX);
  svg.classList.add("card", "card-back");
  use.setAttribute("href", `${CARD_SVG}#alternate-back`);
  use.setAttribute("fill", fill);

  svg.appendChild(use);
  container.appendChild(svg);
}

// ACTION BAR
const gameId = (document.getElementById("game-container") as HTMLElement).dataset.gameId as string;

document.querySelectorAll<HTMLButtonElement>("#action-bar button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = Number(btn.dataset.action);
    const amount =
      action === Action.RAISE
        ? Number((document.getElementById("raise-input") as HTMLInputElement).value || 0)
        : undefined;

    // need to fetch because can't do server-side POST page reloads with SSE
    void fetch(`/api/games/${gameId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, amount: amount }),
    });
  });
});

// GAME
/**
 * Render cards on game-area.
 */
document.querySelectorAll<HTMLElement>(".card-slot[data-card]").forEach((slot) => {
  renderCard(Number(slot.dataset.card), slot);
});
document.querySelectorAll<HTMLElement>(".card-slot[data-card-back]").forEach((slot) => {
  renderCardBack(slot);
});

// SEATS
// Distribute seats evenly around the felt based on its rendered dimensions.
// Reads the felt's actual width/height to derive an ellipse, so this works
// regardless of whether the felt is circular, oval, or rectangular.
const table = document.getElementById("table") as HTMLElement;
const felt = document.getElementById("felt") as HTMLElement;
const seats = table.querySelectorAll<HTMLElement>(".seat");
const totalSeats = seats.length;

function layoutSeats(): void {
  const seatH = seats[0].offsetHeight;
  const seatW = seats[0].offsetWidth;
  const tableW = table.offsetWidth;
  const tableH = table.offsetHeight;

  // the felt orbit - seats center on this ellipse
  const feltW = felt.offsetWidth;
  const feltH = felt.offsetHeight;

  // shrink orbit so full seat stays inside the table
  // x radii
  const rx = ((feltW / 2 - seatW / 2) / tableW) * 100;
  // y radii
  const ry = ((feltH / 2 - seatH / 2) / tableH) * 100;

  seats.forEach((seat, i) => {
    //  * full circle is 2 * Math.PI
    //  * Math.PI / 2 = 90 degrees, to rotate seat 0 from the right to the
    //    bottom of the screen
    //  * evenly distribute n seats around circle
    const angle = (i / totalSeats) * 2 * Math.PI + Math.PI / 2;
    seat.style.left = String(50 + Math.cos(angle) * rx) + "%";
    seat.style.top = String(50 + Math.sin(angle) * ry) + "%";
  });
}

layoutSeats();

// LAST ACTION
function setLastAction(userId: string, action: string): void {
  const seat = document.querySelector<HTMLElement>(`.seat[data-userid="${userId}"]`);
  if (!seat) return;
  const label = seat.querySelector<HTMLElement>(".seat-last-action");
  if (!label) return;
  label.textContent = action;
  label.classList.remove("fade-out");
  void label.offsetWidth; // reflow to restart animation
  label.classList.add("fade-out");
}

// SSE
const evtSource = new EventSource(`/api/games/${gameId}/events`);
evtSource.addEventListener("last-action", (e: MessageEvent) => {
  const data = JSON.parse(e.data as string) as { userId: string; action: string };
  setLastAction(data.userId, data.action);
});
