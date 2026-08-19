window.__ModuleLoader__.load({
  id: "quick-model-widget",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    const React = react;
    const MODEL_SLOT = "conversation.input.right";
    const PLUGIN_ID = "quick-model-widget";
    const RECENT_SELECTIONS_KEY = "dsh.modelSelection.recents.v1";
    
    function getStorage() {
      try {
        return globalThis.localStorage;
      } catch {
        return undefined;
      }
    }
    
    function readRecentSelections() {
      const storage = getStorage();
      if (storage === undefined) return [];
      try {
        const value = JSON.parse(storage.getItem(RECENT_SELECTIONS_KEY) ?? "[]");
        if (!Array.isArray(value)) return [];
        return value.filter((entry) => (
          entry !== null &&
          typeof entry === "object" &&
          typeof entry.provider === "string" &&
          typeof entry.model === "string"
        )).slice(0, 3);
      } catch {
        return [];
      }
    }
    
    function selectionKey(selection) {
      return `${selection.provider}\\u0000${selection.model}\\u0000${selection.reasoningEffort ?? ""}`;
    }
    
    function rememberSelection(entry) {
      const existing = readRecentSelections();
      const index = existing.findIndex((item) => selectionKey(item) === selectionKey(entry));
      const next = index >= 0
        ? existing.map((item, itemIndex) => itemIndex === index ? { ...item, ...entry } : item)
        : [...existing, entry].slice(-3);
      const storage = getStorage();
      try {
        storage?.setItem(RECENT_SELECTIONS_KEY, JSON.stringify(next));
      } catch {
        // Storage can be disabled without affecting model switching.
      }
      return next;
    }
    
    const CSS = `
    .quick-model-widget-rail {
      display: flex;
      align-items: center;
      gap: 2px;
      max-width: min(280px, 40vw);
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
    }
    .quick-model-widget-rail::-webkit-scrollbar { display: none; }
    .quick-model-widget-button {
      height: 24px;
      max-width: 92px;
      color: var(--dsw-alias-label-caption);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 7px;
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 0 6px;
      cursor: pointer;
      font: inherit;
      font-size: 11px;
      line-height: 16px;
      white-space: nowrap;
      transition: background .14s ease, color .14s ease, border-color .14s ease;
    }
    .quick-model-widget-button:hover:not(:disabled) {
      color: var(--dsw-alias-label-secondary);
      background: var(--dsw-alias-interactive-bg-hover);
    }
    .quick-model-widget-button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--dsw-alias-border-l3);
    }
    .quick-model-widget-button:disabled { cursor: default; opacity: .55; }
    .quick-model-widget-button.is-active {
      color: var(--dsw-alias-label-primary);
      background: var(--dsw-alias-bg-module-platform);
      border-color: var(--dsw-alias-border-l3);
    }
    .quick-model-widget-model {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .quick-model-widget-effort {
      color: var(--dsw-alias-label-caption);
      font-size: 10px;
      flex: none;
    }
    @media (max-width: 720px) {
      .quick-model-widget-rail { max-width: 132px; }
      .quick-model-widget-button { max-width: 72px; padding-inline: 5px; }
    }
    `;
    
    function emptyState() {
      return {
        current: null,
        routable: null,
        groups: [],
        failures: [],
        status: "idle",
        error: null,
      };
    }
    
    function createModelStore(connection, sessionId, available) {
      let snapshot = emptyState();
      let disposed = false;
      let generation = 0;
      let selectionTail = Promise.resolve();
      const listeners = new Set();
    
      const publish = (next) => {
        if (disposed) return;
        snapshot = { ...snapshot, ...next };
        for (const listener of listeners) listener();
      };
    
      const load = async () => {
        if (!available || disposed) return snapshot;
        const requestGeneration = ++generation;
        publish({ status: "loading", error: null });
        try {
          const response = await connection.api.sessions.models({ sessionId });
          if (disposed || requestGeneration !== generation) return snapshot;
          if (!response.result.ok) {
            throw new Error(response.result.error.message);
          }
          publish({ ...response.result.value, status: "ready", error: null });
        } catch (error) {
          if (!disposed && requestGeneration === generation) {
            publish({ status: "error", error: error instanceof Error ? error.message : String(error) });
          }
        }
        return snapshot;
      };
    
      const select = (selection) => {
        const operation = selectionTail.then(async () => {
          if (!available || disposed) return false;
          publish({ status: "selecting", error: null });
          try {
            const response = await connection.api.sessions.selectModel({
              sessionId,
              provider: selection.provider,
              model: selection.model,
              ...(selection.reasoningEffort === undefined
                ? {}
                : { reasoningEffort: selection.reasoningEffort }),
            });
            if (!response.result.ok) {
              publish({ status: "error", error: response.result.error.message });
              return false;
            }
            publish({
              current: response.result.value.selected,
              routable: true,
              status: "ready",
              error: null,
            });
            return true;
          } catch (error) {
            publish({ status: "error", error: error instanceof Error ? error.message : String(error) });
            return false;
          }
        });
        selectionTail = operation.catch(() => false);
        return operation;
      };
    
      return {
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        getSnapshot() {
          return snapshot;
        },
        load,
        select,
        dispose() {
          disposed = true;
          listeners.clear();
        },
      };
    }
    
    function modelChoices(state) {
      return state.groups.flatMap((group) => group.models.map((model) => ({ group, model })));
    }
    
    function currentChoiceOf(state, choices) {
      if (state.current === null) return undefined;
      return choices.find((choice) => (
        choice.group.id === state.current.provider &&
        choice.model.id === state.current.model
      ));
    }
    
    function effortNameOf(reasoning, effort) {
      if (reasoning === undefined) return undefined;
      if (effort === undefined) return "Default";
      return reasoning.efforts.find((level) => level.id === effort)?.name ?? effort;
    }
    
    function QuickModelWidget({ session, available, store, timer }) {
      const state = React.useSyncExternalStore(
        (listener) => store.subscribe(listener),
        () => store.getSnapshot(),
        () => store.getSnapshot(),
      );
      const [recents, setRecents] = React.useState(() => readRecentSelections());
      const choices = React.useMemo(() => modelChoices(state), [state.groups]);
      const currentChoice = currentChoiceOf(state, choices);
      const reasoning = currentChoice?.model.reasoning;
      const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
      const effortName = effortNameOf(reasoning, effectiveEffort);
      const busy = state.status === "selecting";
      const locked = session?.removed === true;
    
      React.useEffect(() => {
        if (!available) return undefined;
        store.load();
        return timer.interval(() => store.load(), 4000);
      }, [available, store, timer]);
    
      React.useEffect(() => {
        if (state.current === null) return;
        setRecents(rememberSelection({
          provider: state.current.provider,
          model: state.current.model,
          ...(state.current.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: state.current.reasoningEffort }),
          modelName: currentChoice?.model.name ?? state.current.model,
          ...(effortName === undefined ? {} : { effortName }),
        }));
      }, [
        state.current?.provider,
        state.current?.model,
        state.current?.reasoningEffort,
        currentChoice?.model.name,
        effortName,
      ]);
    
      if (!available || recents.length === 0) return null;
    
      const chooseRecent = (entry) => {
        if (state.current !== null && selectionKey(state.current) === selectionKey(entry)) return;
        store.select({
          provider: entry.provider,
          model: entry.model,
          ...(entry.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: entry.reasoningEffort }),
        });
      };
    
      return React.createElement(
        "div",
        {
          className: "quick-model-widget-rail",
          role: "group",
          "aria-label": "Recent model and reasoning selections",
        },
        recents.map((entry) => {
          const active = state.current !== null && selectionKey(state.current) === selectionKey(entry);
          const model = entry.modelName ?? entry.model;
          const effort = entry.effortName ?? entry.reasoningEffort;
          const label = effort === undefined ? model : `${model} · ${effort}`;
    
          return React.createElement(
            "button",
            {
              key: selectionKey(entry),
              type: "button",
              className: `quick-model-widget-button${active ? " is-active" : ""}`,
              "aria-pressed": active,
              "aria-label": label,
              title: label,
              disabled: locked || busy || active,
              onClick: () => chooseRecent(entry),
            },
            React.createElement("span", { className: "quick-model-widget-model" }, model),
            effort !== undefined && React.createElement("span", { className: "quick-model-widget-effort" }, effort),
          );
        }),
      );
    }
    
    const inject = ["connection", "sessions", "slots", "timer"];
    
    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement("style");
        style.dataset.plugin = PLUGIN_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, `${PLUGIN_ID}: styles`);
    
      const stores = new Map();
      const sessions = ctx.sessions;
      const connection = ctx.connection;
      const getStore = (sessionId, available) => {
        const existing = stores.get(sessionId);
        if (existing !== undefined) return existing;
        const store = createModelStore(connection, sessionId, available);
        stores.set(sessionId, store);
        const sessionScope = sessions.scope(sessionId);
        sessionScope?.effect(() => () => {
          store.dispose();
          stores.delete(sessionId);
        }, `${PLUGIN_ID}: session store`);
        return store;
      };
    
      ctx.slots.inject(MODEL_SLOT, () => ctx.slots.register({
        name: MODEL_SLOT,
        id: PLUGIN_ID,
        order: 10,
        inject: (sessionId) => {
          const available = typeof sessions.subagentAddress !== "function"
            || sessions.subagentAddress(sessionId) === undefined;
          return {
            available,
            store: getStore(sessionId, available),
            timer: ctx.timer,
          };
        },
      }, QuickModelWidget));
    
      ctx.effect(() => () => {
        for (const store of stores.values()) store.dispose();
        stores.clear();
      }, `${PLUGIN_ID}: stores`);
    }
    
    
    exports.apply = apply;
    exports.inject = inject;
    exports.QuickModelWidget = QuickModelWidget;
    exports.createModelStore = createModelStore;
    return module.exports;
  }
});
