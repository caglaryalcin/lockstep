import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";

import Icon from "~/components/core/icon";
import { translate, useI18n } from "~/i18n";
import {
  LOCKSTEP_VERSION,
  LOCKSTEP_VERSION_NUMBER,
  compareStableVersions,
  normalizeStableVersion,
} from "~/lib/version";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1_000;
const REPOSITORY_URL = "https://github.com/caglaryalcin/lockstep";
const ISSUES_URL = `${REPOSITORY_URL}/issues/new`;
const RELEASE_PAGE_PREFIX = `${REPOSITORY_URL}/releases/tag/`;

type AvailableUpdate = {
  version: string;
  url: string;
};

export default component$(() => {
  const { language } = useI18n();
  const availableUpdate = useSignal<AvailableUpdate | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    let active = true;
    let lastCheckedAt = 0;
    let requestController: AbortController | null = null;

    const checkForUpdate = async () => {
      if (requestController) return;

      const controller = new AbortController();
      requestController = controller;
      lastCheckedAt = Date.now();

      try {
        const response = await fetch("/api/update-check", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        if (!active || !isRecord(payload)) return;

        const latestVersion = normalizeStableVersion(payload.latestVersion);
        const comparison = compareStableVersions(latestVersion, LOCKSTEP_VERSION_NUMBER);
        if (!latestVersion || comparison === null) return;

        if (comparison <= 0) {
          availableUpdate.value = null;
          return;
        }

        availableUpdate.value = {
          version: latestVersion,
          url: typeof payload.releaseUrl === "string"
            ? payload.releaseUrl
            : `${RELEASE_PAGE_PREFIX}v${latestVersion}`,
        };
      } catch {
        // Keep a previously verified update visible if a later refresh fails.
      } finally {
        if (requestController === controller) requestController = null;
      }
    };

    const initialCheck = window.setTimeout(() => void checkForUpdate(), 1_000);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastCheckedAt >= UPDATE_CHECK_INTERVAL_MS
      ) {
        void checkForUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    cleanup(() => {
      active = false;
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      requestController?.abort();
    });
  });

  return (
    <footer class="fixed inset-x-0 bottom-0 z-40 border-t border-base-content/10 bg-base-100/90 px-4 py-1 text-base-content/55 shadow-[0_-8px_24px_rgb(0_0_0_/_0.12)] backdrop-blur">
      <div class="mx-auto flex min-h-6 w-full max-w-7xl items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <span
            class="shrink-0"
            aria-label={translate(language.value, "footer.versionAria", {
              version: LOCKSTEP_VERSION_NUMBER,
            })}
          >
            {LOCKSTEP_VERSION}
          </span>
          {availableUpdate.value ? (
            <>
              <span class="opacity-50" aria-hidden="true">·</span>
              <a
                class="min-w-0 truncate text-xs font-bold text-orange-500 underline-offset-2 transition hover:text-orange-400 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
                href={availableUpdate.value.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={translate(language.value, "footer.updateAria", {
                  version: availableUpdate.value.version,
                })}
                title={translate(language.value, "footer.updateAvailable", {
                  version: availableUpdate.value.version,
                })}
              >
                {translate(language.value, "footer.updateAvailable", {
                  version: availableUpdate.value.version,
                })}
              </a>
            </>
          ) : null}
          <span class="opacity-50" aria-hidden="true">·</span>
          <span class="shrink-0">
            {translate(language.value, "footer.license")} CC-BY-4.0
          </span>
        </div>

        <nav
          class="flex shrink-0 items-center gap-1"
          aria-label={translate(language.value, "footer.links")}
        >
          <a
            class="tooltip tooltip-top grid h-6 w-6 place-items-center rounded-md border border-transparent text-base-content/55 transition hover:border-orange-400/40 hover:bg-front hover:text-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={translate(language.value, "footer.github")}
            data-tip="GitHub"
            title={translate(language.value, "footer.github")}
          >
            <Icon icon="github" width={13} height={13} />
          </a>
          <a
            class="tooltip tooltip-top grid h-6 w-6 place-items-center rounded-md border border-transparent text-base-content/55 transition hover:border-orange-400/40 hover:bg-front hover:text-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={translate(language.value, "footer.issue")}
            data-tip={translate(language.value, "footer.issue")}
            title={translate(language.value, "footer.issue")}
          >
            <span class="grid h-3.5 w-3.5 place-items-center rounded-full border border-current text-[9px] font-bold leading-none">
              ?
            </span>
          </a>
        </nav>
      </div>
    </footer>
  );
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
