import { component$, useContextProvider, Slot } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";
import { load as loadYaml } from "js-yaml";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import AuthGate from "~/components/auth/auth-gate";
import Navbar from "~/components/furniture/nav";
import { defaultLanguage, isLanguage, LanguageContext, type Language } from "~/i18n";
import { localizeSections } from "~/i18n/checklist";
import { ChecklistContext } from "~/store/checklist-context";
import type { Sections } from "~/types/PSC";

const checklistCache = new Map<Language, Sections>();
const checklistRequest = new Map<Language, Promise<Sections>>();

const getLanguage = (value: string | null | undefined): Language => {
  return isLanguage(value) ? value : defaultLanguage;
};

export const useLanguage = routeLoader$(({ cookie }) => {
  return getLanguage(cookie.get("PSC_LANGUAGE")?.value);
});

export const useChecklists = routeLoader$(async ({ cookie }) => {
  const language = getLanguage(cookie.get("PSC_LANGUAGE")?.value);

  if (checklistCache.has(language)) {
    return checklistCache.get(language) as Sections;
  }

  const checklistPath = resolve(process.cwd(), "personal-security-checklist.yml");

  const loadChecklist = () => readFile(checklistPath, "utf-8")
    .then((res) => {
      const parsed = loadYaml(res);
      if (!Array.isArray(parsed)) {
        throw new Error(`Invalid checklist data from ${checklistPath}`);
      }
      return localizeSections(parsed as Sections, language);
    });

  if (!checklistRequest.has(language)) {
    checklistRequest.set(language, loadChecklist()
      .catch(() => [])
      .then((sections) => {
        checklistCache.set(language, sections);
        return sections;
      })
      .catch((error) => {
        checklistRequest.delete(language);
        throw error;
      }));
  }

  return checklistRequest.get(language) as Promise<Sections>;
});

export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

export default component$(() => {
  const language = useLanguage();
  const checklists = useChecklists();
  useContextProvider(LanguageContext, language);
  useContextProvider(ChecklistContext, checklists);

  return (
    <AuthGate>
      <Navbar />
      <main class="bg-base-100 min-h-full pb-16 md:pb-24">
        <Slot />
      </main>
    </AuthGate>
  );
});
