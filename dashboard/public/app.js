const $ = id => document.getElementById(id);
const text = value => document.createTextNode(value);
const api = async (path, data) => {
  const response = await fetch(path, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || result.answer || 'Request failed');
  return result;
};
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.append(text(content));
  return node;
}
async function refresh() {
  const state = await api('/api/state');
  $('ready-count').textContent = state.tickets.filter(t => t.status === 'ready').length;
  $('running-count').textContent = `${state.runs.filter(r => r.status === 'running').length} / 5`;
  $('review-count').textContent = state.tickets.filter(t => t.status === 'review').length;
  $('blocked-count').textContent = state.tickets.filter(t => t.status === 'blocked').length;
  const messages = $('messages'); messages.replaceChildren();
  for (const message of state.messages) {
    const item = element('div', `message ${message.role}`);
    item.append(element('small', '', message.role), text(message.content));
    messages.append(item);
  }
  if (!state.messages.length) messages.append(element('div', 'empty', 'Ask the supervisor about the plan, decisions, or the next ticket.'));
  messages.scrollTop = messages.scrollHeight;
  const tickets = $('ticket-list'); tickets.replaceChildren();
  for (const ticket of state.tickets) {
    const item = element('div', 'ticket'); const top = element('div', 'ticket-top');
    top.append(element('h3', '', ticket.title), element('span', `status ${ticket.status}`, ticket.status));
    item.append(top, element('p', '', ticket.description));
    if (ticket.status === 'ready') {
      const button = element('button', '', 'Dispatch builder →');
      button.onclick = async () => { button.disabled = true; try { await api('/api/dispatch', { ticketId: ticket.id }); await refresh(); } catch (error) { alert(error.message); button.disabled = false; } };
      item.append(button);
    }
    tickets.append(item);
  }
  if (!state.tickets.length) tickets.append(element('div', 'empty', 'Add a ticket to begin.'));
  const runs = $('runs'); runs.replaceChildren();
  for (const run of state.runs) {
    const item = element('div', 'run'); const head = element('div', 'run-head');
    head.append(element('strong', '', `Ticket ${run.ticketId}`), element('span', `status ${run.status}`, run.status));
    item.append(head, element('code', '', run.branch));
    if (run.output) item.append(element('pre', '', run.output));
    runs.append(item);
  }
  if (!state.runs.length) runs.append(element('div', 'empty', 'Builder runs will appear here.'));
}
$('today').textContent = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
$('ticket-form').onsubmit = async event => { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true; try { await api('/api/tickets', { title: $('ticket-title').value, description: $('ticket-description').value }); form.reset(); await refresh(); } catch (error) { alert(error.message); } finally { button.disabled = false; } };
$('chat-form').onsubmit = async event => { event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; button.textContent = 'Supervisor thinking…'; try { await api('/api/supervisor', { message: $('chat-input').value }); $('chat-input').value = ''; await refresh(); } catch (error) { alert(error.message); await refresh(); } finally { button.disabled = false; button.textContent = 'Send message →'; } };
refresh(); setInterval(refresh, 5000);
