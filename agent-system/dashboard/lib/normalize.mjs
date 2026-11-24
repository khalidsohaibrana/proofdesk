// Pure reducer: Claude Code stream-json events -> dashboard state.
// Every function returns new objects; nothing is mutated in place.

export const MAX_ACTIVITY = 400;
const MAX_TEXT = 4000;
const SNIPPET = 160;
const SUPERVISOR = 'supervisor';
const ASYNC_LAUNCH = /^async agent launched/i;

/** @returns {object} empty dashboard state */
export function initialState() {
  return {
    session: { id: null, model: null, status: 'idle', detail: '', startedAt: null, error: null },
    usage: { costUsd: 0, baseCostUsd: 0, turns: 0, rateLimit: null, contextTokens: 0, rotations: 0 },
    messages: [],
    agents: {},
    activity: [],
    denials: [],
    aliases: {},
    seq: 0,
  };
}

// Monotonic order across messages, agents and activity, so the chat can interleave them.
const bump = (state) => ({ ...state, seq: (state.seq ?? 0) + 1 });

const keep = (text, size = MAX_TEXT) => String(text ?? '').trim().slice(0, size);
const clip = (text, size = SNIPPET) => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > size ? `${flat.slice(0, size - 1)}…` : flat;
};

/** Short human description of a tool call. */
export function describeTool(name, input = {}) {
  const pick = {
    Read: input.file_path, Write: input.file_path, Edit: input.file_path, MultiEdit: input.file_path,
    Bash: input.command, Grep: input.pattern, Glob: input.pattern,
    Agent: `${input.subagent_type ?? 'agent'}: ${input.description ?? ''}`,
    Task: `${input.subagent_type ?? 'agent'}: ${input.description ?? ''}`,
    WebFetch: input.url, WebSearch: input.query, TodoWrite: 'update task list',
    SendMessage: input.summary ?? input.message,
  }[name];
  return clip(`${name}${pick ? ` · ${pick}` : ''}`);
}

const withActivity = (state, entry) => {
  const next = bump(state);
  return {
    ...next,
    activity: [{ id: `a${next.seq}`, seq: next.seq, ...entry }, ...state.activity].slice(0, MAX_ACTIVITY),
  };
};

const patchAgent = (state, id, patch) => {
  const isNew = !state.agents[id];
  const base = isNew ? bump(state) : state;
  const current = state.agents[id] ?? {
    id, seq: base.seq, taskId: null, type: 'agent', description: '', prompt: '', status: 'running',
    background: false, startedAt: patch.startedAt ?? null, endedAt: null,
    lastTool: '', progress: '', tokens: 0, toolUses: 0, summary: '',
  };
  return { ...base, agents: { ...state.agents, [id]: { ...current, ...patch } } };
};

const agentIdForTask = (state, taskId) =>
  Object.values(state.agents).find((agent) => agent.taskId === taskId)?.id ?? null;

// A resumed agent (SendMessage) reports under a new tool_use_id; aliases map it back to the original agent.
const resolveId = (state, id) => (id ? state.aliases?.[id] ?? id : id);

const agentLabel = (state, id) => (id === SUPERVISOR ? SUPERVISOR : state.agents[id]?.type ?? 'agent');

function addSupervisorText(state, messageId, text, at) {
  const last = state.messages.at(-1);
  if (last?.role === SUPERVISOR && last.messageId === messageId && last.seq === state.seq) {
    const merged = { ...last, text: `${last.text}\n\n${text}`.slice(-MAX_TEXT) };
    return { ...state, messages: [...state.messages.slice(0, -1), merged] };
  }
  const next = bump(state);
  const message = { id: `m${next.seq}`, seq: next.seq, messageId, role: SUPERVISOR, text: text.slice(-MAX_TEXT), at };
  return { ...next, messages: [...state.messages, message] };
}

