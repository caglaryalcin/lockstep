import type { RequestHandler } from '@builder.io/qwik-city';

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

const getUserId = (request: Request, cookie: Parameters<RequestHandler>[0]['cookie']) => {
  const userId = request.headers.get('X-Lockstep-User') || cookie.get('LOCKSTEP_USER')?.value || 'guest';
  return allowedUser.test(userId) ? userId : 'guest';
};

export const onGet: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);
  json(200, await readSettings(getUserId(request, cookie)));
};

export const onPost: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);

  const body = await request.json().catch(() => null);
  const key = body?.key;

  if (typeof key !== 'string' || !allowedKey.test(key)) {
    json(400, { error: 'Invalid settings key' });
    return;
  }

  json(200, await setSetting(getUserId(request, cookie), key, body.value));
};

export const onDelete: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);
  await clearSettings(getUserId(request, cookie));
  json(200, {});
};
