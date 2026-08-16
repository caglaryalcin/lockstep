import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { load as loadYaml } from 'js-yaml';

import { sanitizeUsername } from '~/lib/account';
import type { LockstepUser } from '~/lib/user-session';
import type { Sections } from '~/types/PSC';

type DemoSettings = Record<string, unknown>;

type DemoState = {
  epoch: string;
  settings: DemoSettings;
  user: LockstepUser;
  username: string;
};

type DemoSession = {
  epoch: string;
  expiresAt: number;
};

export class DemoEpochExpiredError extends Error {
  constructor() {
    super('Demo epoch expired');
    this.name = 'DemoEpochExpiredError';
  }
}

const demoCompletedItems = 195;
const demoSessionLifetimeMs = 8 * 60 * 60 * 1000;
const maxDemoSessions = 1024;
const maxTimerDelayMs = 2_147_483_647;
const defaultDemoResetTimeZone = 'Europe/Istanbul';
export const demoSessionCookie = 'LOCKSTEP_DEMO_SESSION';
const demoProfile = {
  device: 'mixed',
  focus: 'accounts',
  risk: 'high',
};
const demoProfileCreatedAt = '2026-01-01T00:00:00.000Z';

// These remain unfinished so the dashboard always has useful, high-impact
// examples in its priority actions section.
const openDemoActions = new Set([
  'use-a-strong-password',
  'enable-2-factor-authentication',
  'do-not-share-mfa-codes-or-approve-unexpected-prompts',
  'prefer-phishing-resistant-mfa',
  'keep-a-backup-security-key',
  'backup-important-data',
  'test-restores-and-keep-an-offline-backup',
  'educate-yourself-about-phishing-attacks',
]);

let demoState: DemoState | null = null;
let demoStateRequest: { epoch: string; promise: Promise<DemoState> } | null = null;
let demoSeedRequest: Promise<DemoSettings> | null = null;
let activeDemoDay = '';
let demoGeneration = 0;
let demoResetTimer: ReturnType<typeof setTimeout> | null = null;
const demoBootNonce = randomBytes(12).toString('base64url');
const demoSessions = new Map<string, DemoSession>();

const clone = <Value>(value: Value): Value =>
  value === undefined ? value : JSON.parse(JSON.stringify(value)) as Value;

const envFlagEnabled = (value: string | undefined) =>
  ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() || '');

const getDemoResetTimeZone = () =>
  process.env.LOCKSTEP_DEMO_RESET_TIMEZONE?.trim() || defaultDemoResetTimeZone;

const makeDayFormatter = (timeZone: string) => {
  try {
    return new Intl.DateTimeFormat('en', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    });
  } catch {
    throw new Error(`Invalid LOCKSTEP_DEMO_RESET_TIMEZONE: ${timeZone}`);
  }
};

const getDemoDay = (timestamp = Date.now()) => {
  const parts = makeDayFormatter(getDemoResetTimeZone()).formatToParts(timestamp);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const getNextDemoResetTimestamp = (timestamp = Date.now()) => {
  const currentDay = getDemoDay(timestamp);
  let low = timestamp;
  let high = timestamp + 30 * 60 * 60 * 1000;
  const searchLimit = timestamp + 72 * 60 * 60 * 1000;

  while (getDemoDay(high) === currentDay && high < searchLimit) {
    high += 6 * 60 * 60 * 1000;
  }

  if (getDemoDay(high) === currentDay) {
    throw new Error(`Unable to find the next demo reset in ${getDemoResetTimeZone()}`);
  }

  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (getDemoDay(middle) === currentDay) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return high;
};

const currentDemoEpoch = () =>
  `${activeDemoDay}.${demoBootNonce}.${demoGeneration}`;

const scheduleDemoReset = () => {
  if (!isDemoMode()) return;
  if (demoResetTimer) clearTimeout(demoResetTimer);

  const delay = Math.min(
    Math.max(getNextDemoResetTimestamp() - Date.now() + 25, 1),
    maxTimerDelayMs
  );
  demoResetTimer = setTimeout(() => {
    demoResetTimer = null;
    ensureCurrentDemoDay();
    scheduleDemoReset();
  }, delay);
  demoResetTimer.unref();
};

const ensureCurrentDemoDay = (timestamp = Date.now()) => {
  const day = getDemoDay(timestamp);
  if (day !== activeDemoDay) {
    activeDemoDay = day;
    demoGeneration += 1;
    demoState = null;
    demoStateRequest = null;
    demoSessions.clear();
    scheduleDemoReset();
  } else if (!demoResetTimer) {
    scheduleDemoReset();
  }

  return currentDemoEpoch();
};

const makeItemId = (point: string) => point.toLowerCase().replace(/\s+/g, '-');

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
};

