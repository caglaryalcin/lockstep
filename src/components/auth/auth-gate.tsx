import { $, component$, Slot, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";

import { brand } from "~/brand";
import BrandLogo from "~/components/furniture/brand-logo";
import { translate, useI18n, type TranslationKey } from "~/i18n";
import { sanitizeUsername } from "~/lib/account";
import {
  clearCurrentUserLocalSettings,
  clearStoredUser,
  getStoredUser,
  saveStoredUser,
  type LockstepUser,
} from "~/lib/user-session";
import { useDemoModeContext } from "~/store/demo-context";

const demoEpochStorageKey = "LOCKSTEP_DEMO_EPOCH";
const demoRefreshNoticeKey = "LOCKSTEP_DEMO_REFRESHED";

export default component$(() => {
  const { language } = useI18n();
  const demoMode = useDemoModeContext();
  const user = useSignal<LockstepUser | null>(null);
  const authReady = useSignal(false);
  const mode = useSignal<"login" | "register">("login");
  const registrationEnabled = useSignal(!demoMode.value);
  const demoDefaultCredentials = useSignal(false);
  const demoRefreshNotice = useSignal(false);
  const demoSessionExpiredNotice = useSignal(false);
  const username = useSignal("");
  const password = useSignal("");
  const form = useStore({ name: "", error: "" });
  const summaryCards: { labelKey: TranslationKey; value: string }[] = [
    { labelKey: "auth.cardProgress", value: "312+" },
    {
      labelKey: demoMode.value ? "demo.cardMemory" : "auth.cardPrivate",
      value: demoMode.value
        ? "RAM"
        : translate(language.value, "auth.cardPrivateValue"),
    },
    {
      labelKey: "auth.cardProfile",
      value: translate(language.value, "auth.cardProfileValue"),
    },
  ];

  useVisibleTask$(({ cleanup }) => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const storedUser = getStoredUser();
    if (storedUser && !demoMode.value) {
      saveStoredUser(storedUser);
      user.value = storedUser;
    }
    if (!demoMode.value) {
      authReady.value = true;
    }

    void fetch("/api/auth")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result?.demo === true) {
          const epoch = typeof result.demoEpoch === "string" ? result.demoEpoch : "";
          const previousEpoch = localStorage.getItem(demoEpochStorageKey);
          if (epoch && previousEpoch && epoch !== previousEpoch) {
            clearCurrentUserLocalSettings();
            document.cookie = "PSC_LANGUAGE=; path=/; max-age=0; SameSite=Lax";
            sessionStorage.setItem(demoRefreshNoticeKey, "true");
          }
          if (epoch) {
            localStorage.setItem(demoEpochStorageKey, epoch);
          }

          if (sessionStorage.getItem(demoRefreshNoticeKey) === "true") {
            demoRefreshNotice.value = true;
            sessionStorage.removeItem(demoRefreshNoticeKey);
          }

          const nextResetAt = Date.parse(result.demoNextResetAt);
          const serverTime = Date.parse(result.demoServerTime);
          if (Number.isFinite(nextResetAt) && Number.isFinite(serverTime)) {
            resetTimer = setTimeout(() => {
              sessionStorage.setItem(demoRefreshNoticeKey, "true");
              location.reload();
            }, Math.max(nextResetAt - serverTime + 250, 1));
          }

          if (result.authenticated === true && storedUser) {
            saveStoredUser(storedUser);
            user.value = storedUser;
          } else {
            if (storedUser && epoch && previousEpoch === epoch) {
              demoSessionExpiredNotice.value = true;
            }
            clearStoredUser();
            user.value = null;
          }
        }

        if (result?.registrationEnabled === false) {
          registrationEnabled.value = false;
          mode.value = "login";
        }

        if (result?.demoDefaultCredentials === true) {
          demoDefaultCredentials.value = true;
          mode.value = "login";
          if (!username.value && !password.value) {
            username.value = "demo";
            password.value = "demo";
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        authReady.value = true;
      });

    cleanup(() => {
      if (resetTimer) clearTimeout(resetTimer);
    });
  });

  const submit = $(async () => {
    const cleanUsername = sanitizeUsername(username.value);
    const submittedPassword = password.value;
    const name = form.name.trim() || cleanUsername;

    if (cleanUsername.length < 3) {
      form.error = translate(language.value, "auth.usernameError");
      return;
    }

    const minimumPasswordLength = demoMode.value && mode.value === "login" ? 1 : 6;
    if (submittedPassword.length < minimumPasswordLength) {
      form.error = translate(
        language.value,
        demoMode.value && mode.value === "login"
          ? "auth.demoPasswordError"
          : "auth.passwordError"
      );
      return;
    }

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode.value,
        username: cleanUsername,
        password: submittedPassword,
        name,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const result = await response?.json().catch(() => null);
      form.error = mode.value === "register"
        ? result?.error === "REGISTRATION_DISABLED"
          ? translate(language.value, "auth.registrationDisabled")
          : result?.error === "INVALID_INPUT"
            ? translate(language.value, "auth.usernameError")
            : translate(language.value, "auth.registerError")
        : translate(language.value, "auth.loginError");
      return;
    }

    const result = await response.json();
    if (!result?.user) {
      form.error = translate(language.value, "auth.loginError");
      return;
    }

    saveStoredUser(result.user);

    location.reload();
  });

  if (user.value) {
    return <Slot />;
  }

  if (!authReady.value) {
    return <main class="min-h-screen bg-base-100 text-base-content" aria-hidden="true" />;
  }

  return (
    <main class="min-h-screen bg-base-100 px-4 py-6 text-base-content">
      <div class="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section class={[
          "space-y-8",
          demoMode.value ? "order-2 lg:order-1" : "",
        ]}>
          <a href="/" class="inline-flex items-center gap-3 rounded-full border border-base-content/10 bg-front px-4 py-3 shadow-md">
            <BrandLogo size={38} />
            <span class="text-2xl font-bold">{brand.name}</span>
          </a>

          <div class="max-w-2xl">
            <p class="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
              {translate(language.value, "auth.eyebrow")}
            </p>
            <h1 class="text-5xl font-bold leading-none sm:text-6xl">
              {translate(
                language.value,
                demoMode.value ? "demo.heroTitle" : "auth.title"
              )}
            </h1>
            <p class="mt-5 max-w-xl text-lg opacity-75">
              {translate(
                language.value,
                demoMode.value ? "demo.heroBody" : "auth.subtitle"
              )}
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            {summaryCards.map(({ labelKey, value }) => (
              <div key={labelKey} class="rounded-box border border-base-300/40 bg-front p-4 shadow-md">
                <p class="text-2xl font-bold text-primary">{value}</p>
                <p class="mt-1 text-sm opacity-70">{translate(language.value, labelKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section class={[
          "rounded-box border border-base-300/40 bg-front p-6 shadow-xl",
          demoMode.value ? "order-1 lg:order-2" : "",
        ]}>
          <div class="mx-auto mb-6 w-full max-w-md">
            <h2 class="text-3xl font-bold">
              {translate(
                language.value,
                demoMode.value ? "demo.panelTitle" : "auth.panelTitle"
              )}
            </h2>
            <p class="mt-2 text-sm opacity-70">
              {translate(
                language.value,
                demoMode.value ? "demo.panelBody" : "auth.panelSubtitle"
              )}
            </p>
          </div>

          {demoMode.value && (
            <div
              class="mx-auto mb-5 w-full max-w-md rounded-box border border-orange-400/35 bg-orange-400/10 p-4"
              role="note"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge border-orange-400 bg-orange-400 font-semibold uppercase tracking-wide text-slate-950">
                  {translate(language.value, "demo.badge")}
                </span>
                <p class="font-semibold">{translate(language.value, "demo.authTitle")}</p>
              </div>
              <p class="mt-2 text-sm opacity-75">{translate(language.value, "demo.authBody")}</p>
              {demoRefreshNotice.value && (
                <p class="mt-3 rounded-md bg-success/15 px-3 py-2 text-sm font-semibold" role="status">
                  {translate(language.value, "demo.refreshComplete")}
                </p>
              )}
              {demoSessionExpiredNotice.value && (
                <p class="mt-3 rounded-md bg-warning/15 px-3 py-2 text-sm font-semibold" role="status">
                  {translate(language.value, "demo.sessionExpired")}
                </p>
              )}
              {demoDefaultCredentials.value && (
                <p class="mt-3 text-sm font-semibold">
                  {translate(language.value, "demo.defaultCredentials")}{" "}
                  <code class="rounded bg-base-100/70 px-2 py-1 text-xs">demo / demo</code>
                </p>
              )}
            </div>
          )}

          {registrationEnabled.value && (
            <div class="mx-auto mb-5 grid w-full max-w-md grid-cols-2 rounded-full border border-base-content/10 bg-base-100/60 p-1">
              <button
                type="button"
                class={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode.value === "login"
                    ? "bg-orange-400 text-slate-950 shadow"
                    : "opacity-70",
                ]}
                onClick$={() => {
                  mode.value = "login";
                  form.error = "";
                }}
              >
                {translate(language.value, "auth.loginTab")}
              </button>
              <button
                type="button"
                class={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode.value === "register" ? "bg-orange-400 text-slate-950 shadow" : "opacity-70"
                ]}
                onClick$={() => {
                  mode.value = "register";
                  form.error = "";
                }}
              >
                {translate(language.value, "auth.registerTab")}
              </button>
            </div>
          )}

          {!registrationEnabled.value && !demoMode.value && (
            <p class="mx-auto mb-5 w-full max-w-md text-sm opacity-70">
              {translate(language.value, "auth.registrationDisabled")}
            </p>
          )}

          <form
            preventdefault:submit
            class="mx-auto w-full max-w-md space-y-4"
            onSubmit$={submit}
          >
            <label class="block">
              <span class="mb-2 block text-sm font-semibold">{translate(language.value, "auth.usernameLabel")}</span>
              <input
                class="input input-bordered h-12 w-full bg-base-100"
                type="text"
                autocomplete="username"
                placeholder={translate(language.value, "auth.usernamePlaceholder")}
                value={username.value}
                onInput$={(event) => {
                  username.value = (event.target as HTMLInputElement).value;
                  form.error = "";
                }}
              />
            </label>

            {mode.value === "register" && (
              <label class="block">
                <span class="mb-2 block text-sm font-semibold">{translate(language.value, "auth.nameLabel")}</span>
                <input
                  class="input input-bordered h-12 w-full bg-base-100"
                  type="text"
                  autocomplete="name"
                  placeholder={translate(language.value, "auth.namePlaceholder")}
                  value={form.name}
                  onInput$={(event) => {
                    form.name = (event.target as HTMLInputElement).value;
                    form.error = "";
                  }}
                />
              </label>
            )}

            <label class="block">
              <span class="mb-2 block text-sm font-semibold">{translate(language.value, "auth.passwordLabel")}</span>
              <input
                class="input input-bordered h-12 w-full bg-base-100"
                type="password"
                autocomplete={mode.value === "login" ? "current-password" : "new-password"}
                placeholder={translate(
                  language.value,
                  demoMode.value && mode.value === "login"
                    ? "auth.demoPasswordPlaceholder"
                    : "auth.passwordPlaceholder"
                )}
                value={password.value}
                onInput$={(event) => {
                  password.value = (event.target as HTMLInputElement).value;
                  form.error = "";
                }}
              />
            </label>

            {form.error && (
              <p class="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {form.error}
              </p>
            )}

            <button class="btn btn-primary h-12 w-full text-base" type="submit">
              {mode.value === "login"
                ? translate(language.value, "auth.login")
                : translate(language.value, "auth.register")}
            </button>
          </form>

          <div class="mx-auto mt-6 w-full max-w-md rounded-box border border-base-content/10 bg-base-100/45 p-4">
            <p class="text-sm font-semibold">
              {translate(
                language.value,
                demoMode.value
                  ? "demo.afterLoginTitle"
                  : "auth.afterLoginTitle"
              )}
            </p>
            <p class="mt-1 text-sm opacity-70">
              {translate(
                language.value,
                demoMode.value
                  ? "demo.afterLoginBody"
                  : "auth.afterLoginBody"
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
});
