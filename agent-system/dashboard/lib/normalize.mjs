// Pure reducer: Claude Code stream-json events -> dashboard state.
// Every function returns new objects; nothing is mutated in place.

export const MAX_ACTIVITY = 400;
const MAX_TEXT = 4000;
const SNIPPET = 160;
const SUPERVISOR = 'supervisor';

/** @returns {object} empty dashboard state */
export function initialState() {
  return {
    session: { id: null, model: null, status: 'idle', detail: '', startedAt: null, error: null },
    usage: { costUsd: 0, baseCostUsd: 0, turns: 0, rateLimit: null },
    messages: [],
    agents: {},
    activity: [],
    denials: [],
  };
}

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
  }[name];
  return clip(`${name}${pick ? ` · ${pick}` : ''}`);
}

const withActivity = (state, entry) => ({
  ...state,
  activity: [{ id: `${entry.at}-${state.activity.length}-${Math.random().toString(36).slice(2, 7)}`, ...entry }, ...state.activity]
    .slice(0, MAX_ACTIVITY),
});

const patchAgent = (state, id, patch) => {
  const current = state.agents[id] ?? {
    id, taskId: null, type: 'agent', description: '', prompt: '', status: 'running',
    background: false, startedAt: patch.startedAt ?? null, endedAt: null,
    lastTool: '', progress: '', tokens: 0, toolUses: 0, summary: '',
  };
  return { ...state, agents: { ...state.agents, [id]: { ...current, ...patch } } };
};

const agentIdForTask = (state, taskId) =>
  Object.values(state.agents).find((agent) => agent.taskId === taskId)?.id ?? null;

const agentLabel = (state, id) => (id === SUPERVISOR ? SUPERVISOR : state.agents[id]?.type ?? 'agent');

function addSupervisorText(state, messageId, text, at) {
  const last = state.messages.at(-1);
  if (last?.role === SUPERVISOR && last.messageId === messageId) {
    const merged = { ...last, text: `${last.text}\n\n${text}`.slice(-MAX_TEXT) };
    return { ...state, messages: [...state.messages.slice(0, -1), merged] };
  }
  const message = { id: `${messageId ?? 'm'}-${state.messages.length}`, messageId, role: SUPERVISOR, text: text.slice(-MAX_TEXT), at };
  return { ...state, messages: [...state.messages, message] };
}

function onAssistant(state, event, at) {
  const owner = event.parent_tool_use_id ?? SUPERVISOR;
  let next = state;
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
    next = withActivity(next, {
      at, agentId: owner, agent: agentLabel(next, owner),
      kind: isDispatch ? 'dispatch' : 'tool', text: describeTool(block.name, block.input),
    });
  }
  return next;
}

function onUser(state, event, at) {
  const owner = event.parent_tool_use_id ?? SUPERVISOR;
  let next = state;
  for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
    if (block.type !== 'tool_result') continue;
    const agent = next.agents[block.tool_use_id];
    const text = Array.isArray(block.content) ? block.content.map((part) => part.text ?? '').join(' ') : String(block.content ?? '');
    if (agent && !agent.background) {
      next = patchAgent(next, block.tool_use_id, {
        status: block.is_error ? 'failed' : 'completed',
        endedAt: agent.endedAt ?? at,
        summary: agent.summary || clip(text, 600),
      });
    }
    if (block.is_error) {
      const denied = /permission|denied|not allowed|blocked/i.test(text);
      next = withActivity(next, { at, agentId: owner, agent: agentLabel(next, owner), kind: denied ? 'denied' : 'error', text: clip(text) });
    }
  }
  return next;
}

function onTask(state, event, at) {
  const id = event.tool_use_id ?? agentIdForTask(state, event.task_id);
  if (!id) return state;
  const agent = state.agents[id];
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
      return patchAgent(state, id, {
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
        status, endedAt: agent?.endedAt ?? at, summary: clip(event.summary, 600),
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
    return { ...state, session: { ...state.session, id: event.session_id ?? state.session.id, model: event.model ?? state.session.model } };
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
  return {
    ...state,
    session: { ...state.session, status: 'running', error: null, startedAt: state.session.startedAt ?? at },
    messages: [...state.messages, { id: `u-${state.messages.length}-${Date.now()}`, role: 'user', text: text.slice(0, MAX_TEXT), at }],
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
