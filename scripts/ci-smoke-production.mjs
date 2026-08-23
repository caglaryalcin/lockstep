#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const readJson = async (response) => {
  const body = await response.text();
  assert.ok(body, `${response.url} returned an empty response body`);
  return JSON.parse(body);
};

const getSetCookies = (headers) =>
  typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(Boolean);

const findSetCookie = (headers, name) =>
  getSetCookies(headers).find((cookie) => cookie.startsWith(`${name}=`)) || "";

const findCookie = (headers, name) =>
  findSetCookie(headers, name).split(";", 1)[0] || "";

const previousSettingsFile = process.env.PSC_SETTINGS_FILE;
const previousRegistrationSetting = process.env.LOCKSTEP_REGISTRATION_ENABLED;
const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "lockstep-production-smoke-"),
);
const settingsFile = join(temporaryDirectory, "settings.json");

process.env.PSC_SETTINGS_FILE = settingsFile;
process.env.LOCKSTEP_REGISTRATION_ENABLED = "false";

let server;

try {
  const { startLockstepServer } = await import("../serve.mjs");
  server = await startLockstepServer({
    hostname: "127.0.0.1",
    label: "Lockstep production smoke",
    log: false,
    port: 0,
  });

  const address = server.address();
  assert.ok(
    address && typeof address === "object",
    "Server did not expose an address",
  );
  const origin = `http://127.0.0.1:${address.port}`;

  const request = (path, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers);
    if (method !== "GET" && method !== "HEAD" && !headers.has("Origin")) {
      headers.set("Origin", origin);
    }

    return fetch(`${origin}${path}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(10_000),
    });
  };
  const jsonRequest = (path, body, options = {}) =>
    request(path, {
      ...options,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

  const rootResponse = await request("/");
  assert.equal(rootResponse.status, 200);
  assert.match(
    rootResponse.headers.get("content-type") || "",
    /^text\/html\b/i,
  );
  assert.match(await rootResponse.text(), /Lockstep/);

  const manifestResponse = await request("/q-manifest.json");
  assert.equal(manifestResponse.status, 200);
  assert.ok((await readJson(manifestResponse)).manifestHash);

  const healthResponse = await request("/healthz");
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await readJson(healthResponse), { status: "ok" });

  const readinessResponse = await request("/readyz");
  assert.equal(readinessResponse.status, 200);
  assert.deepEqual(await readJson(readinessResponse), {
    mode: "production",
    status: "ready",
  });

  const initialAuthResponse = await request("/api/auth");
  assert.equal(initialAuthResponse.status, 200);
  assert.deepEqual(await readJson(initialAuthResponse), {
    registrationEnabled: true,
  });

  const registrationResponse = await jsonRequest(
    "/api/auth",
    {
      action: "register",
      name: "Smoke User",
      password: "correct-horse-battery",
      username: "smoke-user",
    },
    { method: "POST" },
  );
  assert.equal(registrationResponse.status, 200);
  const registration = await readJson(registrationResponse);
  assert.equal(registration.user?.id, "smoke-user");
  assert.equal(registration.user?.name, "Smoke User");
  const userCookie = findCookie(registrationResponse.headers, "LOCKSTEP_USER");
  assert.equal(userCookie, "LOCKSTEP_USER=smoke-user");

  const lockedAuthResponse = await request("/api/auth");
  assert.equal(lockedAuthResponse.status, 200);
  assert.deepEqual(await readJson(lockedAuthResponse), {
    registrationEnabled: false,
  });

  const secondRegistrationResponse = await jsonRequest(
    "/api/auth",
    {
      action: "register",
      name: "Second User",
      password: "another-correct-password",
      username: "second-user",
    },
    { method: "POST" },
  );
  assert.equal(secondRegistrationResponse.status, 403);
  assert.deepEqual(await readJson(secondRegistrationResponse), {
    error: "REGISTRATION_DISABLED",
  });

  delete process.env.LOCKSTEP_REGISTRATION_ENABLED;
  const openAuthResponse = await request("/api/auth");
  assert.equal(openAuthResponse.status, 200);
  assert.deepEqual(await readJson(openAuthResponse), {
    registrationEnabled: true,
  });

  const enabledRegistrationResponse = await jsonRequest(
    "/api/auth",
    {
      action: "register",
      name: "Second User",
      password: "another-correct-password",
      username: "second-user",
    },
    { method: "POST" },
  );
  assert.equal(enabledRegistrationResponse.status, 200);
  assert.equal(
    (await readJson(enabledRegistrationResponse)).user?.id,
    "second-user",
  );
  process.env.LOCKSTEP_REGISTRATION_ENABLED = "false";

  const badLoginResponse = await jsonRequest(
    "/api/auth",
    {
      action: "login",
      password: "incorrect-password",
      username: "smoke-user",
    },
    { method: "POST" },
  );
  assert.equal(badLoginResponse.status, 401);

  const loginResponse = await jsonRequest(
    "/api/auth",
    {
      action: "login",
      password: "correct-horse-battery",
      username: "smoke-user",
    },
    { method: "POST" },
  );
  assert.equal(loginResponse.status, 200);
  assert.equal((await readJson(loginResponse)).user?.id, "smoke-user");
  const loginCookie = findCookie(loginResponse.headers, "LOCKSTEP_USER");
  assert.equal(loginCookie, "LOCKSTEP_USER=smoke-user");

  const initialSettingsResponse = await request("/api/settings", {
    headers: { Cookie: loginCookie },
  });
  assert.equal(initialSettingsResponse.status, 200);
  const initialSettings = await readJson(initialSettingsResponse);
  assert.equal(initialSettings.PSC_USER_PROFILE?.id, "smoke-user");

  const invalidSettingResponse = await jsonRequest(
    "/api/settings",
    {
      key: "INVALID_KEY",
      value: true,
    },
    {
      headers: { Cookie: loginCookie },
      method: "POST",
    },
  );
  assert.equal(invalidSettingResponse.status, 400);

  const settingResponse = await jsonRequest(
    "/api/settings",
    {
      key: "PSC_THEME",
      value: "light",
    },
    {
      headers: { Cookie: loginCookie },
      method: "POST",
    },
  );
  assert.equal(settingResponse.status, 200);
  assert.equal((await readJson(settingResponse)).PSC_THEME, "light");

  const updateResponse = await jsonRequest(
    "/api/auth",
    {
      currentPassword: "correct-horse-battery",
      name: "Updated User",
      newPassword: "new-correct-password",
      username: "updated-user",
    },
    {
      headers: { Cookie: loginCookie },
      method: "PATCH",
    },
  );
  assert.equal(updateResponse.status, 200);
  const updated = await readJson(updateResponse);
  assert.equal(updated.user?.id, "updated-user");
  assert.equal(updated.user?.name, "Updated User");
  const updatedCookie = findCookie(updateResponse.headers, "LOCKSTEP_USER");
  assert.equal(updatedCookie, "LOCKSTEP_USER=updated-user");

  const oldLoginResponse = await jsonRequest(
    "/api/auth",
    {
      action: "login",
      password: "correct-horse-battery",
      username: "smoke-user",
    },
    { method: "POST" },
  );
  assert.equal(oldLoginResponse.status, 401);

  const updatedLoginResponse = await jsonRequest(
    "/api/auth",
    {
      action: "login",
      password: "new-correct-password",
      username: "updated-user",
    },
    { method: "POST" },
  );
  assert.equal(updatedLoginResponse.status, 200);

  const updatedSettingsResponse = await request("/api/settings", {
    headers: { Cookie: updatedCookie },
  });
  assert.equal(updatedSettingsResponse.status, 200);
  const updatedSettings = await readJson(updatedSettingsResponse);
  assert.equal(updatedSettings.PSC_THEME, "light");
  assert.equal(updatedSettings.PSC_USER_PROFILE?.id, "updated-user");

  const clearResponse = await request("/api/settings", {
    headers: { Cookie: updatedCookie },
    method: "DELETE",
  });
  assert.equal(clearResponse.status, 200);

  const clearedSettingsResponse = await request("/api/settings", {
    headers: { Cookie: updatedCookie },
  });
  assert.equal(clearedSettingsResponse.status, 200);
  assert.deepEqual(await readJson(clearedSettingsResponse), {});

  const logoutResponse = await request("/api/auth", {
    headers: { Cookie: updatedCookie },
    method: "DELETE",
  });
  assert.equal(logoutResponse.status, 200);
  const deletedUserCookie = findSetCookie(
    logoutResponse.headers,
    "LOCKSTEP_USER",
  );
  assert.match(deletedUserCookie, /^LOCKSTEP_USER=deleted;/);
  assert.match(deletedUserCookie, /(?:^|;\s*)Max-Age=0(?:;|$)/i);

  const storedDocumentText = await readFile(settingsFile, "utf8");
  const storedDocument = JSON.parse(storedDocumentText);
  assert.equal(storedDocument.version, 2);
  assert.ok(storedDocument.users["updated-user"]);
  assert.ok(storedDocument.users["second-user"]);
  assert.equal(storedDocument.users["smoke-user"], undefined);
  assert.doesNotMatch(
    storedDocumentText,
    /correct-horse-battery|another-correct-password|new-correct-password/,
  );

  console.log(
    "Production smoke test passed (auth, profile, settings, persistence, health).",
  );
} finally {
  if (server) {
    await closeServer(server);
  }
  await rm(temporaryDirectory, { force: true, recursive: true });

  if (previousSettingsFile === undefined) {
    delete process.env.PSC_SETTINGS_FILE;
  } else {
    process.env.PSC_SETTINGS_FILE = previousSettingsFile;
  }

  if (previousRegistrationSetting === undefined) {
    delete process.env.LOCKSTEP_REGISTRATION_ENABLED;
  } else {
    process.env.LOCKSTEP_REGISTRATION_ENABLED = previousRegistrationSetting;
  }
}
