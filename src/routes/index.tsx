import { component$, useContext } from '@builder.io/qwik';
import { type DocumentHead } from "@builder.io/qwik-city";

import SectionLinkGrid from "~/components/psc/section-link-grid";
import Progress from "~/components/psc/progress";
import PriorityActions from "~/components/psc/priority-actions";
import SecurityProfile from "~/components/psc/security-profile";

import { brand } from '~/brand';
import { ChecklistContext } from '~/store/checklist-context';

export default component$(() => { 
  const checklists = useContext(ChecklistContext);

  return (
    <>
      <Progress />
      <SecurityProfile />
      <PriorityActions />
      <SectionLinkGrid sections={checklists.value} />
    </>
  );
});

export const head: DocumentHead = {
  title: brand.name,
  meta: [
    {
      name: "description",
      content: brand.tagline,
    },
  ],
};
