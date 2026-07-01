
import { $, component$, useContext, useSignal, useVisibleTask$ } from "@builder.io/qwik";
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
  const deleteConfirmMessage = translate(language.value, 'settings.confirmDelete');

  useVisibleTask$(() => {
    activeUser.value = getStoredUser();
  });

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
            <label for="my-drawer-3" aria-label="open sidebar" class="btn btn-square btn-ghost soft-hover">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </label>
          </div> 
          <a href="/" class="btn btn-ghost soft-hover h-14 border border-transparent px-2 text-2xl font-semibold flex capitalize">
            <span class="tooltip tooltip-bottom" data-tip={translate(language.value, 'nav.viewAllPages')}>
              <BrandLogo class="mr-2" size={36} />
            </span>
            <h1>{brand.name}</h1>
          </a>
        </div>
        <div class="ml-auto flex-none hidden md:flex items-center gap-2">
          <ul class="menu menu-horizontal p-0">
            <li>
              <details>
                <summary class="soft-hover h-10 min-h-10 rounded-btn border border-transparent px-3 font-semibold text-base-content">
                  <Icon icon="checklist" width={16} height={16}  />
                  {translate(language.value, 'nav.checklists')}
                </summary>
                <ul class="p-2 bg-base-100 rounded-t-none z-10">
                  {data.value.map((item: Section, index: number) => (
                    <li key={`checklist-nav-${index}`} class="soft-hover rounded-md">
                      <a href={`/checklist/${item.slug}`}>
                      <Icon color={item.color} class="mr-2" icon={item.icon} width={16} height={16}  />
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          </ul>
          <div class="tooltip tooltip-bottom flex h-10 items-center" data-tip={translate(language.value, 'nav.theme')}>
            <button
              type="button"
              aria-label={translate(language.value, 'nav.theme')}
              aria-pressed={theme.theme === 'dark'}
              onClick$={() => {
                setTheme(theme.theme === 'dark' ? 'light' : 'dark');
              }}
              class="relative inline-flex h-10 w-[4.75rem] items-center justify-between rounded-full border border-base-content/10 bg-base-200/70 px-2 text-base-content shadow-inner transition hover:border-orange-400/50 hover:bg-front focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
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
              class="grid h-10 w-10 place-items-center rounded-full border border-base-content/10 bg-base-200/70 text-base-content shadow-inner transition hover:border-orange-400/50 hover:bg-front focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
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
                class="soft-hover flex h-10 items-center gap-2 rounded-full border border-base-content/10 bg-front px-2 pr-3 shadow-sm"
              >
                <span class="grid h-7 w-7 place-items-center rounded-full bg-orange-400 text-sm font-bold text-slate-950">
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
        <div class="modal-box">
          <div class="tabs tabs-lifted">
            <p class="tab tab-active">{translate(language.value, 'settings.title')}</p>
          </div>
          <div class="modal-action justify-start w-full flex flex-col gap-4">
              <div class="flex items-between w-full justify-between">
                <label for="theme" class="label">{translate(language.value, 'settings.theme')}</label>
                <select 
                  id="theme" 
                  class="select select-bordered w-full max-w-xs"
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
              </div>
              <div class="flex items-between w-full justify-between">
                <label for="language" class="label">{translate(language.value, 'settings.language')}</label>
                <select
                  id="language"
                  class="select select-bordered w-full max-w-xs"
                  onChange$={(event) => changeLanguage((event.target as HTMLSelectElement).value as Language)}
                >
                  {languages.map((someLanguage) => (
                    <option
                      key={someLanguage.code}
                      value={someLanguage.code}
                      selected={someLanguage.code === language.value}
                    >
                      {someLanguage.nativeLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div class="flex items-between w-full justify-between">
                <label class="label">{translate(language.value, 'settings.data')}</label>
                <button class="btn btn-primary" onClick$={deleteAllData}>{translate(language.value, 'settings.deleteAll')}</button>
              </div>
              {activeUser.value && (
                <div class="rounded-box flex w-full items-center justify-between border border-base-300/50 bg-base-100/45 p-3">
                  <div>
                    <p class="font-semibold">{activeUser.value.name}</p>
                    <p class="text-xs opacity-60">{translate(language.value, 'auth.userScopedData')}</p>
                  </div>
                  <button class="btn btn-sm btn-ghost soft-hover border border-transparent" onClick$={logout}>
                    {translate(language.value, 'auth.logout')}
                  </button>
                </div>
              )}
              <button
                class="btn my-1 mx-auto"
                onClick$={() => ((document.getElementById('settings_modal') || {}) as HTMLDialogElement).close()}
              >{translate(language.value, 'settings.close')}</button>
            </div>
        </div>
      </dialog>
    </>
  );
});
