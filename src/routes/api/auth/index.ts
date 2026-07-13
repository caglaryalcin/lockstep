import type { RequestHandler } from '@builder.io/qwik-city';

import { sanitizeUsername } from '~/lib/account';
import {
  authenticateUser,
  hasRegisteredUsers,
  registerInitialUser,
  registerUser,
  updateUserAccount,
} from '~/lib/server/settings-store';

const sendNoStore = (headers: Headers) => {
  headers.set('Cache-Control', 'no-store');
};

const registrationsEnabled = () => {
  const value = process.env.LOCKSTEP_REGISTRATION_ENABLED?.trim().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(value ?? '');
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

export const onGet: RequestHandler = async ({ headers, json }) => {
  sendNoStore(headers);
  json(200, {
    registrationEnabled: registrationsEnabled() || !(await hasRegisteredUsers()),
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
      ? registrationsEnabled()
        ? await registerUser(username, password, name)
        : await registerInitialUser(username, password, name)
      : await authenticateUser(username, password);

    setUserCookie(cookie, user.id);
    json(200, { user });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const registerStatus = message === 'User already exists'
      ? 409
      : message === 'Invalid credentials'
        ? 400
        : message === 'Registration disabled'
          ? 403
        : 500;
    const registerError = message === 'User already exists'
      ? 'USER_EXISTS'
      : message === 'Invalid credentials'
        ? 'INVALID_INPUT'
        : message === 'Registration disabled'
          ? 'REGISTRATION_DISABLED'
        : 'REGISTER_FAILED';

    json(action === 'register' ? registerStatus : 401, {
      error: action === 'register' ? registerError : 'INVALID_CREDENTIALS',
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
