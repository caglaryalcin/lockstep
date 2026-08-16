import type { RequestHandler } from '@builder.io/qwik-city';

import {
  DemoEpochExpiredError,
  demoSessionCookie,
  getDemoSessionEpoch,
  isDemoMode,
} from '~/lib/server/demo-store';
import {
  clearSettings,
  readSettings,
  setSetting,
} from '~/lib/server/settings-store';

const allowedKey = /^PSC_[A-Z0-9_]+$/;
const allowedUser = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const sendNoStore = (headers: Headers) => {
  headers.set('Cache-Control', 'no-store');
};

const requestDemoEpoch = (
  cookie: Parameters<RequestHandler>[0]['cookie']
) => isDemoMode()
  ? getDemoSessionEpoch(cookie.get(demoSessionCookie)?.value) || undefined
  : undefined;

const sendDemoUnauthorized = (
  json: Parameters<RequestHandler>[0]['json'],
  error = 'UNAUTHORIZED'
) => json(401, { demo: true, error });

const handleDemoEpochError = (
  error: unknown,
  json: Parameters<RequestHandler>[0]['json']
) => {
  if (error instanceof DemoEpochExpiredError) {
    sendDemoUnauthorized(json, 'DEMO_RESET');
    return true;
  }
  return false;
};

const getUserId = (request: Request, cookie: Parameters<RequestHandler>[0]['cookie']) => {
  const userId = request.headers.get('X-Lockstep-User') || cookie.get('LOCKSTEP_USER')?.value || 'guest';
  return allowedUser.test(userId) ? userId : 'guest';
};

export const onGet: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);
  const demoEpoch = requestDemoEpoch(cookie);
  if (isDemoMode() && !demoEpoch) {
    sendDemoUnauthorized(json);
    return;
  }
  try {
    json(200, await readSettings(getUserId(request, cookie), demoEpoch));
  } catch (error) {
    if (!handleDemoEpochError(error, json)) throw error;
  }
};

export const onPost: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);
  const demoEpoch = requestDemoEpoch(cookie);
  if (isDemoMode() && !demoEpoch) {
    sendDemoUnauthorized(json);
    return;
  }

  const body = await request.json().catch(() => null);
  const key = body?.key;

  if (typeof key !== 'string' || !allowedKey.test(key)) {
    json(400, { error: 'Invalid settings key' });
    return;
  }

  try {
    json(200, await setSetting(getUserId(request, cookie), key, body.value, demoEpoch));
  } catch (error) {
    if (!handleDemoEpochError(error, json)) throw error;
  }
};

export const onDelete: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);
  const demoEpoch = requestDemoEpoch(cookie);
  if (isDemoMode() && !demoEpoch) {
    sendDemoUnauthorized(json);
    return;
  }
  try {
    await clearSettings(getUserId(request, cookie), demoEpoch);
    json(200, {});
  } catch (error) {
    if (!handleDemoEpochError(error, json)) throw error;
  }
};
