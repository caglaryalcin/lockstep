import type { RequestHandler } from '@builder.io/qwik-city';

import { sanitizeUsername } from '~/lib/account';
import {
  createDemoSession,
  demoSessionCookie,
  getDemoCredentials,
  getDemoResetInfo,
  hasDemoSession,
  isDemoMode,
  revokeDemoSession,
} from '~/lib/server/demo-store';
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
  if (isDemoMode()) {
    return false;
  }

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

const setDemoSessionCookie = (
  cookie: Parameters<RequestHandler>[0]['cookie'],
  token: string,
  secure: boolean
) => {
  cookie.set(demoSessionCookie, token, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: '/',
    sameSite: 'lax',
    secure,
  });
};

const secureRequest = (request: Request) => {
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',', 1)[0]
    ?.trim()
    .toLowerCase();

  return forwardedProtocol === 'https' || new URL(request.url).protocol === 'https:';
};

export const onGet: RequestHandler = async ({ cookie, headers, json }) => {
  sendNoStore(headers);

  if (isDemoMode()) {
    const sessionToken = cookie.get(demoSessionCookie)?.value;
    const authenticated = hasDemoSession(sessionToken);
    const reset = getDemoResetInfo();
    if (sessionToken && !authenticated) {
      cookie.delete(demoSessionCookie, { path: '/' });
      cookie.delete('LOCKSTEP_USER', { path: '/' });
    }
    json(200, {
      demo: true,
      demoDefaultCredentials: getDemoCredentials().defaultCredentials,
      demoEpoch: reset.epoch,
      demoNextResetAt: reset.nextResetAt,
      demoResetTimeZone: reset.timeZone,
      demoServerTime: reset.serverTime,
      authenticated,
      registrationEnabled: false,
    });
    return;
  }

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
  const demo = isDemoMode();

  if (action !== 'login' && action !== 'register') {
    json(400, { error: 'INVALID_INPUT' });
    return;
  }

  if (demo && action === 'register') {
    json(403, { demo: true, error: 'REGISTRATION_DISABLED' });
    return;
  }

  if (username.length < 3 || password.length < (demo ? 1 : 6)) {
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
    if (demo) {
      setDemoSessionCookie(cookie, createDemoSession(), secureRequest(request));
    }
    json(200, demo ? { demo: true, user } : { user });
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

  if (isDemoMode()) {
    json(403, { demo: true, error: 'DEMO_ACCOUNT_UPDATE_DISABLED' });
    return;
  }

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
  if (isDemoMode()) {
    revokeDemoSession(cookie.get(demoSessionCookie)?.value);
    cookie.delete(demoSessionCookie, { path: '/' });
  }
  cookie.delete('LOCKSTEP_USER', { path: '/' });
  json(200, {});
};
