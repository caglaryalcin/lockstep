import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { LockstepUser } from '~/lib/user-session';

export type SettingsStore = Record<string, unknown>;

type UserSettings = {
  credentials?: {
    passwordHash: string;
    passwordIterations: number;
    passwordSalt: string;
  };
  profile?: unknown;
  settings: SettingsStore;
};

type SettingsDocument = {
  version: 2;
  users: Record<string, UserSettings>;
};

const SETTINGS_FILE =
  process.env.PSC_SETTINGS_FILE ||
  resolve(process.cwd(), '.data', 'settings.json');

let writeQueue: Promise<void> = Promise.resolve();
const pbkdf2Async = promisify(pbkdf2);
const passwordIterations = 210000;

const parseSettings = (value: string): SettingsStore => {
  const parsed = JSON.parse(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed
    : {};
};

const sanitizeUserId = (userId: string | null | undefined) => {
  const cleanId = (userId || 'guest')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 64);

  return cleanId || 'guest';
};

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

const makeInitials = (name: string) => {
  const parts = normalizeName(name).split(' ').filter(Boolean);
  const letters = parts.length > 1
    ? [parts[0], parts[parts.length - 1]]
    : [parts[0] || 'U'];

  return letters
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

export const sanitizeUsername = (username: string | null | undefined) =>
  (username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);

const makeUserProfile = (
  username: string,
  name: string,
  existingProfile?: Partial<LockstepUser>
): LockstepUser => {
  const cleanName = normalizeName(name) || username;
  const now = new Date().toISOString();

  return {
    id: username,
    username,
    name: cleanName,
    initials: makeInitials(cleanName),
    createdAt: existingProfile?.createdAt || now,
    lastSeen: now,
  };
};

const hashPassword = async (password: string, salt = randomBytes(16).toString('hex')) => {
  const hash = await pbkdf2Async(password, salt, passwordIterations, 32, 'sha256');

  return {
    passwordHash: hash.toString('hex'),
    passwordIterations,
    passwordSalt: salt,
  };
};

const verifyPassword = async (
  password: string,
  credentials: NonNullable<UserSettings['credentials']>
) => {
  const hash = await pbkdf2Async(
    password,
    credentials.passwordSalt,
    credentials.passwordIterations,
    32,
    'sha256'
  );
  const storedHash = Buffer.from(credentials.passwordHash, 'hex');

  return storedHash.length === hash.length && timingSafeEqual(storedHash, hash);
};

const toDocument = (settings: SettingsStore): SettingsDocument => {
  if (
    settings.version === 2 &&
    settings.users &&
    typeof settings.users === 'object' &&
    !Array.isArray(settings.users)
  ) {
    return settings as SettingsDocument;
  }

  return {
    version: 2,
    users: {
      guest: {
        settings,
      },
    },
  };
};

const readSettingsDocument = async (): Promise<SettingsDocument> => {
  try {
    return toDocument(parseSettings(await readFile(SETTINGS_FILE, 'utf-8')));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { version: 2, users: {} };
    }
    throw error;
  }
};

