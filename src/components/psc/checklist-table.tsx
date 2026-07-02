import { $, component$, useSignal, useStore } from "@builder.io/qwik";
import { useCSSTransition } from "qwik-transition";
import { marked } from "marked";

import Icon from "~/components/core/icon";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { translate, translateCadence, translateLevel, translatePriority, useI18n } from "~/i18n";
import {
  getPriorityDefinition,
  normalizePriority,
  priorityDefinitions,
} from "~/lib/priorities";
import type { Checklist, PriorityKey, Section } from "../../types/PSC";
import styles from "./psc.module.css";

type CompletionFilter = "all" | "remaining" | "completed";
type FilterState = {
  show: CompletionFilter;
  levels: Record<PriorityKey, boolean>;
};
type ChecklistRow = Checklist & {
  id: string;
  badgeColor: string;
  detailsHtml: string;
  priorityKey: PriorityKey;
  priorityRank: number;
  rowBorder: string;
  rowTint: string;
};

const priorityOrder = priorityDefinitions.map((priority) => priority.key);
const rowTones: Record<string, { border: string; tint: string }> = {
  info: {
    border: "rgba(56, 189, 248, 0.46)",
    tint: "rgba(56, 189, 248, 0.10)",
  },
  success: {
    border: "rgba(52, 211, 153, 0.46)",
    tint: "rgba(52, 211, 153, 0.10)",
  },
  neutral: {
    border: "rgba(148, 163, 184, 0.38)",
    tint: "rgba(148, 163, 184, 0.09)",
  },
  warning: {
    border: "rgba(250, 204, 21, 0.42)",
    tint: "rgba(250, 204, 21, 0.10)",
  },
  error: {
    border: "rgba(248, 113, 113, 0.42)",
    tint: "rgba(248, 113, 113, 0.10)",
  },
};

const originalFilters = (): FilterState => ({
  show: "all" as CompletionFilter,
  levels: priorityDefinitions.reduce((levels, priority) => {
    levels[priority.key] = true;
    return levels;
  }, {} as Record<PriorityKey, boolean>),
});

const generateId = (title: string) => {
  return title.toLowerCase().replace(/ /g, "-");
};

const parseMarkdown = (text: string | undefined): string => {
  return (marked.parse(text || "", { async: false }) as string) || "";
};

const createRows = (items: Checklist[]): ChecklistRow[] => {
  return items.map((item) => {
    const priorityKey = normalizePriority(item.priority);
    const priorityDefinition = getPriorityDefinition(item.priority);
    const rowTone = rowTones[priorityDefinition.badgeColor];
    return {
      ...item,
      id: item.id || generateId(item.point),
      badgeColor: priorityDefinition.badgeColor,
      detailsHtml: parseMarkdown(item.details),
      priorityKey,
      priorityRank: priorityOrder.indexOf(priorityKey),
      rowBorder: rowTone.border,
      rowTint: rowTone.tint,
    };
  });
};

