import { component$, useContext } from "@builder.io/qwik";

import Icon from "~/components/core/icon";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { translate, translateLevel, translatePriority, useI18n } from "~/i18n";
import { normalizePriority } from "~/lib/priorities";
import { ChecklistContext } from "~/store/checklist-context";
import type { Checklist, PriorityKey, Section } from "~/types/PSC";

type PriorityAction = Checklist & {
  id: string;
  priorityKey: PriorityKey;
  section: Section;
  score: number;
};

const makeItemId = (point: string) => point.toLowerCase().replace(/\s+/g, "-");

const impactScore: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const effortScore: Record<string, number> = {
  low: 3,
  medium: 2,
  high: 1,
};

const scoreItem = (item: Checklist) => {
  const priority = normalizePriority(item.priority);
  const priorityScore = priority === "essential" ? 4 : priority === "recommended" ? 3 : 1;
  const impact = impactScore[(item.impact || "").toLowerCase()] || 2;
  const effort = effortScore[(item.effort || "").toLowerCase()] || 2;
  return priorityScore * 10 + impact * 3 + effort;
};

export default component$(() => {
  const { language } = useI18n();
  const checklists = useContext(ChecklistContext);
  const [completed] = useLocalStorage("PSC_PROGRESS", {});
  const [ignored] = useLocalStorage("PSC_IGNORED", {});

  const checkedItems = completed.value || {};
  const ignoredItems = ignored.value || {};
  const actions: PriorityAction[] = [];

  checklists.value.forEach((section) => {
    section.checklist.forEach((item) => {
      const id = item.id || makeItemId(item.point);
      const priority = normalizePriority(item.priority);

      if (checkedItems[id] || ignoredItems[id]) return;
      if (priority !== "essential" && priority !== "recommended") return;

      actions.push({
        ...item,
        id,
        priorityKey: priority,
        section,
        score: scoreItem(item),
      });
    });
  });

  const topActions = actions.sort((a, b) => b.score - a.score).slice(0, 5);

  if (!topActions.length) {
    return null;
  }

  return (
    <section class="mx-auto mt-8 w-full max-w-7xl px-4 xl:px-10">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-content/10 pb-3">
        <div>
          <h2 class="text-2xl font-bold">{translate(language.value, "priorityActions.title")}</h2>
          <p class="text-sm opacity-70">{translate(language.value, "priorityActions.subtitle")}</p>
        </div>
        <a href="/checklist" class="btn btn-sm btn-ghost soft-hover border border-transparent">
          <Icon icon="all" width={16} height={16} />
          {translate(language.value, "priorityActions.all")}
        </a>
      </div>

      <div class="mt-4 grid gap-3 lg:grid-cols-5 md:grid-cols-2">
        {topActions.map((item) => (
          <a
            key={`${item.section.slug}-${item.id}`}
            href={`/checklist/${item.section.slug}`}
            class={[
              "soft-hover rounded-md border border-base-300/40 bg-front p-4 shadow-sm transition-all",
              "hover:-translate-y-0.5 hover:border-base-content/20 hover:shadow-md",
            ]}
          >
            <div class="mb-3 flex items-center justify-between gap-2">
              <Icon icon={item.section.icon || "shield"} color={item.section.color} width={22} height={22} />
              <span class={`badge badge-sm text-${item.section.color}-400`}>
                {translatePriority(language.value, item.priorityKey)}
              </span>
            </div>
            <h3 class="text-base font-bold leading-snug">{item.point}</h3>
            <p class="mt-2 text-xs opacity-70">{item.section.title}</p>
            {(item.impact || item.effort) && (
              <div class="mt-3 flex flex-wrap gap-1">
                {item.impact && <span class="badge badge-outline badge-xs">{translate(language.value, "common.impact")}: {translateLevel(language.value, item.impact)}</span>}
                {item.effort && <span class="badge badge-outline badge-xs">{translate(language.value, "common.effort")}: {translateLevel(language.value, item.effort)}</span>}
              </div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
});