const writeSettingsDocument = async (settings: SettingsDocument): Promise<void> => {
  const write = async () => {
    await mkdir(dirname(SETTINGS_FILE), { recursive: true });

    const tmpFile = `${SETTINGS_FILE}.${process.pid}.tmp`;
    await writeFile(tmpFile, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8');
    await rename(tmpFile, SETTINGS_FILE);
  };

  writeQueue = writeQueue.then(write, write);
  return writeQueue;
};

export const readSettings = async (userId = 'guest'): Promise<SettingsStore> => {
  const settings = await readSettingsDocument();
  return settings.users[sanitizeUserId(userId)]?.settings || {};
};

export const readUserProfile = async (userId = 'guest'): Promise<LockstepUser | null> => {
  const settings = await readSettingsDocument();
  const profile = settings.users[sanitizeUserId(userId)]?.profile;

  return profile && typeof profile === 'object' ? profile as LockstepUser : null;
};

export const registerUser = async (
  username: string,
  password: string,
  name?: string
): Promise<LockstepUser> => {
  const cleanUsername = sanitizeUsername(username);
  if (cleanUsername.length < 3 || password.length < 6) {
    throw new Error('Invalid credentials');
  }

  const document = await readSettingsDocument();
  if (document.users[cleanUsername]?.credentials) {
    throw new Error('User already exists');
  }

  const profile = makeUserProfile(cleanUsername, name || cleanUsername);
  document.users[cleanUsername] = {
    credentials: await hashPassword(password),
    profile,
    settings: {
      ...(document.users[cleanUsername]?.settings || {}),
      PSC_USER_PROFILE: profile,
    },
  };

  await writeSettingsDocument(document);
  return profile;
};

export const authenticateUser = async (
  username: string,
  password: string
): Promise<LockstepUser> => {
  const cleanUsername = sanitizeUsername(username);
  const document = await readSettingsDocument();
  const userSettings = document.users[cleanUsername];

  if (!userSettings?.credentials) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, userSettings.credentials);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const existingProfile =
    userSettings.profile && typeof userSettings.profile === 'object'
      ? userSettings.profile as Partial<LockstepUser>
      : undefined;
  const profile = makeUserProfile(
    cleanUsername,
    existingProfile?.name || cleanUsername,
    existingProfile
  );

  userSettings.profile = profile;
  userSettings.settings.PSC_USER_PROFILE = profile;
  document.users[cleanUsername] = userSettings;
  await writeSettingsDocument(document);

  return profile;
};

export const updateUserAccount = async (
  userId: string,
  currentPassword: string,
  updates: {
    name?: string;
    newPassword?: string;
    username?: string;
  }
): Promise<LockstepUser> => {
  const currentUserId = sanitizeUsername(userId);
  const nextUsername = updates.username ? sanitizeUsername(updates.username) : currentUserId;

  if (currentUserId.length < 3 || nextUsername.length < 3 || currentPassword.length < 6) {
    throw new Error('Invalid input');
  }

  if (updates.newPassword && updates.newPassword.length < 6) {
    throw new Error('Invalid input');
  }

  const document = await readSettingsDocument();
  const userSettings = document.users[currentUserId];

  if (!userSettings?.credentials) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(currentPassword, userSettings.credentials);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  if (
    nextUsername !== currentUserId &&
    document.users[nextUsername]?.credentials
  ) {
    throw new Error('User already exists');
  }

  if (updates.newPassword) {
    userSettings.credentials = await hashPassword(updates.newPassword);
  }

  const existingProfile =
    userSettings.profile && typeof userSettings.profile === 'object'
      ? userSettings.profile as Partial<LockstepUser>
      : undefined;
  const profile = makeUserProfile(
    nextUsername,
    updates.name || existingProfile?.name || nextUsername,
    existingProfile
  );

  userSettings.profile = profile;
  userSettings.settings.PSC_USER_PROFILE = profile;

  if (nextUsername !== currentUserId) {
    delete document.users[currentUserId];
  }

  document.users[nextUsername] = userSettings;
  await writeSettingsDocument(document);

  return profile;
};

export const setSetting = async (
  userId: string,
  key: string,
  value: unknown
): Promise<SettingsStore> => {
  const document = await readSettingsDocument();
  const cleanUserId = sanitizeUserId(userId);
  const userSettings = document.users[cleanUserId] || { settings: {} };

  userSettings.settings[key] = value;
  if (key === 'PSC_USER_PROFILE') {
    userSettings.profile = value;
  }

  document.users[cleanUserId] = userSettings;
  await writeSettingsDocument(document);
  return userSettings.settings;
};

export const clearSettings = async (userId = 'guest'): Promise<void> => {
  const document = await readSettingsDocument();
  const cleanUserId = sanitizeUserId(userId);

  if (document.users[cleanUserId]) {
    document.users[cleanUserId].settings = {};
  }

  await writeSettingsDocument(document);
};
