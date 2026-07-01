import { component$, useContext, useSignal, useTask$ } from "@builder.io/qwik";

import { useLocalStorage } from "~/hooks/useLocalStorage";
import { translate, translatePriority, useI18n } from "~/i18n";
import { ChecklistContext } from "~/store/checklist-context";
import { normalizePriority, priorityDefinitions } from "~/lib/priorities";
import type { PriorityKey, Sections, Section } from '~/types/PSC';
import Icon from '~/components/core/icon';
import styles from './psc.module.css';

type StoredItems = Record<string, boolean>;

interface ProgressSummary {
  completed: number;
  outOf: number;
}

interface RadarSeries {
  key: PriorityKey;
  label: string;
  color: string;
  points: string;
}

const radarSize = 360;
const radarCenter = radarSize / 2;
const radarRadius = 148;
const radarLabelRadius = 172;
const radarViewBox = "-60 -22 480 404";
const radarRings = [25, 50, 75, 100];

const makeItemId = (point: string) => point.toLowerCase().replace(/\s+/g, '-');

const calculateProgress = (
  sections: Sections,
  checkedItems: StoredItems,
  ignoredItems: StoredItems,
  priority?: PriorityKey
): ProgressSummary => {
  let completed = 0;
  let outOf = 0;

  sections.forEach((section: Section) => {
    section.checklist.forEach((item) => {
      if (priority && normalizePriority(item.priority) !== priority) {
        return;
      }

      const id = item.id || makeItemId(item.point);
      if (ignoredItems[id]) {
        return;
      }

      outOf += 1;
      if (checkedItems[id]) {
        completed += 1;
      }
    });
  });

  return { completed, outOf };
};

const percentComplete = (
  sections: Sections,
  checkedItems: StoredItems,
  ignoredItems: StoredItems,
  priority?: PriorityKey
) => {
  const progress = calculateProgress(sections, checkedItems, ignoredItems, priority);
  return progress.outOf ? Math.round((progress.completed / progress.outOf) * 100) : 0;
};

const radarPoint = (index: number, total: number, percent: number, radius = radarRadius) => {
  if (!total) {
    return { x: radarCenter, y: radarCenter };
  }

  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  const scaledRadius = radius * (percent / 100);

  return {
    x: radarCenter + Math.cos(angle) * scaledRadius,
    y: radarCenter + Math.sin(angle) * scaledRadius,
  };
};

const formatPoint = ({ x, y }: { x: number; y: number }) => `${x.toFixed(1)},${y.toFixed(1)}`;

const makeRingPoints = (total: number, percent: number) =>
  Array.from({ length: total }, (_, index) => formatPoint(radarPoint(index, total, percent))).join(' ');

const makeRadarSeries = (
  sections: Sections,
  checkedItems: StoredItems,
  ignoredItems: StoredItems
): RadarSeries[] => {
  return priorityDefinitions.map((priority) => ({
    key: priority.key,
    label: priority.label,
    color: priority.radarColor,
    points: sections.map((section, index) => {
      const percent = percentComplete([section], checkedItems, ignoredItems, priority.key);
      return formatPoint(radarPoint(index, sections.length, percent));
    }).join(' '),
  }));
};

const labelAnchor = (x: number) => {
  if (x < radarCenter - 8) return 'end';
  if (x > radarCenter + 8) return 'start';
  return 'middle';
};

/**
 * Component for client-side user progress metrics.
 */
