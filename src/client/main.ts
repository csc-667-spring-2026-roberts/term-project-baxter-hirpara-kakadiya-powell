/**
 * @file src/client/main.ts
 * @author Tyler Baxter
 * @date 2026-04-04
 *
 * Global client JS. Dropdowns, flash messages, dialog modals.
 */

const createGameButton = document.querySelector<HTMLButtonElement>("#create-game-button");
const createGameDialog = document.querySelector<HTMLDialogElement>("#create-game-dialog");
const createGameCancel = document.querySelector<HTMLButtonElement>("#create-game-cancel");
const findGameButton = document.querySelector<HTMLButtonElement>("#find-game-button");
const findGameDialog = document.querySelector<HTMLDialogElement>("#find-game-dialog");
const findGameCancel = document.querySelector<HTMLButtonElement>("#find-game-cancel");
const findGameResult = document.querySelector<HTMLDivElement>("#find-game-result");
const findGameSubmit = document.querySelector<HTMLButtonElement>("#find-game-submit");

// xxx also type these
// dropdown dynamic logic:
document.querySelectorAll<HTMLElement>(".dropdown-toggle").forEach((btn) => {
  btn.addEventListener("click", () => btn.parentElement?.classList.toggle("open"));
});

document.addEventListener("click", (e) => {
  if (!(e.target instanceof HTMLElement) || !e.target.closest(".dropdown"))
    document.querySelectorAll(".dropdown").forEach((d) => {
      d.classList.remove("open");
    });
});

// after css animations, remove flash messages
document.querySelectorAll<HTMLElement>(".flash").forEach((el) => {
  el.addEventListener("animationend", () => {
    el.remove();
  });
});

// dialog modal dynamic logic:
if (createGameButton && createGameDialog) {
  createGameButton.addEventListener("click", () => {
    createGameDialog.showModal();
  });
  createGameCancel.addEventListener("click", () => {
    createGameDialog.close();
  });
}

if (findGameButton && findGameDialog) {
  findGameButton.addEventListener("click", () => {
    findGameDialog.showModal();
  });
  findGameCancel.addEventListener("click", () => {
    findGameDialog.close();
  });
}

if (findGameSubmit && findGameResult) {
  findGameSubmit.addEventListener("click", () => {
    const select = document.getElementById("find-config") as HTMLSelectElement | null;
    if (!select) return;
    const opt = select.selectedOptions[0];
    if (!opt) return;

    const sm = opt.dataset.smallBlind ?? "";
    const big = opt.dataset.bigBlind ?? "";

    findGameResult.textContent = "Searching...";

    const q = `small_blind=${sm}&big_blind=${big}`;
    fetch(`/api/games/find?${q}`)
      .then((res) => res.json() as Promise<{ game: { id: string } | null }>)
      .then((data) => {
        if (data.game) {
          // if we receive a game, then set href to be found game
          window.location.href = `/game/${data.game.id}`;
        } else {
          // else, forward to create-game-dialog (if it's found)
          findGameResult.textContent = "No games found";
          if (createGameDialog) {
            const btn = document.createElement("button");
            btn.textContent = "Create Game";
            btn.addEventListener("click", () => {
              findGameDialog?.close();
              createGameDialog.showModal();
            });
            findGameResult.appendChild(btn);
          }
          // if create-game-dialog isn't found, just display textContent and let
          // user determine modal behavior
        }
      })
      .catch((err: unknown) => {
        console.error("Find game failed:", err);
        findGameResult.textContent = "Search failed";
      });
  });
}
