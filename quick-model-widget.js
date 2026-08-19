/*
 * Shared source helpers for the DSH quick model + reasoning widget.
 *
 * The standalone DSH plugin integration lives in src/client.js. This file
 * keeps the recent-selection storage and compact renderer reusable.
 *
 * The row intentionally stays stable:
 *   - selecting an existing entry does not move it;
 *   - a new entry is appended on the right;
 *   - adding a fourth entry drops the oldest entry on the left.
 */

const RECENT_SELECTIONS_KEY = "dsh.modelSelection.recents.v1";

export function readRecentSelections(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(RECENT_SELECTIONS_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry) => (
        entry !== null &&
        typeof entry === "object" &&
        typeof entry.provider === "string" &&
        typeof entry.model === "string"
      ))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export function selectionKey(selection) {
  return `${selection.provider}\u0000${selection.model}\u0000${selection.reasoningEffort ?? ""}`;
}

/**
 * Store a selection without reordering an existing row item.
 */
export function rememberSelection(entry, storage = globalThis.localStorage) {
  const existing = readRecentSelections(storage);
  const index = existing.findIndex(
    (item) => selectionKey(item) === selectionKey(entry),
  );

  const next = index >= 0
    ? existing.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...entry } : item
      ))
    : [...existing, entry].slice(-3);

  try {
    storage.setItem(RECENT_SELECTIONS_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a disabled storage backend should not break the UI.
  }

  return next;
}

/**
 * Render the compact row. The parent owns the model directory and passes the
 * real selection callback, so a click uses the same host-backed path as the
 * full model selector.
 */
export function QuickModelSwitcher({
  React,
  clsx,
  recents,
  current,
  locked,
  busy,
  chooseRecent,
  t,
  classNames,
}) {
  if (recents.length === 0) return null;

  return React.createElement(
    "div",
    {
      className: classNames.quickRail,
      "aria-label": "Recent model and reasoning selections",
    },
    recents.map((entry) => {
      const active = current !== null && selectionKey(current) === selectionKey(entry);
      const model = entry.modelName ?? entry.model;
      const effort = entry.effortName ?? entry.reasoningEffort;
      const label = effort === undefined ? model : `${model} · ${effort}`;

      return React.createElement(
        "button",
        {
          key: selectionKey(entry),
          type: "button",
          className: clsx(
            classNames.quick,
            active && classNames.quickActive,
          ),
          "aria-pressed": active,
          "aria-label": effort === undefined
            ? t("trigger.aria", { model })
            : t("trigger.ariaEffort", { model, effort }),
          title: label,
          disabled: locked || busy || active,
          onClick: () => chooseRecent(entry),
        },
        React.createElement(
          "span",
          { className: classNames.quickModel },
          model,
        ),
        effort !== undefined && React.createElement(
          "span",
          { className: classNames.quickEffort },
          effort,
        ),
      );
    }),
  );
}

export const QUICK_SWITCHER_CSS = `
.quickRail {
  display: flex;
  align-items: center;
  gap: 2px;
  max-width: min(280px, 40vw);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.quickRail::-webkit-scrollbar { display: none; }
.quick {
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
.quick:hover:not(:disabled) {
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.quick:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--dsw-alias-border-l3);
}
.quick:disabled { cursor: default; opacity: .55; }
.quickActive {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-module-platform);
  border-color: var(--dsw-alias-border-l3);
}
.quickModel {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quickEffort {
  color: var(--dsw-alias-label-caption);
  font-size: 10px;
  flex: none;
}
@media (max-width: 720px) {
  .quickRail { max-width: 132px; }
  .quick { max-width: 72px; padding-inline: 5px; }
}
`;
