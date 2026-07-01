import { $, type QRL, useStore, useVisibleTask$ } from "@builder.io/qwik";

import {
  getSettingsHeaders,
  getStoredUser,
  getUserScopedStorageKey,
} from "~/lib/user-session";

type StoredSettings = Record<string, any>;

const SETTINGS_ENDPOINT = "/api/settings";

const settingsCache: Record<string, StoredSettings> = {};
const settingsRequest: Record<string, Promise<StoredSettings> | null> = {};
let writeQueue: Promise<void> = Promise.resolve();

const cloneValue = (value: any) => JSON.parse(JSON.stringify(value));

const readLocalValue = (storageKey: string, initialState: any) => {
  const item = window.localStorage.getItem(storageKey);
  return item ? JSON.parse(item) : initialState;
};

const getActiveUserId = () => getStoredUser()?.id || "guest";

const fetchSettings = async (userId: string): Promise<StoredSettings> => {
  if (settingsCache[userId]) {
    return settingsCache[userId];
  }

  if (!settingsRequest[userId]) {
    settingsRequest[userId] = fetch(SETTINGS_ENDPOINT, {
      cache: "no-store",
      headers: getSettingsHeaders(userId),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Settings request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((settings) => {
        const parsedSettings: StoredSettings =
          settings && typeof settings === "object" ? settings : {};
        settingsCache[userId] = parsedSettings;
        return parsedSettings;
      })
      .catch((error) => {
        settingsRequest[userId] = null;
        throw error;
      });
  }

  return settingsRequest[userId] as Promise<StoredSettings>;
};

const persistSetting = async (userId: string, key: string, value: any) => {
  const nextValue = cloneValue(value);
  settingsCache[userId] = { ...(settingsCache[userId] || {}), [key]: nextValue };
  window.localStorage.setItem(getUserScopedStorageKey(userId, key), JSON.stringify(nextValue));

  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const response = await fetch(SETTINGS_ENDPOINT, {
      method: "POST",
      headers: getSettingsHeaders(userId),
      body: JSON.stringify({ key, value: nextValue }),
    });

    if (!response.ok) {
      throw new Error(`Settings save failed: ${response.status}`);
    }
  });

  return writeQueue;
};

export function useLocalStorage(key: string, initialState: any): [any, QRL<(value: any) => void>]  {
  const store = useStore({ value: initialState });

  useVisibleTask$(async () => {
    const userId = getActiveUserId();
    const storageKey = getUserScopedStorageKey(userId, key);
    let localValue = initialState;
    try {
      localValue = readLocalValue(storageKey, initialState);
      store.value = cloneValue(localValue);
    } catch (localError) {
      console.log(localError);
    }

    try {
      const settings = await fetchSettings(userId);
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        store.value = cloneValue(settings[key]);
        window.localStorage.setItem(storageKey, JSON.stringify(settings[key]));
        return;
      }

      await persistSetting(userId, key, localValue);
    } catch (error) {
      console.log(error);
      try {
        store.value = readLocalValue(storageKey, initialState);
      } catch (localError) {
        console.log(localError);
        store.value = initialState;
      }
    }
  });

  const setValue$ = $(async (value: any) => {
    try {
      const nextValue = cloneValue(value);
      store.value = nextValue;
      if (typeof window !== "undefined") {
        await persistSetting(getActiveUserId(), key, nextValue);
      }
    } catch (error) {
      console.log(error);
    }
  });

  return [store, setValue$];
}
