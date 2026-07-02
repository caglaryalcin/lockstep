import { $, component$, useContext, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

import { brand } from "~/brand";
import Icon from "~/components/core/icon";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { translate, useI18n } from "~/i18n";
import { sanitizeUsername } from "~/lib/account";
import {
  getSettingsHeaders,
  getStoredUser,
  saveStoredUser,
  type LockstepUser,
} from "~/lib/user-session";
import { ChecklistContext } from "~/store/checklist-context";
import type { Section } from "~/types/PSC";

type StoredItems = Record<string, boolean>;

const makeItemId = (point: string) => point.toLowerCase().replace(/\s+/g, "-");

const formatDate = (value: string | undefined) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateProgress = (
  sections: Section[],
  checkedItems: StoredItems,
  ignoredItems: StoredItems
) => {
  let completed = 0;
  let total = 0;

  sections.forEach((section) => {
    section.checklist.forEach((item) => {
      const id = item.id || makeItemId(item.point);
      if (ignoredItems[id]) {
        return;
      }

      total += 1;
      if (checkedItems[id]) {
        completed += 1;
      }
    });
  });

  return {
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    total,
  };
};

export default component$(() => {
  const { language } = useI18n();
  const checklists = useContext(ChecklistContext);
  const [checked] = useLocalStorage("PSC_PROGRESS", {});
  const [ignored] = useLocalStorage("PSC_IGNORED", {});
  const user = useSignal<LockstepUser | null>(null);
  const accountForm = useStore({
    currentPassword: "",
    error: "",
    name: "",
    newPassword: "",
    success: "",
    username: "",
  });

  useVisibleTask$(() => {
    const storedUser = getStoredUser();
    user.value = storedUser;
    accountForm.name = storedUser?.name || "";
    accountForm.username = storedUser?.username || storedUser?.id || "";
  });

  const updateAccount = $(async () => {
    accountForm.error = "";
    accountForm.success = "";
    const username = sanitizeUsername(accountForm.username);

    if (!accountForm.currentPassword || accountForm.currentPassword.length < 6) {
      accountForm.error = translate(language.value, "userProfile.currentPasswordError");
      return;
    }

    if (username.length < 3) {
      accountForm.error = translate(language.value, "auth.usernameError");
      return;
    }

    if (accountForm.newPassword && accountForm.newPassword.length < 6) {
      accountForm.error = translate(language.value, "auth.passwordError");
      return;
    }

    const previousUserId = user.value?.id;
    const response = await fetch("/api/auth", {
      method: "PATCH",
      headers: getSettingsHeaders(previousUserId),
      body: JSON.stringify({
        currentPassword: accountForm.currentPassword,
        name: accountForm.name,
        newPassword: accountForm.newPassword || undefined,
        username,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      accountForm.error = translate(language.value, "userProfile.updateError");
      return;
    }

    const result = await response.json();
    if (!result?.user) {
      accountForm.error = translate(language.value, "userProfile.updateError");
      return;
    }

    saveStoredUser(result.user);
    user.value = result.user;
    accountForm.currentPassword = "";
    accountForm.newPassword = "";
    accountForm.success = translate(language.value, "userProfile.updateSuccess");

    if (previousUserId && previousUserId !== result.user.id) {
      location.reload();
    }
  });

  const progress = calculateProgress(
    checklists.value,
    checked.value || {},
    ignored.value || {}
  );

  return (
    <main class="mx-auto w-full max-w-7xl px-4 py-8 xl:px-6">
      <section class="rounded-box border border-base-300/40 bg-front p-6 shadow-md">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="grid h-20 w-20 place-items-center rounded-full bg-orange-400 text-3xl font-bold text-slate-950 shadow-lg shadow-orange-500/20">
              {user.value?.initials || "U"}
            </div>
            <div>
              <h1 class="text-4xl font-bold">{translate(language.value, "userProfile.title")}</h1>
              <p class="mt-1 opacity-70">{translate(language.value, "userProfile.subtitle")}</p>
            </div>
          </div>

          <a href="/" class="btn btn-primary">
            <Icon icon="homepage" width={16} height={16} />
            {translate(language.value, "nav.home")}
          </a>
        </div>
      </section>

      <section class="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div class="space-y-5">
          <div class="rounded-box border border-base-300/40 bg-front p-5 shadow-md">
            <h2 class="text-2xl font-bold">{user.value?.name || "-"}</h2>
            <div class="mt-5 space-y-4">
              <div class="rounded-md border border-base-content/10 bg-base-100/45 p-4">
                <p class="text-xs uppercase opacity-60">{translate(language.value, "userProfile.username")}</p>
                <p class="mt-1 font-semibold">@{user.value?.username || user.value?.id || "-"}</p>
              </div>
              <div class="rounded-md border border-base-content/10 bg-base-100/45 p-4">
                <p class="text-xs uppercase opacity-60">{translate(language.value, "userProfile.displayName")}</p>
                <p class="mt-1 font-semibold">{user.value?.name || "-"}</p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-md border border-base-content/10 bg-base-100/45 p-4">
                  <p class="text-xs uppercase opacity-60">{translate(language.value, "userProfile.createdAt")}</p>
                  <p class="mt-1 font-semibold">{formatDate(user.value?.createdAt)}</p>
                </div>
                <div class="rounded-md border border-base-content/10 bg-base-100/45 p-4">
                  <p class="text-xs uppercase opacity-60">{translate(language.value, "userProfile.lastSeen")}</p>
                  <p class="mt-1 font-semibold">{formatDate(user.value?.lastSeen)}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-box border border-base-300/40 bg-front p-5 shadow-md">
            <h2 class="text-2xl font-bold">{translate(language.value, "userProfile.accountSettings")}</h2>
            <p class="mt-1 text-sm opacity-70">{translate(language.value, "userProfile.accountSettingsBody")}</p>

            <form preventdefault:submit class="mt-5 grid gap-4" onSubmit$={updateAccount}>
              <label class="block">
                <span class="mb-2 block text-sm font-semibold">{translate(language.value, "auth.usernameLabel")}</span>
                <input
                  class="input input-bordered h-11 w-full bg-base-100"
                  autocomplete="username"
                  type="text"
                  value={accountForm.username}
                  onInput$={(event) => {
                    accountForm.username = (event.target as HTMLInputElement).value;
                    accountForm.error = "";
                    accountForm.success = "";
                  }}
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold">{translate(language.value, "userProfile.displayName")}</span>
                <input
                  class="input input-bordered h-11 w-full bg-base-100"
                  autocomplete="name"
                  type="text"
                  value={accountForm.name}
                  onInput$={(event) => {
                    accountForm.name = (event.target as HTMLInputElement).value;
                    accountForm.error = "";
                    accountForm.success = "";
                  }}
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold">{translate(language.value, "userProfile.currentPassword")}</span>
                <input
                  class="input input-bordered h-11 w-full bg-base-100"
                  autocomplete="current-password"
                  type="password"
                  value={accountForm.currentPassword}
                  onInput$={(event) => {
                    accountForm.currentPassword = (event.target as HTMLInputElement).value;
                    accountForm.error = "";
                    accountForm.success = "";
                  }}
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold">{translate(language.value, "userProfile.newPassword")}</span>
                <input
                  class="input input-bordered h-11 w-full bg-base-100"
                  autocomplete="new-password"
                  placeholder={translate(language.value, "userProfile.newPasswordPlaceholder")}
                  type="password"
                  value={accountForm.newPassword}
                  onInput$={(event) => {
                    accountForm.newPassword = (event.target as HTMLInputElement).value;
                    accountForm.error = "";
                    accountForm.success = "";
                  }}
                />
              </label>

              {accountForm.error && (
                <p class="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  {accountForm.error}
                </p>
              )}
              {accountForm.success && (
                <p class="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  {accountForm.success}
                </p>
              )}

              <button class="btn btn-primary h-11" type="submit">
                {translate(language.value, "userProfile.saveAccount")}
              </button>
            </form>
          </div>
        </div>

        <div class="rounded-box border border-base-300/40 bg-front p-5 shadow-md">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold">{translate(language.value, "userProfile.savedProgress")}</h2>
              <p class="mt-1 opacity-70">
                {translate(language.value, "userProfile.completed", {
                  completed: progress.completed,
                  total: progress.total,
                })}
              </p>
            </div>
            <div class="rounded-box border border-primary/40 px-4 py-3 text-right">
              <p class="text-3xl font-bold text-primary leading-none">{progress.percent}%</p>
            </div>
          </div>

          <progress
            class="progress progress-primary mt-5 w-full"
            value={progress.completed}
            max={progress.total}
          ></progress>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            {checklists.value.slice(0, 6).map((section) => {
              const sectionProgress = calculateProgress(
                [section],
                checked.value || {},
                ignored.value || {}
              );

              return (
                <a
                  key={`profile-section-${section.slug}`}
                  href={`/checklist/${section.slug}`}
                  class="soft-hover rounded-md border border-base-300/40 bg-base-100/35 p-4 shadow-sm"
                >
                  <div class="mb-3 flex items-center gap-2">
                    <Icon icon={section.icon || "shield"} color={section.color} width={18} height={18} />
                    <h3 class={`font-bold text-${section.color}-400`}>{section.title}</h3>
                  </div>
                  <progress
                    class={`progress progress-${section.color} w-full`}
                    value={sectionProgress.completed}
                    max={sectionProgress.total}
                  ></progress>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
});

export const head: DocumentHead = {
  title: `Profile - ${brand.name}`,
};