export default component$(() => {
  const { language } = useI18n();
  const checklists = useContext(ChecklistContext);
  const [checked] = useLocalStorage('PSC_PROGRESS', {});
  const [ignored] = useLocalStorage('PSC_IGNORED', {});
  const [ignoreDialog, setIgnoreDialog] = useLocalStorage('PSC_CLOSE_WELCOME', false);

  const totalProgress = useSignal<ProgressSummary>({ completed: 0, outOf: 0 });
  const sectionCompletion = useSignal<number[]>([]);
  const radarSeries = useSignal<RadarSeries[]>([]);
  const priorityCompletion = useSignal<Record<PriorityKey, number>>(
    priorityDefinitions.reduce((progress, priority) => {
      progress[priority.key] = 0;
      return progress;
    }, {} as Record<PriorityKey, number>)
  );

  useTask$(({ track }) => {
    track(() => checked.value);
    track(() => ignored.value);

    const checkedItems = checked.value || {};
    const ignoredItems = ignored.value || {};

    totalProgress.value = calculateProgress(checklists.value, checkedItems, ignoredItems);
    sectionCompletion.value = checklists.value.map((section) =>
      percentComplete([section], checkedItems, ignoredItems)
    );

    priorityCompletion.value = priorityDefinitions.reduce((progress, priority) => {
      progress[priority.key] = percentComplete(checklists.value, checkedItems, ignoredItems, priority.key);
      return progress;
    }, {} as Record<PriorityKey, number>);

    radarSeries.value = makeRadarSeries(checklists.value, checkedItems, ignoredItems);
  });

  const priorityItems = priorityDefinitions.map((priority) => ({
    chartColor: priority.chartColor,
    id: `${priority.key}-container`,
    key: priority.key,
    label: translatePriority(language.value, priority.key),
  }));

  const radarLabels = checklists.value.map((section, index) => {
    const point = radarPoint(index, checklists.value.length, 100, radarLabelRadius);
    return {
      anchor: labelAnchor(point.x),
      section,
      x: point.x,
      y: point.y,
    };
  });
  const totalPercent = totalProgress.value.outOf
    ? Math.round((totalProgress.value.completed / totalProgress.value.outOf) * 100)
    : 0;

  return (
  <div class={[styles.progressOverview, "relative mx-auto mb-6 flex w-full max-w-7xl flex-col gap-5 px-4 xl:px-6"]}>
    {(!ignoreDialog.value && (!Object.keys(checked.value).length) ) && (
    <div class="
      px-16 py-8 top-1/3 z-10 max-w-lg
      absolute flex flex-col justify-center bg-gray-600 rounded-md bg-clip-padding
      backdrop-filter backdrop-blur-md bg-opacity-40 border border-stone-800">
        <button
          class="absolute top-1 right-1 btn btn-sm opacity-50"
          onClick$={() => setIgnoreDialog(true)}
          >{translate(language.value, "settings.close")}</button>
        <p class="text-xl block text-center font-bold">{translate(language.value, "progress.noStatsTitle")}</p>
        <p class="w-md text-left my-2">{translate(language.value, "progress.noStatsBody")}</p>
        <p class="w-md text-left my-2">{translate(language.value, "progress.noStatsAction")}</p>
      </div>
    )}

    <div class="grid w-full grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      <div class="rounded-box flex min-h-[23rem] w-full min-w-0 flex-col justify-between border border-base-300/40 bg-front p-4 shadow-md">
        <svg
          class="mx-auto h-[24rem] w-full max-w-none flex-none overflow-visible text-base-content lg:h-[28rem]"
          viewBox={radarViewBox}
          role="img"
          aria-label={translate(language.value, "progress.chartLabel")}
        >
          {checklists.value.length > 2 && radarRings.map((ring) => (
            <polygon
              key={`radar-ring-${ring}`}
              points={makeRingPoints(checklists.value.length, ring)}
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              class="opacity-20"
            />
          ))}
          {radarLabels.map((label, index) => {
            const end = radarPoint(index, checklists.value.length, 100);
            return (
              <g key={`radar-axis-${label.section.slug}`}>
                <line
                  x1={radarCenter}
                  y1={radarCenter}
                  x2={end.x}
                  y2={end.y}
                  stroke="currentColor"
                  stroke-width="1"
                  class="opacity-20"
                />
                <text
                  x={label.x}
                  y={label.y}
                  text-anchor={label.anchor}
                  dominant-baseline="middle"
                  class="fill-current text-[10.5px] font-medium opacity-80"
                >
                  {label.section.title}
                </text>
              </g>
            );
          })}
          {radarSeries.value.map((series) => (
            <polygon
              key={`radar-series-${series.key}`}
              points={series.points}
              fill={series.color}
              fill-opacity="0.12"
              stroke={series.color}
              stroke-width="2.4"
            />
          ))}
        </svg>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 xl:grid-cols-5">
          {priorityDefinitions.map((priority) => (
            <span key={`radar-legend-${priority.key}`} class="flex items-center gap-2">
              <div class="h-2 w-8 rounded-full" style={`background: ${priority.radarColor};`}></div>
              {translatePriority(language.value, priority.key)}
            </span>
          ))}
        </div>
      </div>

      <div class="flex min-w-0 flex-col gap-5">
        <div class="rounded-box border border-base-300/40 bg-front p-5 shadow-md">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-primary text-2xl leading-none">{translate(language.value, "progress.title")}</h3>
              <p class="mt-2 text-base opacity-85">
                {translate(language.value, "progress.completed", {
                  completed: totalProgress.value.completed,
                  total: totalProgress.value.outOf,
                })}
              </p>
            </div>
            <div class="rounded-box border border-primary/40 px-3 py-2 text-right">
              <p class="text-2xl font-bold text-primary leading-none">{totalPercent}%</p>
            </div>
          </div>
          <progress
            class="progress progress-primary mt-4 w-full"
            value={totalProgress.value.completed}
            max={totalProgress.value.outOf}>
          </progress>
        </div>

        <div class="rounded-box flex-1 border border-base-300/40 bg-front p-5 shadow-md">
          <ul class="grid gap-x-5 gap-y-2 sm:grid-cols-2">
            { checklists.value.map((section: Section, index: number) => (
                <li key={index}>
                  <a
                    href={`/checklist/${section.slug}`}
                    class={[
                      'group flex w-full min-w-0 flex-col items-stretch gap-1.5 tooltip transition',
                      `hover:text-${section.color}-400`
                    ]}
                    data-tip={translate(language.value, "progress.sectionTip", {
                      percent: sectionCompletion.value[index],
                      total: section.checklist.length,
                    })}
                  >
                  <p class="m-0 flex min-w-0 items-center gap-2 text-left text-sm font-semibold leading-tight">
                    <Icon icon={section.icon} width={15} />
                    <span class="min-w-0">{section.title}</span>
                  </p>
                  <div class="h-2 w-full overflow-hidden rounded-full bg-base-content/15">
                    <div
                      class={`h-full rounded-full transition bg-${section.color}-400`}
                      style={`width: ${sectionCompletion.value[index] || 0}%;`}></div>
                  </div>
                  </a>
                </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div class="grid w-full min-w-0 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {priorityItems.map((item) => {
        const percent = priorityCompletion.value[item.key] || 0;
        return (
          <div
            key={item.id}
            class="rounded-box flex min-h-28 min-w-0 flex-col items-center justify-center border border-base-300/40 bg-front p-4 shadow-md"
          >
            <svg
              id={item.id}
              class="h-16 w-full max-w-36 overflow-visible text-base-content"
              viewBox="0 0 100 60"
              aria-label={`${item.label} ${percent}% complete`}
            >
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                pathLength="100"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="6"
                class="opacity-40"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                pathLength="100"
                stroke-linecap="round"
                stroke-width="6"
                style={`stroke: ${item.chartColor}; stroke-dasharray: ${percent} 100;`}
              />
              <text
                x="50"
                y="42"
                text-anchor="middle"
                class="fill-current text-sm"
              >
                {percent}%
              </text>
            </svg>
            <p class="text-center text-sm sm:text-base">{item.label}</p>
          </div>
        );
      })}
    </div>

  </div>
  );
});