const makeDemoUser = (username: string): LockstepUser => ({
  createdAt: demoProfileCreatedAt,
  id: username,
  initials: 'DU',
  lastSeen: demoProfileCreatedAt,
  name: 'Demo User',
  username,
});

const makeDemoProgress = (sections: Sections) => {
  const itemCounts = new Map<string, number>();

  sections.forEach((section) => {
    section.checklist.forEach((item) => {
      const id = item.id || makeItemId(item.point);
      itemCounts.set(id, (itemCounts.get(id) || 0) + 1);
    });
  });

  const totalItems = [...itemCounts.values()].reduce((total, count) => total + count, 0);
  const target = Math.min(demoCompletedItems, totalItems);
  const candidates = [...itemCounts.entries()]
    // Duplicate point ids share one dashboard storage key. Leaving those open
    // keeps both the stored-key count and the rendered completed-item count at 195.
    .filter(([id, count]) => count === 1 && !openDemoActions.has(id))
    .sort(([left], [right]) => stableHash(left) - stableHash(right) || left.localeCompare(right));
  const progress: Record<string, boolean> = {};
  let completed = 0;

  candidates.forEach(([id, count]) => {
    if (completed + count <= target) {
      progress[id] = true;
      completed += count;
    }
  });

  return progress;
};

