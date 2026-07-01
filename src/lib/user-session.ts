export type LockstepUser = {
  id: string;
  name: string;
  initials: string;
  username?: string;
  createdAt: string;
  lastSeen: string;
};

export const USER_STORAGE_KEY = "LOCKSTEP_USER";
export const USER_COOKIE_KEY = "LOCKSTEP_USER";
export const USER_HEADER = "X-Lockstep-User";

const userScopedPrefix = "LOCKSTEP_USER";

const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ");

const makeInitials = (name: string) => {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  const letters = parts.length > 1
    ? [parts[0], parts[parts.length - 1]]
    : [parts[0] || "U"];

  return letters
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
};

const slugifyName = (name: string) => {
  const slug = normalizeName(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || "user";
};

const safeUserId = (id: string) =>
  id.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);

export const createUserProfile = (name: string): LockstepUser => {
  const cleanName = normalizeName(name);
  const now = new Date().toISOString();
  const suffix = Date.now().toString(36);

  return {
    id: safeUserId(`${slugifyName(cleanName)}-${suffix}`),
    name: cleanName,
    initials: makeInitials(cleanName),
    username: slugifyName(cleanName),
    createdAt: now,
    lastSeen: now,
  };
};

export const parseStoredUser = (value: string | null): LockstepUser | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.id === "string" &&
      typeof parsed.name === "string"
    ) {
      return {
        id: safeUserId(parsed.id),
        name: normalizeName(parsed.name),
        initials: typeof parsed.initials === "string" ? parsed.initials : makeInitials(parsed.name),
        username: typeof parsed.username === "string" ? parsed.username : safeUserId(parsed.id),
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
        lastSeen: typeof parsed.lastSeen === "string" ? parsed.lastSeen : new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const getStoredUser = (): LockstepUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return parseStoredUser(window.localStorage.getItem(USER_STORAGE_KEY));
};

export const saveStoredUser = (user: LockstepUser) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextUser = {
    ...user,
    id: safeUserId(user.id),
    name: normalizeName(user.name),
    initials: user.initials || makeInitials(user.name),
    username: user.username || safeUserId(user.id),
    lastSeen: new Date().toISOString(),
  };

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  document.cookie = `${USER_COOKIE_KEY}=${nextUser.id}; path=/; max-age=31536000; SameSite=Lax`;
};

export const clearStoredUser = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(USER_STORAGE_KEY);
  document.cookie = `${USER_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
};

export const getUserScopedStorageKey = (userId: string | undefined, key: string) => {
  return userId ? `${userScopedPrefix}:${safeUserId(userId)}:${key}` : key;
};

export const getSettingsHeaders = (userId?: string): HeadersInit => {
  const resolvedUserId = userId || getStoredUser()?.id;
  return {
    "Content-Type": "application/json",
    ...(resolvedUserId ? { [USER_HEADER]: resolvedUserId } : {}),
  };
};

export const clearCurrentUserLocalSettings = () => {
  const user = getStoredUser();
  if (!user || typeof window === "undefined") {
    return;
  }

  const prefix = `${userScopedPrefix}:${user.id}:PSC_`;
  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  });
};