/** Size of the context a main-thread message was sent with. Subagent messages have their own context. */
export function contextTokensOf(event) {
  const usage = event.message?.usage;
  if (event.parent_tool_use_id || !usage) return null;
  return (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
}

function onAssistant(state, event, at) {
  const owner = resolveId(state, event.parent_tool_use_id) ?? SUPERVISOR;
  const tokens = contextTokensOf(event);
  let next = tokens === null ? state : { ...state, usage: { ...state.usage, contextTokens: tokens } };
  for (const block of event.message?.content ?? []) {
    if (block.type === 'text' && block.text?.trim()) {
      next = owner === SUPERVISOR
        ? addSupervisorText(next, event.message?.id, block.text.trim(), at)
        : withActivity(next, { at, agentId: owner, agent: agentLabel(next, owner), kind: 'say', text: clip(block.text) });
    }
    if (block.type !== 'tool_use') continue;
    const isDispatch = block.name === 'Agent' || block.name === 'Task';
    if (isDispatch) {
      next = patchAgent(next, block.id, {
        type: block.input?.subagent_type ?? 'general-purpose',
        description: block.input?.description ?? '',
        prompt: String(block.input?.prompt ?? '').slice(0, MAX_TEXT),
        background: Boolean(block.input?.run_in_background),
        parentId: owner,
        startedAt: next.agents[block.id]?.startedAt ?? at,
      });
    }
    if (owner !== SUPERVISOR && next.agents[owner]) {
      const agent = next.agents[owner];
      next = patchAgent(next, owner, { lastTool: describeTool(block.name, block.input), toolUses: agent.toolUses + 1 });
    }
    const isFollowup = block.name === 'SendMessage' && owner === SUPERVISOR;
    next = withActivity(next, {
      at, agentId: owner, agent: agentLabel(next, owner),
      kind: isDispatch ? 'dispatch' : isFollowup ? 'followup' : 'tool', text: describeTool(block.name, block.input),
      ...(isFollowup ? { targetAgentId: agentIdForTask(next, block.input?.to) } : {}),
    });
  }
  return next;
}

function onUser(state, event, at) {
  const owner = resolveId(state, event.parent_tool_use_id) ?? SUPERVISOR;
  let next = state;
  for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
    if (block.type !== 'tool_result') continue;
    const agent = next.agents[block.tool_use_id];
    const text = Array.isArray(block.content) ? block.content.map((part) => part.text ?? '').join(' ') : String(block.content ?? '');
    // The CLI may run an agent asynchronously even when the dispatch didn't ask for it; its tool_result
    // then only says it launched. That is a start, not a result: keep it running until task_notification.
    if (agent && !block.is_error && ASYNC_LAUNCH.test(text.trim())) {
      next = patchAgent(next, block.tool_use_id, { background: true, status: 'running', endedAt: null });
      continue;
    }
    // A refused dispatch (e.g. blocked by the concurrency cap) fails even if it was meant for the background.
    if (agent && (!agent.background || block.is_error)) {
      next = patchAgent(next, block.tool_use_id, {
        status: block.is_error ? 'failed' : 'completed',
        endedAt: agent.endedAt ?? at,
        summary: agent.summary || keep(text),
      });
    }
    if (block.is_error) {
      const denied = /permission|denied|not allowed|blocked/i.test(text);
      next = withActivity(next, { at, agentId: owner, agent: agentLabel(next, owner), kind: denied ? 'denied' : 'error', text: clip(text) });
    }
  }
  return next;
}

/** Which agent a task event belongs to; null for non-agent tasks (e.g. background shell commands). */
function taskOwner(state, event) {
  const byToolUse = resolveId(state, event.tool_use_id);
  if (byToolUse && state.agents[byToolUse]) return { id: byToolUse, aliasFrom: null };
  const byTask = agentIdForTask(state, event.task_id);
  if (byTask) return { id: byTask, aliasFrom: event.tool_use_id && event.tool_use_id !== byTask ? event.tool_use_id : null };
  const isAgent = event.task_type === 'local_agent' || Boolean(event.subagent_type);
  return isAgent && event.subtype === 'task_started' && event.tool_use_id ? { id: event.tool_use_id, aliasFrom: null } : null;
}

function resumeAgent(state, id, event, at) {
  const agent = state.agents[id];
  const round = (agent.rounds ?? 1) + 1;
  const resumed = patchAgent(state, id, { status: 'running', endedAt: null, progress: '', rounds: round, taskId: event.task_id });
  return withActivity(resumed, { at, agentId: id, agent: agent.type, kind: 'start', text: `Back on it (round ${round})` });
}

function onTask(state, event, at) {
  const owner = taskOwner(state, event);
  if (!owner) return state;
  const { id } = owner;
  const withAlias = owner.aliasFrom ? { ...state, aliases: { ...state.aliases, [owner.aliasFrom]: id } } : state;
  const agent = withAlias.agents[id];
  if (event.subtype === 'task_started' && agent && agent.taskId === event.task_id && agent.status !== 'running') {
    return resumeAgent(withAlias, id, event, at);
  }
  state = withAlias;
  switch (event.subtype) {
    case 'task_started':
      return withActivity(patchAgent(state, id, {
        taskId: event.task_id,
        type: event.subagent_type ?? agent?.type ?? 'agent',
        description: event.description ?? agent?.description ?? '',
        prompt: agent?.prompt || String(event.prompt ?? '').slice(0, MAX_TEXT),
        status: 'running', startedAt: agent?.startedAt ?? at,
      }), { at, agentId: id, agent: event.subagent_type ?? 'agent', kind: 'start', text: clip(event.description) });
    case 'task_progress':
      // Progress means the agent is still working, whatever an earlier event implied.
      return patchAgent(state, id, {
        ...(agent && !agent.notified ? { status: 'running', endedAt: null } : {}),
        taskId: event.task_id, progress: clip(event.description),
        lastTool: event.last_tool_name ?? agent?.lastTool ?? '',
        tokens: event.usage?.total_tokens ?? agent?.tokens ?? 0,
        toolUses: event.usage?.tool_uses ?? agent?.toolUses ?? 0,
      });
    case 'task_updated':
      return event.patch?.status
        ? patchAgent(state, id, { status: event.patch.status, endedAt: event.patch.end_time ? new Date(event.patch.end_time).toISOString() : agent?.endedAt ?? null })
        : state;
    case 'task_notification': {
      const status = event.status === 'completed' ? 'completed' : event.status ?? 'completed';
      const done = patchAgent(state, id, {
        status, notified: true, endedAt: agent?.endedAt ?? at, summary: keep(event.summary) || agent?.summary || '',
        tokens: event.usage?.total_tokens ?? agent?.tokens ?? 0,
        toolUses: event.usage?.tool_uses ?? agent?.toolUses ?? 0,
      });
      return withActivity(done, { at, agentId: id, agent: agentLabel(done, id), kind: status === 'completed' ? 'done' : 'error', text: clip(event.summary || status) });
    }
    default:
      return state;
  }
}