export default component$((props: { section: Section }) => {
  const { language } = useI18n();
  const [completed, setCompleted] = useLocalStorage("PSC_PROGRESS", {});
  const [ignored, setIgnored] = useLocalStorage("PSC_IGNORED", {});

  const showFilters = useSignal(false);
  const { stage } = useCSSTransition(showFilters, { timeout: 300 });

  const sortState = useStore({ column: "", ascending: true });
  const rows = useSignal<ChecklistRow[]>(createRows(props.section.checklist));
  const filterState = useStore(originalFilters());

  const checkedItems = completed.value || {};
  const ignoredItems = ignored.value || {};
  const visibleRows: ChecklistRow[] = [];
  let done = 0;
  let disabled = 0;
  let activeTotal = 0;

  rows.value.forEach((item) => {
    const itemIgnored = Boolean(ignoredItems[item.id]);
    const itemCompleted = !itemIgnored && Boolean(checkedItems[item.id]);

    if (itemIgnored) {
      disabled += 1;
    } else {
      activeTotal += 1;
      if (itemCompleted) {
        done += 1;
      }
    }

    if (filterState.show === "remaining" && (itemCompleted || itemIgnored)) return;
    if (filterState.show === "completed" && !itemCompleted) return;
    if (!filterState.levels[item.priorityKey]) return;

    visibleRows.push(item);
  });

  const sortChecklist = (a: ChecklistRow, b: ChecklistRow) => {
    const getValue = (item: ChecklistRow) => {
      switch (sortState.column) {
        case "done":
          if (ignoredItems[item.id]) {
            return 2;
          }
          return checkedItems[item.id] ? 0 : 1;
        case "advice":
          return item.point;
        case "level":
          return item.priorityRank;
        default:
          return 0;
      }
    };

    const valueA = getValue(a);
    const valueB = getValue(b);

    if (valueA === valueB) {
      return 0;
    } else if (sortState.ascending) {
      return valueA < valueB ? -1 : 1;
    } else {
      return valueA > valueB ? -1 : 1;
    }
  };

  const handleSort = $((column: string) => {
    if (sortState.column === column) {
      sortState.ascending = !sortState.ascending;
    } else {
      sortState.column = column;
      sortState.ascending = true;
    }
  });

  const resetFilters = $(() => {
    const defaults = originalFilters();
    sortState.column = "";
    sortState.ascending = true;
    filterState.levels = defaults.levels;
    filterState.show = defaults.show;
  });

  const total = rows.value.length;
  const percent = activeTotal ? Math.round((done / activeTotal) * 100) : 0;
  const filtersChanged =
    sortState.column ||
    filterState.show !== "all" ||
    priorityDefinitions.some((priority) => !filterState.levels[priority.key]);

  return (
    <>
      <div class="flex flex-wrap justify-between items-center">
        <div>
          <progress class="progress w-64" value={percent} max="100"></progress>
          <p class="text-xs text-center">
            {translate(language.value, "table.completeLine", { done, total, percent, ignored: disabled })}
          </p>
        </div>

        <div class="flex flex-wrap gap-2 justify-end my-4">
          {filtersChanged && (
            <button class="btn btn-sm btn-ghost soft-hover border border-transparent" onClick$={resetFilters}>
              <Icon width={18} height={16} icon="clear" />
              {translate(language.value, "table.resetFilters")}
            </button>
          )}
          <button
            class="btn btn-sm btn-ghost soft-hover border border-transparent"
            onClick$={() => {
              showFilters.value = !showFilters.value;
            }}
          >
            <Icon width={18} height={16} icon="filters" />
            {showFilters.value ? translate(language.value, "table.hideFilters") : translate(language.value, "table.showFilters")}
          </button>
        </div>
      </div>

      {showFilters.value && (
        <div
          class="flex flex-wrap justify-between bg-base-100 rounded px-4 py-1 transition-all"
          style={{
            opacity: stage.value === "enterTo" ? 1 : 0,
            height: stage.value === "enterTo" ? "auto" : 0,
          }}
        >
          <div class="flex justify-end items-center gap-1">
            <p class="font-bold text-sm">{translate(language.value, "table.show")}</p>
            <label
              onClick$={() => (filterState.show = "all")}
              class="soft-hover p-2 rounded border border-transparent transition-all cursor-pointer flex gap-2"
            >
              <span class="text-sm">{translate(language.value, "table.all")}</span>
              <input
                type="radio"
                name={`show-${props.section.slug}`}
                class="radio radio-sm checked:radio-info"
                checked={filterState.show === "all"}
              />
            </label>
            <label
              onClick$={() => (filterState.show = "remaining")}
              class="soft-hover p-2 rounded border border-transparent transition-all cursor-pointer flex gap-2"
            >
              <span class="text-sm">{translate(language.value, "table.remaining")}</span>
              <input
                type="radio"
                name={`show-${props.section.slug}`}
                class="radio radio-sm checked:radio-error"
                checked={filterState.show === "remaining"}
              />
            </label>
            <label
              onClick$={() => (filterState.show = "completed")}
              class="soft-hover p-2 rounded border border-transparent transition-all cursor-pointer flex gap-2"
            >
              <span class="text-sm">{translate(language.value, "table.completed")}</span>
              <input
                type="radio"
                name={`show-${props.section.slug}`}
                class="radio radio-sm checked:radio-success"
                checked={filterState.show === "completed"}
              />
            </label>
          </div>

          <div class="flex justify-end items-center gap-1">
            <p class="font-bold text-sm">{translate(language.value, "table.filter")}</p>
            {priorityDefinitions.map((priority) => (
              <label
                key={priority.key}
                class="soft-hover p-2 rounded border border-transparent transition-all cursor-pointer flex gap-2"
              >
                <span class="text-sm">{translatePriority(language.value, priority.key)}</span>
                <input
                  type="checkbox"
                  checked={filterState.levels[priority.key]}
                  onChange$={() => {
                    filterState.levels[priority.key] = !filterState.levels[priority.key];
                  }}
                  class={`checkbox checkbox-sm checked:checkbox-${priority.badgeColor}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <table class="table">
        <thead>
          <tr>
            {[
              { id: "done", text: translate(language.value, "table.done") },
              { id: "advice", text: translate(language.value, "table.advice") },
              { id: "level", text: translate(language.value, "table.level") },
            ].map((item) => (
              <th
                key={item.id}
                class="cursor-pointer"
                onClick$={() => handleSort(item.id)}
              >
                <span class="flex items-center gap-0.5 hover:text-primary transition">
                  <Icon width={12} height={14} icon="sort" />
                  {item.text}
                </span>
              </th>
            ))}
            <th>{translate(language.value, "table.details")}</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.sort(sortChecklist).map((item) => {
            const itemIgnored = Boolean(ignoredItems[item.id]);
            const itemCompleted = !itemIgnored && Boolean(checkedItems[item.id]);

            return (
              <tr
                key={item.id}
                class={[
                  "border-t border-base-content/10 transition-colors",
                  itemIgnored ? "opacity-60" : "",
                  !itemIgnored && !itemCompleted ? "hover:bg-front" : "",
                ]}
                style={
                  itemCompleted
                    ? `background: linear-gradient(90deg, ${item.rowTint} 0%, rgba(255, 255, 255, 0.025) 46%, transparent 100%); box-shadow: inset 3px 0 0 ${item.rowBorder};`
                    : itemIgnored
                      ? "background: linear-gradient(90deg, rgba(148, 163, 184, 0.09), transparent 72%); box-shadow: inset 3px 0 0 rgba(148, 163, 184, 0.28);"
                      : ""
                }
              >
                <td class="text-center">
                  <input
                    type="checkbox"
                    class={`checkbox checked:checkbox-${item.badgeColor} hover:checkbox-${item.badgeColor}`}
                    id={`done-${item.id}`}
                    checked={itemCompleted}
                    disabled={itemIgnored}
                    onClick$={() => {
                      setCompleted({
                        ...completed.value,
                        [item.id]: !completed.value[item.id],
                      });
                    }}
                  />
                  <label
                    for={`ignore-${item.id}`}
                    class="text-small block opacity-50 mt-2"
                  >
                    {translate(language.value, "table.ignore")}
                  </label>
                  <input
                    type="checkbox"
                    id={`ignore-${item.id}`}
                    class={`toggle toggle-xs toggle-${item.badgeColor}`}
                    checked={itemIgnored}
                    onClick$={() => {
                      setIgnored({
                        ...ignored.value,
                        [item.id]: !ignored.value[item.id],
                      });
                      setCompleted({
                        ...completed.value,
                        [item.id]: false,
                      });
                    }}
                  />
                </td>
                <td>
                  <label
                    for={`done-${item.id}`}
                    class={`text-base font-bold ${
                      itemIgnored ? "line-through" : "cursor-pointer"
                    }`}
                  >
                    {item.point}
                  </label>
                  {(item.impact || item.effort || item.cadence) && (
                    <div class="mt-2 flex flex-wrap gap-1">
                      {item.impact && (
                        <span class="badge badge-outline badge-sm">
                          {translate(language.value, "common.impact")}: {translateLevel(language.value, item.impact)}
                        </span>
                      )}
                      {item.effort && (
                        <span class="badge badge-outline badge-sm">
                          {translate(language.value, "common.effort")}: {translateLevel(language.value, item.effort)}
                        </span>
                      )}
                      {item.cadence && (
                        <span class="badge badge-outline badge-sm">
                          {translateCadence(language.value, item.cadence)}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <div class={[`badge gap-2 badge-${item.badgeColor}`, styles.priorityBadge]}>
                    {translatePriority(language.value, item.priorityKey)}
                  </div>
                </td>
                <td
                  class={styles.checklistItemDescription}
                  dangerouslySetInnerHTML={item.detailsHtml}
                ></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
});
