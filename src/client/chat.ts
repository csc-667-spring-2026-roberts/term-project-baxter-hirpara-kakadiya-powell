/**
 * @file chat.js
 * @author Tyler Baxter
 * @data 2026-03-22
 *
 * Client-side chat render logic.
 */

import type { Message } from "../models/types.js";

const chatButton = document.getElementById("chat-button");
const chatPopout = document.getElementById("chat-popout");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;

function appendMessage(username: string, body: string, createdAt?: string): void {
  const div = document.createElement("div");
  div.className = "chat-message";
  const meta = document.createElement("div");
  meta.className = "chat-message-meta";
  const strong = document.createElement("strong");
  strong.className = "chat-message-username";
  strong.textContent = username;
  const time = document.createElement("span");
  time.className = "chat-message-time";
  const date = createdAt ? new Date(createdAt) : new Date();
  time.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  meta.appendChild(strong);
  meta.appendChild(time);
  const text = document.createElement("p");
  text.className = "chat-message-body";
  text.textContent = body;
  div.appendChild(meta);
  div.appendChild(text);
  if (chatMessages) {
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

if (chatButton) {
  // Chat button toggle show/hide.
  chatButton.addEventListener("click", () => {
    chatPopout?.classList.toggle("chat-closed");
  });

  // active tab selection
  document.querySelectorAll(".chat-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelector(".chat-tab.active")?.classList.remove("active");
      tab.classList.add("active");
    });
  });

  // get gameId if on a game page
  const gameContainer = document.getElementById("game-container");
  const gameId = gameContainer?.dataset.gameId ?? null;

  // fetch game messages on load
  if (gameId) {
    void fetch(`/api/games/${gameId}/messages`)
      .then((res) => res.json() as Promise<Message[]>)
      .then((msgs) => {
        if (msgs.length === 0) {
          return;
        }
        msgs.forEach((msg) => {
          appendMessage(msg.username, msg.body, String(msg.created_at));
        });
      });
  }

  // send message
  chatForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input") as HTMLInputElement | null;
    const body = (input?.value ?? "").trim();
    if (!body) {
      return;
    }

    void fetch(`/api/games/${gameId ?? ""}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body }),
    });

    if (input) input.value = "";
  });
}
