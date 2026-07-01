import { component$ } from "@builder.io/qwik";

import { useLocalStorage } from "~/hooks/useLocalStorage";
import { translate, useI18n } from "~/i18n";
import type { Section } from '~/types/PSC';
import Icon from '~/components/core/icon';
import styles from './psc.module.css';

export default component$((props: { sections: Section[] }) => {
  const { language } = useI18n();
  const [checked] = useLocalStorage('PSC_PROGRESS', {});
  const [ignored] = useLocalStorage('PSC_IGNORED', {});

  const checkedItems = checked.value || {};
  const ignoredItems = ignored.value || {};
  const sectionStats = props.sections.map((section) => {
    let total = 0;
    let done = 0;

    section.checklist.forEach((item) => {
      const id = item.id || item.point.toLowerCase().replace(/ /g, '-');
      if (ignoredItems[id]) {
        return;
      }
      total += 1;
      if (checkedItems[id]) {
        done += 1;
      }
    });

    return {
      done,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  });

  return (
    <div class={[styles.container, 'grid',
      'mx-auto mt-8 px-4 gap-7', 'xl:px-10 xl:max-w-7xl',
      'transition-all', 'max-w-6xl w-full']}>
      {props.sections.map((section: Section, index: number) => (                   
        <a key={section.slug}
          href={`/checklist/${section.slug}`}
          class={[
            'soft-hover group card card-side overflow-hidden border border-base-300/40 bg-front shadow-md transition-all duration-200 px-2',
            'hover:-translate-y-1 hover:border-base-content/20 hover:shadow-xl',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4',
            `focus-visible:outline-${section.color}-400`
          ]}
        >
          <div class="flex-shrink-0 flex flex-col py-4 h-auto items-stretch justify-evenly">
            <Icon icon={section.icon || 'star'} color={section.color} />
            {sectionStats[index].done ? (
              <p class={`text-${section.color}-400 pt-2 pb-0 px-0 mx-0 my-0`}>
                {sectionStats[index].done}/{section.checklist.length} {translate(language.value, "common.done")}
              </p>
            ) : (
              <p class={`text-${section.color}-400 pt-2 pb-0 px-0 mx-0 my-0`}>
                {translate(language.value, "common.items", { count: section.checklist.length })}
              </p>
            )}
          </div>
          <div class="card-body flex-grow py-2 pl-4 pr-0 min-w-0">
            <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h2 class={`card-title min-w-0 flex-1 leading-tight text-${section.color}-400 transition-colors group-hover:text-${section.color}-500`}>
                {section.title}
              </h2>
              {sectionStats[index].percent ? (
                <div
                  class={['radial-progress shrink-0', `text-${section.color}-400`]}
                  style={`--value:${sectionStats[index].percent}; --size: 2.25rem;`}
                  role="progressbar">
                    <span class="text-xs">{sectionStats[index].percent}%</span>
                </div>
              ) : (
                <span class="shrink-0 opacity-30 text-xs leading-5">
                  {translate(language.value, "common.notStarted")}
                </span>
              )}
            </div>
            <p class="p-0">{section.description}</p>
          </div>
        </a>
      ))}
    </div>
  );
});
