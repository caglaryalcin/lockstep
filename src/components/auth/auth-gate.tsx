import { $, component$, Slot, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";

import { brand } from "~/brand";
import BrandLogo from "~/components/furniture/brand-logo";
import { translate, useI18n, type TranslationKey } from "~/i18n";
import { sanitizeUsername } from "~/lib/account";
import {
  getStoredUser,
  saveStoredUser,
  type LockstepUser,
} from "~/lib/user-session";

export default component$(() => {
  const { language } = useI18n();
  const user = useSignal<LockstepUser | null>(null);
  const authReady = useSignal(false);
  const mode = useSignal<"login" | "register">("login");
  const form = useStore({ username: "", password: "", name: "", error: "" });
  const summaryCards: { labelKey: TranslationKey; value: string }[] = [
    { labelKey: "auth.cardProgress", value: "312+" },
    { labelKey: "auth.cardPrivate", value: "Local" },
    { labelKey: "auth.cardProfile", value: "User" },
  ];

  useVisibleTask$(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      saveStoredUser(storedUser);
      user.value = storedUser;
    }
    authReady.value = true;
  });

  const submit = $(async () => {
    const username = sanitizeUsername(form.username);
    const password = form.password;
    const name = form.name.trim() || username;

    if (username.length < 3) {
      form.error = translate(language.value, "auth.usernameError");
      return;
    }

    if (password.length < 6) {
      form.error = translate(language.value, "auth.passwordError");
      return;
    }

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode.value,
        username,
        password,
        name,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const result = await response?.json().catch(() => null);
      form.error = mode.value === "register" && result?.error === "INVALID_INPUT"
        ? translate(language.value, "auth.usernameError")
        : mode.value === "register"
          ? translate(language.value, "auth.registerError")
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
        <section class="space-y-8">
          <a href="/" class="inline-flex items-center gap-3 rounded-full border border-base-content/10 bg-front px-4 py-3 shadow-md">
            <BrandLogo size={38} />
            <span class="text-2xl font-bold">{brand.name}</span>
          </a>

          <div class="max-w-2xl">
            <p class="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
              {translate(language.value, "auth.eyebrow")}
            </p>
            <h1 class="text-5xl font-bold leading-none sm:text-6xl">
              {translate(language.value, "auth.title")}
            </h1>
            <p class="mt-5 max-w-xl text-lg opacity-75">
              {translate(language.value, "auth.subtitle")}
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

        <section class="rounded-box border border-base-300/40 bg-front p-6 shadow-xl">
          <div class="mx-auto mb-6 w-full max-w-md">
            <h2 class="text-3xl font-bold">{translate(language.value, "auth.panelTitle")}</h2>
            <p class="mt-2 text-sm opacity-70">{translate(language.value, "auth.panelSubtitle")}</p>
          </div>

          <div class="mx-auto mb-5 grid w-full max-w-md grid-cols-2 rounded-full border border-base-content/10 bg-base-100/60 p-1">
            <button
              type="button"
              class={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                mode.value === "login" ? "bg-orange-400 text-slate-950 shadow" : "opacity-70"
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
                value={form.username}
                onInput$={(event) => {
                  form.username = (event.target as HTMLInputElement).value;
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
                placeholder={translate(language.value, "auth.passwordPlaceholder")}
                value={form.password}
                onInput$={(event) => {
                  form.password = (event.target as HTMLInputElement).value;
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
            <p class="text-sm font-semibold">{translate(language.value, "auth.afterLoginTitle")}</p>
            <p class="mt-1 text-sm opacity-70">{translate(language.value, "auth.afterLoginBody")}</p>
          </div>
        </section>
      </div>
    </main>
  );
});
