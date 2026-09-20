const loginPanel = document.querySelector("#admin-login");
const dashboard = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#admin-login-form");
const loginMessage = document.querySelector("#admin-login-message");
const ticketList = document.querySelector("#ticket-list");
const stats = document.querySelector("#admin-stats");
const adminPortal = document.querySelector("#admin-portal");
const helpdesk = document.querySelector("body > main.layout");
const portalButton = document.querySelector("#admin-portal-button");
const homeButton = document.querySelector("#home-button");

const escapeAdminHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));

function showTickets(tickets) {
  stats.innerHTML = ["Open", "In Progress", "Resolved"].map((status) =>
    `<div class="stat-card"><strong>${tickets.filter((ticket) => ticket.status === status).length}</strong><span>${status}</span></div>`
  ).join("");
  ticketList.innerHTML = tickets.length ? tickets.map((ticket) => `
    <article class="ticket-card">
      <div class="ticket-card-header"><div><span class="severity ${escapeAdminHtml(ticket.severity)}">${escapeAdminHtml(ticket.severity)}</span><h2>${escapeAdminHtml(ticket.title)}</h2></div><strong>${escapeAdminHtml(ticket.id)}</strong></div>
      <p class="ticket-meta">${escapeAdminHtml(ticket.requester)} · ${new Date(ticket.createdAt).toLocaleString()}</p>
      <p>${escapeAdminHtml(ticket.description).replace(/\n/g, "<br>")}</p>
      <p class="ticket-reason"><strong>AI triage:</strong> ${escapeAdminHtml(ticket.severityReason)}</p>
      <label class="status-control">Status<select data-ticket-id="${escapeAdminHtml(ticket.id)}"><option ${ticket.status === "Open" ? "selected" : ""}>Open</option><option ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option><option ${ticket.status === "Resolved" ? "selected" : ""}>Resolved</option></select></label>
    </article>
  `).join("") : '<p class="empty-state">No support tickets yet.</p>';
  ticketList.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", async () => {
      const response = await fetch(`/api/admin/tickets/${encodeURIComponent(select.dataset.ticketId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: select.value })
      });
      if (!response.ok) {
        loginMessage.textContent = "Could not update ticket status.";
        await loadTickets();
      }
    });
  });
}

async function loadTickets() {
  const response = await fetch("/api/admin/tickets");
  if (response.status === 401) {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    return;
  }
  showTickets(await response.json());
}

async function handleLogin(event) {
  event.preventDefault();
  loginMessage.textContent = "";
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(loginForm)))
  });
  if (!response.ok) {
    loginMessage.textContent = (await response.json()).error;
    return;
  }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await loadTickets();
}

async function handleLogout() {
  await fetch("/api/admin/logout", { method: "POST" });
  loginPanel.hidden = false;
  dashboard.hidden = true;
  loginForm.reset();
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
  document.querySelector("#refresh-tickets").addEventListener("click", loadTickets);
  document.querySelector("#admin-logout").addEventListener("click", handleLogout);
  loadTickets();
}

if (portalButton) {
  portalButton.addEventListener("click", () => {
    const showingAdmin = adminPortal.hidden;
    helpdesk.hidden = showingAdmin;
    adminPortal.hidden = !showingAdmin;
    portalButton.hidden = showingAdmin;
    homeButton.hidden = !showingAdmin;
    if (showingAdmin) loadTickets();
  });
}

if (homeButton) {
  homeButton.hidden = true;
  homeButton.addEventListener("click", () => {
    helpdesk.hidden = false;
    adminPortal.hidden = true;
    portalButton.hidden = false;
    homeButton.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