const loadDemoSeed = async (): Promise<DemoSettings> => {
  const checklistPath = resolve(process.cwd(), 'personal-security-checklist.yml');
  const parsed = loadYaml(await readFile(checklistPath, 'utf-8'));

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid checklist data from ${checklistPath}`);
  }

  return {
    PSC_CLOSE_WELCOME: true,
    PSC_IGNORED: {},
    PSC_PROFILE: demoProfile,
    PSC_PROGRESS: makeDemoProgress(parsed as Sections),
    PSC_THEME: 'dark',
  };
};

const getDemoSeed = async () => {
  demoSeedRequest ||= loadDemoSeed().catch((error) => {
    demoSeedRequest = null;
    throw error;
  });
  return clone(await demoSeedRequest);
};

const loadDemoState = async (username: string, epoch: string): Promise<DemoState> => {
  const user = makeDemoUser(username);
  return {
    epoch,
    settings: {
      ...(await getDemoSeed()),
      PSC_USER_PROFILE: user,
    },
    user,
    username,
  };
};

const getDemoState = async () => {
  for (;;) {
    const epoch = ensureCurrentDemoDay();
    const { username } = getDemoCredentials();

    if (demoState?.username === username && demoState.epoch === epoch) {
      return demoState;
    }

    if (!demoStateRequest || demoStateRequest.epoch !== epoch) {
      const promise = loadDemoState(username, epoch)
        .then((state) => {
          if (ensureCurrentDemoDay() === epoch) {
            demoState = state;
          }
          return state;
        })
        .finally(() => {
          if (demoStateRequest?.promise === promise) {
            demoStateRequest = null;
          }
        });
      demoStateRequest = { epoch, promise };
    }

    const state = await demoStateRequest.promise;
    if (state.epoch === ensureCurrentDemoDay()) {
      return state;
    }
  }
};

const getDemoStateForEpoch = async (expectedEpoch?: string) => {
  const state = await getDemoState();
  if (
    expectedEpoch !== undefined &&
    (state.epoch !== expectedEpoch || ensureCurrentDemoDay() !== expectedEpoch)
  ) {
    throw new DemoEpochExpiredError();
  }
  return state;
};

const pruneDemoSessions = (now = Date.now()) => {
  const epoch = ensureCurrentDemoDay(now);
  demoSessions.forEach((session, token) => {
    if (session.expiresAt <= now || session.epoch !== epoch) {
      demoSessions.delete(token);
    }
  });

  while (demoSessions.size >= maxDemoSessions) {
    const oldestToken = demoSessions.keys().next().value;
    if (!oldestToken) break;
    demoSessions.delete(oldestToken);
  }
};

export const isDemoMode = () => envFlagEnabled(process.env.LOCKSTEP_DEMO_MODE);

export const getDemoResetInfo = () => {
  const timestamp = Date.now();
  const epoch = ensureCurrentDemoDay(timestamp);
  return {
    epoch,
    nextResetAt: new Date(getNextDemoResetTimestamp(timestamp)).toISOString(),
    serverTime: new Date(timestamp).toISOString(),
    timeZone: getDemoResetTimeZone(),
  };
};

export const getDemoCredentials = () => {
  const username = sanitizeUsername(process.env.LOCKSTEP_DEMO_USER ?? 'demo');
  const configuredPassword = process.env.LOCKSTEP_DEMO_PASSWORD;

  if (username.length < 3) {
    throw new Error('LOCKSTEP_DEMO_USER must contain at least 3 valid characters');
  }
  if (
    configuredPassword !== undefined &&
    configuredPassword.length < 6 &&
    !(username === 'demo' && configuredPassword === 'demo')
  ) {
    throw new Error('LOCKSTEP_DEMO_PASSWORD must contain at least 6 characters');
  }

  const password = configuredPassword ?? 'demo';

  return {
    defaultCredentials: username === 'demo' && password === 'demo',
    password,
    username,
  };
};

export const createDemoSession = () => {
  pruneDemoSessions();
  const token = randomBytes(32).toString('base64url');
  demoSessions.set(token, {
    epoch: ensureCurrentDemoDay(),
    expiresAt: Date.now() + demoSessionLifetimeMs,
  });
  return token;
};

export const getDemoSessionEpoch = (token: string | null | undefined) => {
  if (!token) return null;
  const epoch = ensureCurrentDemoDay();
  const session = demoSessions.get(token);
  if (!session || session.expiresAt <= Date.now() || session.epoch !== epoch) {
    demoSessions.delete(token);
    return null;
  }
  return session.epoch;
};

export const hasDemoSession = (token: string | null | undefined) =>
  Boolean(getDemoSessionEpoch(token));

export const revokeDemoSession = (token: string | null | undefined) => {
  if (token) {
    demoSessions.delete(token);
  }
};

export const readDemoSettings = async (
  expectedEpoch?: string
): Promise<DemoSettings> =>
  clone((await getDemoStateForEpoch(expectedEpoch)).settings);

export const readDemoUserProfile = async (): Promise<LockstepUser> =>
  clone((await getDemoState()).user);

export const authenticateDemoUser = async (
  username: string,
  password: string
): Promise<LockstepUser> => {
  const credentials = getDemoCredentials();
  if (sanitizeUsername(username) !== credentials.username || password !== credentials.password) {
    throw new Error('Invalid credentials');
  }

  for (;;) {
    const state = await getDemoState();
    if (state.epoch === ensureCurrentDemoDay()) {
      state.user.lastSeen = new Date().toISOString();
      state.settings.PSC_USER_PROFILE = clone(state.user);
      return clone(state.user);
    }
  }
};

export const setDemoSetting = async (
  key: string,
  value: unknown,
  expectedEpoch: string
): Promise<DemoSettings> => {
  const state = await getDemoStateForEpoch(expectedEpoch);

  if (key === 'PSC_USER_PROFILE') {
    state.settings.PSC_USER_PROFILE = clone(state.user);
    return clone(state.settings);
  }

  state.settings[key] = clone(value);

  return clone(state.settings);
};

export const clearDemoSettings = async (expectedEpoch: string): Promise<void> => {
  const state = await getDemoStateForEpoch(expectedEpoch);
  state.settings = { PSC_USER_PROFILE: clone(state.user) };
};
