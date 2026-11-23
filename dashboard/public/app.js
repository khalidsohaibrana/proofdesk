const $ = (id) => document.getElementById(id);
const node = (tag, className = "", content = "") => {
  const item = document.createElement(tag);
  item.className = className;
  item.textContent = content;
  return item;
};
const api = async (path, data) => {
  const response = await fetch(
    path,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {},
  );
  const value = await response.json();
  if (!response.ok)
    throw new Error(
      value.error || value.answer || `Request failed (${response.status})`,
    );
  return value;
};
const stages = [
  ["ready", "Ready"],
  ["building", "Building"],
  ["review", "Review"],
  ["qa", "QA"],
  ["mergeable", "Merge ready"],
  ["blocked", "Blocked"],
];
const labels = {
  ready: "Ready",
  building: "Building",
  review: "Review",
  reviewing: "Reviewing",
  changes: "Changes needed",
  qa: "QA ready",
  verifying: "Verifying",
  mergeable: "Merge ready",
  blocked: "Blocked",
  merged: "Merged",
};
let snapshot = { tickets: [], runs: [], messages: [], events: [] };
let openTicket = null;
let requestPending = false;
function toast(message) {
  const item = $("toast");
  item.textContent = message;
  item.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (item.style.display = "none"), 4500);
}
function time(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function action(title, callback, className = "") {
  const button = node("button", className, title);
  button.type = "button";
  button.onclick = async (event) => {
    event.stopPropagation();
    button.disabled = true;
    try {
      await callback();
      await refresh();
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  };
  return button;
}
function ticketActions(ticket) {
  const actions = [];
  if (["ready", "changes", "blocked"].includes(ticket.status))
    actions.push(
      action(
        ticket.status === "changes"
          ? "Send fixes to builder →"
          : "Dispatch builder →",
        () => api("/api/run", { ticketId: ticket.id, role: "builder" }),
      ),
    );
  if (ticket.status === "review" && ticket.reviewRounds < 3)
    actions.push(
      action("Start review →", () =>
        api("/api/run", { ticketId: ticket.id, role: "reviewer" }),
      ),
    );
  if (ticket.status === "qa")
    actions.push(
      action("Run QA →", () =>
        api("/api/run", { ticketId: ticket.id, role: "qa" }),
      ),
    );
  return actions;
}
function renderFleet() {
  const running = snapshot.runs.filter((run) => run.status === "running");
  const fleet = $("agent-list");
  fleet.replaceChildren();
  const agents = [
    {
      role: "supervisor",
      name: "Supervisor",
      symbol: "S",
      run: snapshot.supervisorBusy
        ? { status: "running", ticketId: null }
        : null,
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      role: "builder",
      name: `Builder ${String(index + 1).padStart(2, "0")}`,
      symbol: "B",
      run: running.filter((run) => run.role === "builder")[index],
    })),
    {
      role: "reviewer",
      name: "Reviewer",
      symbol: "R",
      run: running.find((run) => run.role === "reviewer"),
    },
    {
      role: "qa",
      name: "QA",
      symbol: "Q",
      run: running.find((run) => run.role === "qa"),
    },
  ];
  for (const agent of agents) {
    const card = node("div", `agent-card ${agent.run ? "" : "idle"}`);
    const top = node("div", "agent-top");
    top.append(
      node("div", "agent-icon", agent.symbol),
      node(
        "span",
        agent.run ? "live" : "idle-status",
        agent.run ? "● ACTIVE" : "○ IDLE",
      ),
    );
    card.append(top, node("div", "agent-role", agent.name));
    const ticket = snapshot.tickets.find(
      (item) => item.id === agent.run?.ticketId,
    );
    card.append(
      node(
        "div",
        "agent-task",
        ticket?.title ||
          (agent.run ? "Responding to you" : "Awaiting assignment"),
      ),
    );
    if (agent.run?.id)
      card.append(
        action("View run ↗", () => {
          openDetail(agent.run.ticketId);
        }),
      );
    fleet.append(card);
  }
  $("agent-meta").textContent =
    `${running.length + Number(snapshot.supervisorBusy)} running`;
}
function renderTickets() {
  const pipeline = $("pipeline");
  pipeline.replaceChildren();
  const counts = {
    ready: snapshot.tickets.filter((t) => t.status === "ready").length,
    building: snapshot.tickets.filter((t) => t.status === "building").length,
    review: snapshot.tickets.filter((t) =>
      ["review", "reviewing", "changes"].includes(t.status),
    ).length,
    qa: snapshot.tickets.filter((t) => ["qa", "verifying"].includes(t.status))
      .length,
    mergeable: snapshot.tickets.filter((t) => t.status === "mergeable").length,
    blocked: snapshot.tickets.filter((t) => t.status === "blocked").length,
  };
  for (const [key, label] of stages) {
    const stage = node("div", "stage");
    stage.append(node("strong", "", counts[key]), node("span", "", label));
    pipeline.append(stage);
  }
  $("active-count").textContent = snapshot.runs.filter(
    (r) => r.role === "builder" && r.status === "running",
  ).length;
  $("ready-count").textContent = counts.ready;
  $("checking-count").textContent = counts.review + counts.qa;
  $("merge-count").textContent = counts.mergeable;
  const list = $("ticket-list");
  list.replaceChildren();
  if (!snapshot.tickets.length)
    list.append(
      node(
        "div",
        "empty",
        "No tickets yet. Create a ticket to start the workflow.",
      ),
    );
  for (const ticket of snapshot.tickets) {
    const item = node("div", "ticket");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.onclick = () => openDetail(ticket.id);
    item.onkeydown = (event) => {
      if (event.key === "Enter") openDetail(ticket.id);
    };
    const head = node("div", "ticket-head");
    const name = node("div");
    name.append(
      node(
        "span",
        "ticket-id",
        `#${ticket.id} · ${ticket.reviewRounds || 0}/3 review rounds`,
      ),
      node("h3", "", ticket.title),
    );
    head.append(
      name,
      node(
        "span",
        `pill ${ticket.status}`,
        labels[ticket.status] || ticket.status,
      ),
    );
    item.append(head, node("p", "", ticket.description));
    const actions = ticketActions(ticket);
    if (actions.length) {
      const row = node("div", "ticket-actions");
      row.append(...actions);
      item.append(row);
    }
    list.append(item);
  }
}
function renderMessages() {
  const messages = $("messages");
  const nearBottom =
    messages.scrollTop + messages.clientHeight >= messages.scrollHeight - 40;
  messages.replaceChildren();
  if (!snapshot.messages.length)
    messages.append(
      node(
        "div",
        "empty",
        "Ask for a plan, ticket breakdown, or help with a blocker.",
      ),
    );
  for (const message of snapshot.messages) {
    const item = node("div", `message ${message.role}`);
    item.append(
      node("small", "", message.role),
      document.createTextNode(message.content),
    );
    messages.append(item);
  }
  if (snapshot.supervisorBusy)
    messages.append(
      node("div", "message supervisor", "Supervisor is responding…"),
    );
  if (nearBottom) messages.scrollTop = messages.scrollHeight;
}
function renderEvents() {
  const list = $("events");
  list.replaceChildren();
  if (!snapshot.events?.length)
    list.append(node("div", "empty", "Agent and ticket events appear here."));
  for (const entry of (snapshot.events || []).slice(0, 25)) {
    const item = node("div", "event");
    const content = node("div", "", entry.message);
    content.append(node("small", "", time(entry.at)));
    item.append(content);
    list.append(item);
  }
}
function openDetail(id) {
  const ticket = snapshot.tickets.find((item) => item.id === id);
  if (!ticket) return;
  openTicket = id;
  $("detail-id").textContent =
    `TICKET #${ticket.id} / ${labels[ticket.status] || ticket.status}`;
  $("detail-title").textContent = ticket.title;
  const body = $("detail-body");
  body.replaceChildren();
  body.append(node("div", "detail-description", ticket.description));
  const grid = node("div", "detail-grid");
  for (const [label, value] of [
    ["BRANCH", ticket.branch || "Not assigned"],
    ["REVIEW ROUNDS", `${ticket.reviewRounds || 0} of 3`],
    ["PR", ticket.prUrl || "Missing"],
    ["RECORDING", ticket.recording || "Missing"],
  ]) {
    const field = node("div", "detail-field");
    field.append(node("small", "", label), document.createTextNode(value));
    grid.append(field);
  }
  body.append(grid);
  const actions = node("div", "detail-actions");
  actions.append(...ticketActions(ticket));
  body.append(actions);
  if (ticket.status === "mergeable")
    body.append(
      node(
        "p",
        "notice",
        "QA reported a pass. Confirm the PR checks, recording, and required approvals before merging in GitHub.",
      ),
    );
  const form = node("form", "evidence-form");
  const prLabel = node("label", "", "Pull request URL");
  const pr = node("input");
  pr.placeholder = "https://github.com/owner/repo/pull/1";
  pr.value = ticket.prUrl || "";
  const recordingLabel = node("label", "", "Feature recording path or URL");
  const recording = node("input");
  recording.placeholder = "Path or link to a recorded feature run";
  recording.value = ticket.recording || "";
  const save = node("button", "primary", "Save evidence");
  save.type = "submit";
  form.append(prLabel, pr, recordingLabel, recording, save);
  form.onsubmit = async (event) => {
    event.preventDefault();
    save.disabled = true;
    try {
      await api("/api/evidence", {
        ticketId: id,
        prUrl: pr.value,
        recording: recording.value,
      });
      await refresh();
      toast("Evidence saved");
    } catch (error) {
      toast(error.message);
    } finally {
      save.disabled = false;
    }
  };
  body.append(form);
  const runs = snapshot.runs.filter((run) => run.ticketId === id);
  if (runs.length) {
    body.append(node("div", "section-kicker", "AGENT RUNS"));
    for (const run of runs) {
      const section = node("details");
      const summary = node(
        "summary",
        "",
        `${run.role.toUpperCase()} · ${run.status} · ${time(run.startedAt)}`,
      );
      section.append(summary);
      section.append(
        node(
          "pre",
          "detail-output",
          run.answer || run.output || "Agent working…",
        ),
      );
      if (run.status === "running")
        section.append(
          action("Stop run", () => api("/api/stop", { runId: run.id })),
        );
      body.append(section);
    }
  }
  if (!$("detail-dialog").open) $("detail-dialog").showModal();
}
async function refresh() {
  if (requestPending) return;
  requestPending = true;
  try {
    snapshot = await api("/api/state");
    renderFleet();
    renderTickets();
    renderMessages();
    renderEvents();
    if (
      openTicket &&
      $("detail-dialog").open &&
      !$("detail-dialog").contains(document.activeElement)
    )
      openDetail(openTicket);
  } catch (error) {
    toast(error.message);
  } finally {
    requestPending = false;
  }
}
$("clock").textContent = new Date().toLocaleString([], {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
setInterval(
  () =>
    ($("clock").textContent = new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })),
  60_000,
);
for (const id of ["new-ticket", "add-ticket"])
  $(id).onclick = () => $("ticket-dialog").showModal();
$("close-dialog").onclick = () => $("ticket-dialog").close();
$("close-detail").onclick = () => {
  $("detail-dialog").close();
  openTicket = null;
};
$("ticket-form").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("[type=submit]");
  button.disabled = true;
  try {
    await api("/api/tickets", {
      title: $("ticket-title").value,
      description: $("ticket-description").value,
    });
    $("ticket-form").reset();
    $("ticket-dialog").close();
    await refresh();
    toast("Ticket added to queue");
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
};
$("chat-form").onsubmit = async (event) => {
  event.preventDefault();
  const message = $("chat-input").value.trim();
  if (!message) return;
  $("chat-input").value = "";
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  button.textContent = "Working…";
  api("/api/supervisor", { message })
    .then(refresh)
    .catch((error) => {
      toast(error.message);
      refresh();
    })
    .finally(() => {
      button.disabled = false;
      button.textContent = "Send ↗";
    });
  await new Promise((resolve) => setTimeout(resolve, 200));
  await refresh();
};
refresh();
setInterval(refresh, 1500);
