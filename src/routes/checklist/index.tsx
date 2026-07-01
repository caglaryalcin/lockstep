import { component$, useContext, useSignal } from "@builder.io/qwik";

import { ChecklistContext } from '~/store/checklist-context';
import { translate, useI18n } from "~/i18n";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import Icon from "~/components/core/icon";
import type { Section } from "~/types/PSC";

export default component$(() => {
  const { language } = useI18n();
  const checklists = useContext(ChecklistContext);

  const [completed, setCompleted] = useLocalStorage('PSC_PROGRESS', {});
  const openPanel = useSignal<number | null>(null);

  return (
    <main class="p-8">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
        {checklists.value.map((section: Section, index: number) => (
          <section
            key={index}
            class={[
              'soft-hover rounded-box border border-base-300/60 bg-front shadow-md transition-all',
              openPanel.value === index ? 'shadow-xl' : 'hover:border-base-content/20'
            ]}
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition"
              aria-expanded={openPanel.value === index}
              onClick$={() => {
                openPanel.value = openPanel.value === index ? null : index;
              }}
            >
              <span class="flex min-w-0 items-center gap-3">
                <Icon icon={section.icon} color={section.color} width={22} height={22} />
                <span class={`text-xl font-semibold text-${section.color}-400`}>{section.title}</span>
              </span>
              <span
                class={[
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full border border-base-content/10 bg-base-200/60 text-base-content/70 transition-transform',
                  openPanel.value === index ? 'rotate-180 text-primary' : ''
                ]}
                aria-hidden="true"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            <div class={['px-5 pb-5', openPanel.value === index ? 'block' : 'hidden']}>
              {
                section.checklist.map((item, index) => {
                  const pointId = item.id || item.point.toLowerCase().replace(/ /g, '-');
                  const inputId = `check-${section.slug}-${index}`;
                  return (
                  <div key={pointId} class="flex justify-between border-t border-base-content/10 py-3 first:border-t-0">
                    <label class="flex items-start gap-3" for={inputId}>
                      <input
                        class="checkbox checkbox-sm mt-1"
                        id={inputId}
                        type="checkbox"
                        checked={completed.value[pointId] || false}
                        onClick$={() => {
                          setCompleted({
                            ...completed.value,
                            [pointId]: !completed.value[pointId],
                          });
                        }}
                      />
                      <span class="tooltip tooltip-bottom text-sm" data-tip={item.details}>{item.point}</span>
                    </label>
                  </div>
                )
              })
              }
              <div class="card-actions justify-end">
                <a href={`/checklist/${section.slug}`}>
                  <button class={`btn border-0 text-base-100 bg-${section.color}-400 hover:brightness-110 hover:shadow-md`}>
                    {translate(language.value, "checklist.viewFull")}
                  </button>
                </a>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
});
