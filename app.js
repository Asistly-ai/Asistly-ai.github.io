const form = document.querySelector("#ticket-form");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#submit-button");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSubmit = document.querySelector("#chat-submit");
const chatMessages = document.querySelector("#chat-messages");
const chatMessage = document.querySelector("#chat-message");
const escalation = document.querySelector("#escalation");
const ticketPanel = document.querySelector("#ticket-panel");
const conversation = [];

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatMessages.addEventListener("click", (event) => {
  const action = event.target.closest(".quick-action");
  if (!action) return;
  if (action.dataset.ticket === "true") {
    openTicketForm();
    return;
  }
  chatInput.value = action.dataset.prompt;
  chatInput.focus();
  if (action.dataset.autoSend === "true") chatForm.requestSubmit();
});

function openTicketForm() {
  form.elements.description.value = conversation
    .map((item) => `${item.role === "user" ? "User" : "Assistly"}: ${item.content}`)
    .join("\n\n");
  escalation.hidden = false;
  ticketPanel.hidden = false;
  ticketPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addQuickActions(suggestions) {
  const actions = document.createElement("div");
  actions.className = "quick-actions";
  actions.setAttribute("aria-label", "Suggested next steps");
  suggestions.forEach((prompt) => {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "quick-action";
    action.dataset.autoSend = String(prompt !== "Open a support ticket");
    action.dataset.ticket = String(prompt === "Open a support ticket");
    action.dataset.prompt = prompt;
    action.textContent = prompt;
    actions.appendChild(action);
  });
  chatMessages.appendChild(actions);
}

function addMessage(role, content) {
  const item = document.createElement("div");
  item.className = `message ${role}`;
  item.innerHTML = `<span class="message-label">${role === "user" ? "You" : "Assistly"}</span><p>${escapeHtml(content).replace(/\n/g, "<br>")}</p>`;
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content) return;
  chatInput.value = "";
  chatMessage.textContent = "";
  conversation.push({ role: "user", content });
  addMessage("user", content);
  chatSubmit.disabled = true;
  chatSubmit.innerHTML = "<span>...</span> Thinking";
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The assistant could not respond.");
    conversation.push({ role: "assistant", content: result.reply });
    addMessage("assistant", result.reply);
    addQuickActions(result.suggestions);
    if (result.needsHuman) {
      escalation.hidden = false;
      escalation.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } catch (error) {
    chatMessage.textContent = error.message;
  } finally {
    chatSubmit.disabled = false;
    chatSubmit.innerHTML = "<span>↑</span> Send";
    chatInput.focus();
  }
});

document.querySelector("#show-ticket-form").addEventListener("click", () => {
  openTicketForm();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  submitButton.disabled = true;
  submitButton.innerHTML = "<span>✦</span> Assessing severity...";
  try {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Ticket could not be created.");
    ticketPanel.innerHTML = `<div class="success"><span class="success-icon">✓</span><h2>Request sent to support</h2><p>Ticket <strong>${escapeHtml(result.id)}</strong> was assessed as <strong class="inline-severity ${escapeHtml(result.severity)}">${escapeHtml(result.severity)}</strong>. A human agent will follow up.</p></div>`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "<span>✦</span> Send to support";
  }
});
