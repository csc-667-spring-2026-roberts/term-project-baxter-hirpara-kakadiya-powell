/**
 * @file game.js
 * @author Tyler Baxter
 * @data 2026-03-22
 *
 * Client-side game render logic.
 */

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

const SUITS = ["heart", "diamond", "club", "spade"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
const CARD_SVG = "/img/svg-cards.svg";
const CARD_VIEWBOX = "0 0 169.075 244.64";

function renderCard(cardNum, container) {
  const suit = SUITS[Math.floor(cardNum / 13)];
  const rank = RANKS[cardNum % 13];

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

  svg.setAttribute("viewBox", CARD_VIEWBOX);
  svg.classList.add("card", suit);
  use.setAttribute("href", `${CARD_SVG}#${suit}_${rank}`);

  svg.appendChild(use);
  container.appendChild(svg);
}

function renderCardBack(container, fill = "#000") {
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
var gameId = document.getElementById("game-container").dataset.gameId;

document.querySelectorAll("#action-bar button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    var action = Number(btn.dataset.action);
    var amount =
      action === Action.RAISE
        ? Number(document.getElementById("raise-input").value || 0)
        : undefined;

    // need to fetch because can't do server-side POST page reloads with SSE
    fetch("/api/games/" + gameId + "/action", {
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
document.querySelectorAll(".card-slot[data-card]").forEach((slot) => {
  renderCard(Number(slot.dataset.card), slot);
});
document.querySelectorAll(".card-slot[data-card-back]").forEach((slot) => {
  renderCardBack(slot);
});

// SEATS
// Distribute seats evenly around the felt based on its rendered dimensions.
// Reads the felt's actual width/height to derive an ellipse, so this works
// regardless of whether the felt is circular, oval, or rectangular.
var table = document.getElementById("table");
var felt = document.getElementById("felt");
var seats = table.querySelectorAll(".seat");
var totalSeats = seats.length;

function layoutSeats() {
  var seatH = seats[0].offsetHeight;
  var seatW = seats[0].offsetWidth;
  var tableW = table.offsetWidth;
  var tableH = table.offsetHeight;

  // the felt orbit - seats center on this ellipse
  var feltW = felt.offsetWidth;
  var feltH = felt.offsetHeight;

  // shrink orbit so full seat stays inside the table
  // x radii
  var rx = ((feltW / 2 - seatW / 2) / tableW) * 100;
  // y radii
  var ry = ((feltH / 2 - seatH / 2) / tableH) * 100;

  seats.forEach((seat, i) => {
    //  * full circle is 2 * Math.PI
    //  * Math.PI / 2 = 90 degrees, to rotate seat 0 from the right to the
    //    bottom of the screen
    //  * evenly distribute n seats around circle
    var angle = (i / totalSeats) * 2 * Math.PI + Math.PI / 2;
    seat.style.left = 50 + Math.cos(angle) * rx + "%";
    seat.style.top = 50 + Math.sin(angle) * ry + "%";
  });
}

layoutSeats();
