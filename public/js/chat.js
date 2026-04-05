/**
 * @file chat.js
 * @author Tyler Baxter
 * @data 2026-03-22
 *
 * Client-side chat render logic.
 */

var chatButton = document.getElementById("chat-button");
var chatPopout = document.getElementById("chat-popout");
var chatMessages = document.getElementById("chat-messages");
var chatForm = document.getElementById("chat-form");
var chatInput = document.getElementById("chat-input");

function appendMessage(username, body) {
  var div = document.createElement("div");
  var strong = document.createElement("strong");

  div.className = "chat-message";
  strong.textContent = `${username}: `;

  div.appendChild(strong);
  div.appendChild(document.createTextNode(body));

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatButton) {
  // Chat button toggle show/hide.
  chatButton.addEventListener("click", () => {
    chatPopout.classList.toggle("chat-closed");
  });

  // active tab selection
  document.querySelectorAll(".chat-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelector(".chat-tab.active").classList.remove("active");
      tab.classList.add("active");
    });
  });

  // get gameId if on a game page
  var gameContainer = document.getElementById("game-container");
  var gameId = gameContainer ? gameContainer.dataset.gameId : null;

  // fetch game messages on load
  if (gameId) {
    fetch(`/api/games/${gameId}/messages`)
      .then((res) => res.json())
      .then((msgs) => {
        if (!msgs || !msgs.length) {
          return;
        }
        msgs.forEach((msg) => {
          appendMessage(msg.username, msg.body);
        });
      });
  }

  // send message
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    var input = document.getElementById("chat-input");
    var body = (input.value || "").trim();
    if (!body) {
      return;
    }

    fetch("/api/games/" + gameId + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body }),
    });

    input.value = "";
  });
}
