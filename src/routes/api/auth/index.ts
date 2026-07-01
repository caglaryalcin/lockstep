import type { RequestHandler } from '@builder.io/qwik-city';

import {
  authenticateUser,
  registerUser,
  sanitizeUsername,
  updateUserAccount,
} from '~/lib/server/settings-store';

const sendNoStore = (headers: Headers) => {
  headers.set('Cache-Control', 'no-store');
};

const setUserCookie = (
  cookie: Parameters<RequestHandler>[0]['cookie'],
  userId: string
) => {
  cookie.set('LOCKSTEP_USER', userId, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
};

export const onPost: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const username = sanitizeUsername(body?.username);
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name : username;

  if ((action !== 'login' && action !== 'register') || username.length < 3 || password.length < 6) {
    json(400, { error: 'INVALID_INPUT' });
    return;
  }

  try {
    const user = action === 'register'
      ? await registerUser(username, password, name)
      : await authenticateUser(username, password);

    setUserCookie(cookie, user.id);
    json(200, { user });
  } catch {
    json(action === 'register' ? 409 : 401, {
      error: action === 'register' ? 'USER_EXISTS' : 'INVALID_CREDENTIALS',
    });
  }
};

export const onPatch: RequestHandler = async ({ cookie, headers, json, request }) => {
  sendNoStore(headers);

  const body = await request.json().catch(() => null);
  const userId = sanitizeUsername(request.headers.get('X-Lockstep-User') || cookie.get('LOCKSTEP_USER')?.value);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const username = typeof body?.username === 'string' ? body.username : undefined;
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : undefined;
  const name = typeof body?.name === 'string' ? body.name : undefined;

  try {
    const user = await updateUserAccount(userId, currentPassword, {
      name,
      newPassword,
      username,
    });

    setUserCookie(cookie, user.id);
    json(200, { user });
  } catch {
    json(400, { error: 'UPDATE_FAILED' });
  }
};

export const onDelete: RequestHandler = async ({ cookie, headers, json }) => {
  sendNoStore(headers);
  cookie.delete('LOCKSTEP_USER', { path: '/' });
  json(200, {});
};
