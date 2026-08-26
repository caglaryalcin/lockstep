
import { $, component$, useContext, useOnDocument, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import Icon from "~/components/core/icon";
import { brand } from "~/brand";
import BrandLogo from "~/components/furniture/brand-logo";
import { languages, translate, useI18n, type Language } from "~/i18n";
import type { Section } from '~/types/PSC';
import { useTheme } from '~/store/theme-store';
import { ChecklistContext } from '~/store/checklist-context';
import {
  clearCurrentUserLocalSettings,
  clearStoredUser,
  getSettingsHeaders,
  getStoredUser,
  getUserScopedStorageKey,
  type LockstepUser,
} from "~/lib/user-session";


export default component$(() => {

  const data = useContext(ChecklistContext);

  const { theme, setTheme } = useTheme();
  const { language } = useI18n();
  const activeUser = useSignal<LockstepUser | null>(null);
  const checklistsMenuOpen = useSignal(false);
  const deleteConfirmMessage = translate(language.value, 'settings.confirmDelete');

  useVisibleTask$(() => {
    activeUser.value = getStoredUser();
  });

  useOnDocument(
    'click',
    $((event) => {
      const dropdown = document.getElementById('checklists_dropdown');
      const clickTarget = event.target;

      if (!(clickTarget instanceof Node) || dropdown?.contains(clickTarget)) {
        return;
      }

      checklistsMenuOpen.value = false;
    })
  );

  const themes = [
    'dark', 'light', 'night', 'cupcake', 
    'bumblebee', 'corporate', 'synthwave', 'retro', 
    'valentine', 'halloween', 'aqua', 'lofi', 
    'fantasy', 'dracula'
  ];

  const changeLanguage = $(async (nextLanguage: Language) => {
    if (nextLanguage === language.value) {
      return;
    }

    language.value = nextLanguage;
    const user = getStoredUser();
    localStorage.setItem(getUserScopedStorageKey(user?.id, 'PSC_LANGUAGE'), JSON.stringify(nextLanguage));
    document.cookie = `PSC_LANGUAGE=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`;

    await fetch('/api/settings', {
      method: 'POST',
      headers: getSettingsHeaders(),
      body: JSON.stringify({ key: 'PSC_LANGUAGE', value: nextLanguage }),
    });

    location.reload();
  });

  const deleteAllData = $(async () => {
    const isConfirmed = confirm(deleteConfirmMessage);
    if (isConfirmed) {
      await fetch('/api/settings', { method: 'DELETE', headers: getSettingsHeaders() });
      clearCurrentUserLocalSettings();
      document.cookie = 'PSC_LANGUAGE=; path=/; max-age=0; SameSite=Lax';
      location.reload();
    }
  });

  const logout = $(async () => {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => undefined);
    clearStoredUser();
    location.reload();
  });

  return (
    <>
      <input id="my-drawer-3" type="checkbox" class="drawer-toggle" /> 
      <div class="navbar bg-base-100 px-4">
        <div class="flex flex-none items-center">
          <div class="flex-none md:hidden">
            <label for="my-drawer-3" aria-label="open sidebar" class="btn btn-square btn-ghost soft-hover top-nav-action">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </label>
          </div> 
          <a href="/" class="btn btn-ghost soft-hover top-nav-action h-14 border border-transparent px-2 text-2xl font-semibold flex capitalize">
            <span class="tooltip tooltip-bottom" data-tip={translate(language.value, 'nav.viewAllPages')}>
              <BrandLogo class="mr-2" size={36} />
            </span>
            <h1>{brand.name}</h1>
          </a>
        </div>
        {activeUser.value && (
          <a
            href="/profile"
            class="soft-hover top-nav-action ml-auto grid h-10 w-10 place-items-center rounded-full border border-base-content/10 bg-front text-sm font-bold text-base-content shadow-sm md:hidden"
            aria-label={translate(language.value, 'auth.profile')}
          >
            <span class="top-nav-action-mark grid h-7 w-7 place-items-center rounded-full bg-orange-400 text-slate-950">
              {activeUser.value.initials}
            </span>
          </a>
        )}
        <div class="ml-auto flex-none hidden md:flex items-center gap-2">
          <div id="checklists_dropdown" class="relative">
            <button
              type="button"
              tabIndex={0}
              class={[
                "soft-hover top-nav-action group flex h-10 min-h-10 items-center gap-2 rounded-btn border px-3 font-semibold transition-all duration-200",
                checklistsMenuOpen.value
                  ? "border-orange-400/50 bg-front text-orange-500 shadow-md"
                  : "border-transparent text-base-content hover:-translate-y-0.5 hover:border-orange-400/50 hover:bg-front hover:text-orange-500 hover:shadow-md"
              ]}
              aria-haspopup="menu"
              aria-expanded={checklistsMenuOpen.value}
              aria-label={translate(language.value, 'nav.checklists')}
              onClick$={() => {
                checklistsMenuOpen.value = !checklistsMenuOpen.value;
              }}
            >
              <Icon icon="checklist" class="transition-transform duration-200 group-hover:scale-110" width={16} height={16}  />
              {translate(language.value, 'nav.checklists')}
            </button>
            <ul
              class={[
                "absolute left-0 top-full z-50 mt-2 flex max-h-[calc(100vh-6rem)] w-72 flex-col gap-0.5 overflow-y-auto overflow-x-hidden rounded-box border border-base-300/40 bg-base-100 p-2 shadow-xl transition duration-150",
                checklistsMenuOpen.value
                  ? "pointer-events-auto visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible -translate-y-1 opacity-0"
              ]}
              role="menu"
            >
              {data.value.map((item: Section, index: number) => (
                <li key={`checklist-nav-${index}`} class="min-w-0">
                  <a
                    href={`/checklist/${item.slug}`}
                    class="checklist-item-hover group flex min-h-9 min-w-0 items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm leading-snug"
                    role="menuitem"
                    onClick$={() => {
                      checklistsMenuOpen.value = false;
                    }}
                  >
                    <Icon color={item.color} class="shrink-0 transition-transform duration-150 group-hover:scale-110" icon={item.icon} width={16} height={16}  />
                    <span class="min-w-0 break-words">{item.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div class="tooltip tooltip-bottom flex h-10 items-center" data-tip={translate(language.value, 'nav.theme')}>
            <button
              type="button"
              aria-label={translate(language.value, 'nav.theme')}
              aria-pressed={theme.theme === 'dark'}
              onClick$={() => {
                setTheme(theme.theme === 'dark' ? 'light' : 'dark');
              }}
              class="top-nav-action relative inline-flex h-10 w-[4.75rem] items-center justify-between rounded-full border border-base-content/10 bg-base-200/70 px-2 text-base-content shadow-inner transition hover:border-orange-400/50 hover:bg-front focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            >
              <span
                class={[
                  "absolute left-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-orange-400 text-slate-950 shadow-lg shadow-orange-500/20 transition-transform duration-200",
                  theme.theme === 'dark' ? "translate-x-8" : "translate-x-0"
                ]}
              >
                {theme.theme === 'dark' ? (
                  <svg class="stroke-current" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8z"/></svg>
                ) : (
                  <svg class="stroke-current" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                )}
              </span>
              <span class="h-6 w-6 rounded-full"></span>
              <span class="h-6 w-6 rounded-full"></span>
            </button>
          </div>
          <div class="tooltip tooltip-bottom" data-tip={translate(language.value, 'nav.settings')}>
            <button
              type="button"
              onClick$={() => ((document.getElementById('settings_modal') || {}) as HTMLDialogElement).showModal()}
              class="top-nav-action grid h-10 w-10 place-items-center rounded-full border border-base-content/10 bg-base-200/70 text-base-content shadow-inner transition hover:border-orange-400/50 hover:bg-front focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
              aria-label={translate(language.value, 'nav.settings')}
            >
              <Icon icon="settings" width={22} height={22}  />
            </button>
          </div>
          {activeUser.value && (
            <div class="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                class="soft-hover top-nav-action flex h-10 items-center gap-2 rounded-full border border-base-content/10 bg-front px-2 pr-3 shadow-sm"
              >
                <span class="top-nav-action-mark grid h-7 w-7 place-items-center rounded-full bg-orange-400 text-sm font-bold text-slate-950">
                  {activeUser.value.initials}
                </span>
                <span class="max-w-32 truncate text-sm font-semibold">{activeUser.value.name}</span>
              </button>
              <ul tabIndex={0} class="menu dropdown-content z-20 mt-2 w-56 rounded-box border border-base-300/40 bg-base-100 p-2 shadow-xl">
                <li class="menu-title">
                  <span>{translate(language.value, 'auth.activeUser')}</span>
                </li>
                <li>
                  <a href="/profile">
                    {translate(language.value, 'auth.profile')}
                  </a>
                </li>
                <li>
                  <button type="button" onClick$={logout}>
                    {translate(language.value, 'auth.logout')}
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div class="drawer-side z-10">
        <label for="my-drawer-3" aria-label="close sidebar" class="drawer-overlay"></label> 
        <ul class="rounded-box menu p-4 w-80 min-h-full bg-base-200">
          <h2 class="flex items-center text-primary text-lg font-semibold mb-2">
          <BrandLogo class="mr-2" size={24} />
            {brand.name}
          </h2>
          <li><a href="/"><Icon class="mr-2" icon="homepage" width={16} height={16}  />{translate(language.value, 'nav.home')}</a></li>
          {activeUser.value && (
            <li class="mb-2 rounded-box border border-base-content/10 bg-front p-3">
              <a href="/profile" class="flex items-center gap-2 p-0">
                <span class="grid h-8 w-8 place-items-center rounded-full bg-orange-400 text-sm font-bold text-slate-950">
                  {activeUser.value.initials}
                </span>
                <span class="truncate font-semibold">{activeUser.value.name}</span>
              </a>
            </li>
          )}
          <li>
            <a href="/checklist"><Icon class="mr-2" icon="all" width={16} height={16} />{translate(language.value, 'nav.checklists')}</a>
            <ul>
              {data.value.map((item: Section, index: number) => (
              <li key={`checklist-side-${index}`} class="soft-hover rounded-md">
                <a href={`/checklist/${item.slug}`}>
                <Icon color={item.color} class="mr-2" icon={item.icon} width={16} height={16}  />
                  {item.title}
                </a>
              </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>

      <dialog id="settings_modal" class="modal">
        <div class="modal-box w-[min(94vw,42rem)] max-w-2xl overflow-hidden rounded-box border border-base-content/10 bg-base-100 p-0 shadow-2xl">
          <div class="flex items-center justify-between gap-4 border-b border-base-content/10 bg-front px-5 py-4 sm:px-6">
            <div class="flex min-w-0 items-center gap-3">
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-orange-400/30 bg-orange-400/15 text-orange-500 shadow-inner">
                <Icon icon="settings" width={22} height={22} />
              </span>
              <h2 class="truncate text-2xl font-bold leading-none">{translate(language.value, 'settings.title')}</h2>
            </div>
            <form method="dialog">
              <button
                type="submit"
                class="btn btn-square btn-ghost soft-hover h-10 min-h-10 w-10 rounded-full border border-base-content/10"
                aria-label={translate(language.value, 'settings.close')}
              >
                <Icon icon="close" width={15} height={15} />
              </button>
            </form>
          </div>

          <div class="grid gap-3 px-5 py-5 sm:px-6">
            <label for="theme" class="grid gap-3 rounded-md border border-base-content/10 bg-front p-4 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)] sm:items-center">
              <span class="flex min-w-0 items-center gap-3 font-semibold">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-base-100 text-orange-500">
                  <Icon icon="settings" width={16} height={16} />
                </span>
                <span class="truncate">{translate(language.value, 'settings.theme')}</span>
              </span>
              <select
                id="theme"
                class="select select-bordered h-11 w-full min-w-0 bg-base-100"
                onChange$={(event) => setTheme((event.target as HTMLSelectElement).value) }
              >
                <option disabled selected>{translate(language.value, 'settings.theme')}</option>
                {themes.map((someTheme) => (
                  <option
                    key={someTheme}
                    value={someTheme}
                    selected={someTheme === theme.theme}
                  >
                    {someTheme.charAt(0).toUpperCase() + someTheme.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label for="language" class="grid gap-3 rounded-md border border-base-content/10 bg-front p-4 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)] sm:items-center">
              <span class="flex min-w-0 items-center gap-3 font-semibold">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-base-100 text-orange-500">
                  <Icon icon="browser" width={16} height={16} />
                </span>
                <span class="truncate">{translate(language.value, 'settings.language')}</span>
              </span>
              <select
                id="language"
                class="select select-bordered h-11 w-full min-w-0 bg-base-100"
                onChange$={(event) => changeLanguage((event.target as HTMLSelectElement).value as Language)}
              >
                {languages.map((someLanguage) => (
                  <option
                    key={someLanguage.code}
                    value={someLanguage.code}
                    selected={someLanguage.code === language.value}
                  >
                    {`${someLanguage.flag} ${someLanguage.nativeLabel}`}
                  </option>
                ))}
              </select>
            </label>

            <div class="grid gap-3 rounded-md border border-base-content/10 bg-front p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span class="flex min-w-0 items-center gap-3 font-semibold">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-base-100 text-error">
                  <Icon icon="trash" width={15} height={15} />
                </span>
                <span class="truncate">{translate(language.value, 'settings.data')}</span>
              </span>
              <button class="btn btn-error h-11 text-error-content sm:min-w-36" onClick$={deleteAllData}>
                <Icon icon="trash" width={14} height={14} />
                {translate(language.value, 'settings.deleteAll')}
              </button>
            </div>

            {activeUser.value && (
              <div class="mt-1 flex w-full flex-col gap-3 rounded-md border border-base-content/10 bg-base-100/45 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-400 text-sm font-bold text-slate-950 shadow-lg shadow-orange-500/20">
                    {activeUser.value.initials}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-semibold">{activeUser.value.name}</p>
                    <p class="text-xs opacity-60">{translate(language.value, 'auth.userScopedData')}</p>
                  </div>
                </div>
                <button class="btn btn-sm btn-ghost soft-hover border border-base-content/10" onClick$={logout}>
                  {translate(language.value, 'auth.logout')}
                </button>
              </div>
            )}
          </div>

          <div class="flex justify-end border-t border-base-content/10 bg-front px-5 py-4 sm:px-6">
            <form method="dialog">
              <button class="btn h-11 min-w-28" type="submit">
                {translate(language.value, 'settings.close')}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="submit" aria-label={translate(language.value, 'settings.close')}>
            {translate(language.value, 'settings.close')}
          </button>
        </form>
      </dialog>
    </>
  );
});
