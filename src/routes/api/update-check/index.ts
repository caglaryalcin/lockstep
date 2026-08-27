import type { RequestHandler } from "@builder.io/qwik-city";

import {
  LOCKSTEP_VERSION_NUMBER,
  compareStableVersions,
  normalizeStableVersion,
} from "~/lib/version";

const GITHUB_RELEASES_ENDPOINT = "https://api.github.com/repos/caglaryalcin/lockstep/releases?per_page=100";
const GITHUB_TAGS_ENDPOINT = "https://api.github.com/repos/caglaryalcin/lockstep/tags?per_page=100";
const RELEASE_PAGE_PREFIX = "https://github.com/caglaryalcin/lockstep/releases/tag/";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const SUCCESS_TTL_MS = 60 * 60 * 1_000;
const FAILURE_TTL_MS = 15 * 60 * 1_000;
const STALE_TTL_MS = 24 * 60 * 60 * 1_000;

type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  checkedAt: string;
  stale?: true;
};

type CachedResult = {
  value: UpdateCheckResult;
  expiresAt: number;
};

type SuccessfulResult = CachedResult & {
  staleUntil: number;
};

type GithubVersion = {
  version: string;
  tag: string;
  url: string;
  source: "release" | "tag";
};

let cachedResult: CachedResult | null = null;
let lastSuccessfulResult: SuccessfulResult | null = null;
let pendingCheck: Promise<UpdateCheckResult> | null = null;

export const onGet: RequestHandler = async ({ headers, json, request }) => {
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  const requestUrl = new URL(request.url);
  json(200, await updateCheck(requestUrl.searchParams.get("force") === "1"));
};

async function updateCheck(force = false): Promise<UpdateCheckResult> {
  const now = Date.now();
  if (!force && cachedResult && cachedResult.expiresAt > now) return cachedResult.value;
  if (!force && pendingCheck) return pendingCheck;

  const check = refreshUpdateCheck();
  pendingCheck = check;
  try {
    return await check;
  } finally {
    if (pendingCheck === check) pendingCheck = null;
  }
}

async function refreshUpdateCheck(): Promise<UpdateCheckResult> {
  try {
    const latest = await latestGithubVersion();
    const comparison = compareStableVersions(latest.version, LOCKSTEP_VERSION_NUMBER);
    if (comparison === null) throw new Error("The release tag is invalid.");

    const completedAt = Date.now();
    const value: UpdateCheckResult = {
      currentVersion: LOCKSTEP_VERSION_NUMBER,
      latestVersion: latest.version,
      updateAvailable: comparison > 0,
      releaseUrl: comparison > 0 ? latest.url : null,
      checkedAt: new Date(completedAt).toISOString(),
    };
    cachedResult = { value, expiresAt: completedAt + SUCCESS_TTL_MS };
    lastSuccessfulResult = {
      value,
      expiresAt: completedAt + SUCCESS_TTL_MS,
      staleUntil: completedAt + STALE_TTL_MS,
    };
    return value;
  } catch {
    const completedAt = Date.now();
    const fallback = lastSuccessfulResult && lastSuccessfulResult.staleUntil > completedAt
      ? { ...lastSuccessfulResult.value, stale: true as const }
      : {
          currentVersion: LOCKSTEP_VERSION_NUMBER,
          latestVersion: null,
          updateAvailable: false,
          releaseUrl: null,
          checkedAt: new Date(completedAt).toISOString(),
        };
    cachedResult = { value: fallback, expiresAt: completedAt + FAILURE_TTL_MS };
    return fallback;
  }
}

async function latestGithubVersion(): Promise<GithubVersion> {
  const releases = await githubJson(GITHUB_RELEASES_ENDPOINT).catch((error: unknown) => {
    if (isHttpError(error) && error.statusCode === 404) return [];
    throw error;
  });
  const release = highestStableVersion(
    Array.isArray(releases)
      ? releases.filter((item): item is Record<string, unknown> => (
          isRecord(item) && item.draft !== true && item.prerelease !== true
        ))
      : [],
    (item) => item.tag_name
  );

  if (release) {
    const version = normalizeStableVersion(release.tag_name);
    if (version) {
      const tag = String(release.tag_name);
      const htmlUrl = typeof release.html_url === "string" ? release.html_url : null;
      return {
        version,
        tag,
        url: htmlUrl || `${RELEASE_PAGE_PREFIX}${encodeURIComponent(tag)}`,
        source: "release",
      };
    }
  }

  const tags = await githubJson(GITHUB_TAGS_ENDPOINT);
  const tag = highestStableVersion(
    Array.isArray(tags) ? tags.filter(isRecord) : [],
    (item) => item.name
  );
  const version = normalizeStableVersion(tag?.name);
  if (!tag || !version) throw new Error("No GitHub release or tag found.");

  const tagName = String(tag.name);
  return {
    version,
    tag: tagName,
    url: `${RELEASE_PAGE_PREFIX}${encodeURIComponent(tagName)}`,
    source: "tag",
  };
}

async function githubJson(endpoint: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": `Lockstep-update-check/${LOCKSTEP_VERSION_NUMBER} (+https://github.com/caglaryalcin/lockstep)`,
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw Object.assign(new Error(`GitHub HTTP ${response.status}`), {
        statusCode: response.status,
      });
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("The release response is too large.");
    }

    return JSON.parse(await readLimitedText(response, MAX_RESPONSE_BYTES));
  } finally {
    clearTimeout(timeout);
  }
}

function highestStableVersion<T>(
  items: T[],
  versionOf: (item: T) => unknown
): T | null {
  return items.reduce<T | null>((highest, item) => {
    const version = normalizeStableVersion(versionOf(item));
    if (!version) return highest;
    if (!highest) return item;

    const comparison = compareStableVersions(version, versionOf(highest));
    return comparison === 1 ? item : highest;
  }, null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpError(value: unknown): value is Error & { statusCode: number } {
  return value instanceof Error && "statusCode" in value && typeof value.statusCode === "number";
}

async function readLimitedText(response: Response, maximumBytes: number): Promise<string> {
  if (!response.body) throw new Error("The release response is empty.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    let result = await reader.read();
    while (!result.done) {
      const value = result.value;

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("The release response is too large.");
      }
      chunks.push(value.slice());
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
