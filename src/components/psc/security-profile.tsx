import { $, component$, useContext } from "@builder.io/qwik";

import Icon from "~/components/core/icon";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { translate, useI18n } from "~/i18n";
import { ChecklistContext } from "~/store/checklist-context";
import type { Section } from "~/types/PSC";

type Profile = {
  device: string;
  risk: string;
  focus: string;
};

const defaultProfile: Profile = {
  device: "",
  risk: "",
  focus: "",
};

const devices = [
  { key: "mixed", labelKey: "profile.mixed" },
  { key: "mobile", labelKey: "profile.mobile" },
  { key: "desktop", labelKey: "profile.desktop" },
] as const;

const risks = [
  { key: "normal", labelKey: "profile.normal" },
  { key: "elevated", labelKey: "profile.elevated" },
  { key: "high", labelKey: "profile.high" },
] as const;

const focuses = [
  { key: "accounts", labelKey: "profile.accounts" },
  { key: "privacy", labelKey: "profile.privacy" },
  { key: "money", labelKey: "profile.money" },
] as const;

const baseSlugs = ["passkeys-and-mfa", "account-recovery", "monthly-maintenance"];

const profileSlugs = (profile: Profile) => {
  const slugs = new Set(baseSlugs);

  if (profile.device === "mobile") slugs.add("mobile-devices");
  if (profile.device === "desktop") slugs.add("personal-computers");
  if (profile.risk === "elevated" || profile.risk === "high") slugs.add("scam-defense");
  if (profile.risk === "high") slugs.add("identity-protection");
  if (profile.focus === "accounts") slugs.add("authentication");
  if (profile.focus === "privacy") slugs.add("web-browsing");
  if (profile.focus === "money") slugs.add("personal-finance");

  return Array.from(slugs).slice(0, 6);
};

export default component$(() => {
  const { language } = useI18n();
  const checklists = useContext(ChecklistContext);
  const [profile, setProfile] = useLocalStorage("PSC_PROFILE", defaultProfile);

  const currentProfile = {
    ...defaultProfile,
    ...(profile.value || {}),
  } as Profile;

  const setProfileValue = $((key: keyof Profile, value: string) => {
    setProfile({
      ...currentProfile,
      [key]: value,
    });
  });

  const suggestedSections: Section[] = profileSlugs(currentProfile)
    .map((slug) => checklists.value.find((section) => section.slug === slug))
    .filter((section): section is Section => Boolean(section));

  return (
    <section class="mx-auto mt-8 w-full max-w-7xl px-4 xl:px-6">
      <div class="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div class="rounded-box border border-base-300/40 bg-front p-5 shadow-md">
          <div class="mb-4 flex items-center gap-2">
            <Icon icon="shield" width={22} height={22} />
            <h2 class="text-2xl font-bold">{translate(language.value, "profile.title")}</h2>
          </div>

          <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            <div>
              <p class="mb-2 text-sm font-bold">{translate(language.value, "profile.device")}</p>
              <div class="join">
                {devices.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    class={[
                      "btn btn-sm join-item",
                      currentProfile.device === option.key ? "btn-primary" : "btn-ghost",
                    ]}
                    onClick$={() => setProfileValue("device", option.key)}
                  >
                    {translate(language.value, option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-bold">{translate(language.value, "profile.risk")}</p>
              <div class="join">
                {risks.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    class={[
                      "btn btn-sm join-item",
                      currentProfile.risk === option.key ? "btn-primary" : "btn-ghost",
                    ]}
                    onClick$={() => setProfileValue("risk", option.key)}
                  >
                    {translate(language.value, option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-bold">{translate(language.value, "profile.focus")}</p>
              <div class="join">
                {focuses.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    class={[
                      "btn btn-sm join-item",
                      currentProfile.focus === option.key ? "btn-primary" : "btn-ghost",
                    ]}
                    onClick$={() => setProfileValue("focus", option.key)}
                  >
                    {translate(language.value, option.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-box border border-base-300/40 bg-front p-5 shadow-md">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-2xl font-bold">{translate(language.value, "profile.suggested")}</h2>
            <span class="badge badge-outline">{translate(language.value, "profile.areas", { count: suggestedSections.length })}</span>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            {suggestedSections.map((section) => (
              <a
                key={`profile-${section.slug}`}
                href={`/checklist/${section.slug}`}
                class={[
                  "soft-hover flex items-center gap-3 rounded-md border border-base-300/30 bg-base-100/35 p-3 transition-all",
                  "hover:-translate-y-0.5 hover:border-base-content/20 hover:shadow-md",
                ]}
              >
                <Icon icon={section.icon || "shield"} color={section.color} width={24} height={24} />
                <div>
                  <h3 class={`font-bold text-${section.color}-400`}>{section.title}</h3>
                  <p class="text-xs opacity-70">{translate(language.value, "common.items", { count: section.checklist.length })}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