function onResult(state, event, at) {
  const costUsd = state.usage.baseCostUsd + (event.total_cost_usd ?? 0);
  const denials = (event.permission_denials ?? []).map((item) => ({ at, tool: item.tool_name, input: clip(JSON.stringify(item.tool_input ?? {})) }));
  const next = {
    ...state,
    session: { ...state.session, status: event.is_error ? 'error' : 'idle', error: event.is_error ? clip(event.result, 400) : null },
    usage: { ...state.usage, costUsd, turns: state.usage.turns + 1 },
    denials: [...denials, ...state.denials].slice(0, 50),
  };
  return event.is_error
    ? withActivity(next, { at, agentId: SUPERVISOR, agent: SUPERVISOR, kind: 'error', text: clip(event.result) })
    : next;
}

/**
 * Apply one raw stream-json event.
 * @param {ReturnType<typeof initialState>} state
 * @param {Record<string, any>} event
 * @param {string} [at] ISO timestamp
 */
export function reduce(state, event, at = new Date().toISOString()) {
  if (!event || typeof event !== 'object') return state;
  if (event.type === 'assistant') return onAssistant(state, event, at);
  if (event.type === 'user') return onUser(state, event, at);
  if (event.type === 'result') return onResult(state, event, at);
  if (event.type === 'rate_limit_event') return { ...state, usage: { ...state.usage, rateLimit: event.rate_limit_info ?? null } };
  if (event.type !== 'system') return state;
  if (event.subtype === 'init') {
    return {
      ...state,
      session: {
        ...state.session,
        id: event.session_id ?? state.session.id,
        model: event.model ?? state.session.model,
        apiKeySource: event.apiKeySource ?? state.session.apiKeySource ?? null,
      },
    };
  }
  if (event.subtype?.startsWith('task_')) return onTask(state, event, at);
  if (event.subtype === 'post_turn_summary') return { ...state, session: { ...state.session, detail: clip(event.status_detail, 240) } };
  if (event.subtype === 'hook_response' && event.exit_code === 2) {
    return withActivity(state, { at, agentId: SUPERVISOR, agent: 'guard', kind: 'denied', text: clip(event.stderr || event.stdout || event.hook_name) });
  }
  return state;
}

/** Record a message the human sent. */
export function addUserMessage(state, text, at = new Date().toISOString()) {
  const next = bump(state);
  return {
    ...next,
    session: { ...state.session, status: 'running', error: null, startedAt: state.session.startedAt ?? at },
    messages: [...state.messages, { id: `u${next.seq}`, seq: next.seq, role: 'user', text: text.slice(0, MAX_TEXT), at }],
  };
}

/** Mark every running agent as stopped (process ended or was stopped). */
export function stopAll(state, reason, at = new Date().toISOString()) {
  const agents = Object.fromEntries(Object.entries(state.agents).map(([id, agent]) => [
    id, agent.status === 'running' ? { ...agent, status: 'stopped', endedAt: at } : agent,
  ]));
  return withActivity({
    ...state,
    agents,
    session: { ...state.session, status: 'idle' },
    usage: { ...state.usage, baseCostUsd: state.usage.costUsd },
  }, { at, agentId: SUPERVISOR, agent: SUPERVISOR, kind: 'error', text: reason });
}

/** Sage is saving a checkpoint: show it as working. */
export function beginCheckpoint(state) {
  return { ...state, session: { ...state.session, status: 'running', error: null } };
}

/** The checkpoint could not be saved: keep the session and tell the human. */
export function failCheckpoint(state, message, at = new Date().toISOString()) {
  return withActivity({ ...state, session: { ...state.session, status: 'idle', error: message } },
    { at, agentId: SUPERVISOR, agent: SUPERVISOR, kind: 'error', text: clip(message) });
}

/** A rotation finished: the next message starts a fresh session. Cost carries over, context restarts. */
export function rotateSession(state, at = new Date().toISOString()) {
  const tokens = state.usage.contextTokens;
  return withActivity({
    ...state,
    session: { ...state.session, id: null, status: 'idle', error: null, detail: '' },
    usage: { ...state.usage, baseCostUsd: state.usage.costUsd, contextTokens: 0, rotations: (state.usage.rotations ?? 0) + 1 },
  }, { at, agentId: SUPERVISOR, agent: SUPERVISOR, kind: 'done', text: `Fresh session (context was ${tokens} tokens)` });
}
