import type { RequestHandler } from "@builder.io/qwik-city";

import { defaultLanguage, isLanguage } from "~/i18n";

export const onGet: RequestHandler = async ({ cookie, query, redirect }) => {
  const language = query.get("lang");
  const nextLanguage = isLanguage(language) ? language : defaultLanguage;
  const returnTo = query.get("returnTo") || "/";

  cookie.set("PSC_LANGUAGE", nextLanguage, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  throw redirect(302, returnTo.startsWith("/") ? returnTo : "/");
};
