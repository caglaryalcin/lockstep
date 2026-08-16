#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { load as loadYaml } from "js-yaml";

import { startDemoServer } from "../demo-server.mjs";

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const readJson = async (response) => {
  const body = await response.text();
  assert.ok(body, `${response.url} returned an empty response body`);
  return JSON.parse(body);
};

const findCookie = (headers, name) => {
  const values =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  const value = values.find((cookie) => cookie.startsWith(`${name}=`));
  return value?.split(";", 1)[0] || "";
};

const dayInTimeZone = (timeZone) => {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts();
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const countCompletedChecklistItems = async (progress) => {
  const checklist = loadYaml(
    await readFile(
      resolve(process.cwd(), "personal-security-checklist.yml"),
      "utf8",
    ),
  );
  assert.ok(Array.isArray(checklist), "Checklist seed source is invalid");

  return checklist.reduce(
    (total, section) =>
      total +
      section.checklist.filter((item) => {
        const id = item.id || item.point.toLowerCase().replace(/\s+/g, "-");
        return progress[id] === true;
      }).length,
    0,
  );
};

const run = async () => {
  process.env.LOCKSTEP_DEMO_USER = "demo";
  process.env.LOCKSTEP_DEMO_PASSWORD = "demo";

  const server = await startDemoServer({
    hostname: "127.0.0.1",
    log: false,
    port: 0,
  });
  const address = server.address();
  assert.ok(
    address && typeof address === "object",
    "Demo server did not expose an address",
  );
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const authResponse = await fetch(`${baseUrl}/api/auth`);
    assert.equal(authResponse.status, 200);
    const auth = await readJson(authResponse);
    assert.equal(auth.demo, true);
    assert.equal(auth.registrationEnabled, false);
    assert.equal(auth.demoDefaultCredentials, true);
    assert.equal(auth.authenticated, false);
    assert.equal(auth.demoResetTimeZone, "Europe/Istanbul");
    assert.match(auth.demoEpoch, /^\d{4}-\d{2}-\d{2}\./);
    const nextResetAt = Date.parse(auth.demoNextResetAt);
    const serverTime = Date.parse(auth.demoServerTime);
    assert.ok(Number.isFinite(nextResetAt));
    assert.ok(Number.isFinite(serverTime));
    assert.ok(nextResetAt > serverTime);
    assert.ok(nextResetAt - serverTime < 30 * 60 * 60 * 1000);

    const healthResponse = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await readJson(healthResponse), { status: "ok" });

    const readyResponse = await fetch(`${baseUrl}/readyz`);
    assert.equal(readyResponse.status, 200);
    assert.deepEqual(await readJson(readyResponse), {
      mode: "demo",
      status: "ready",
    });

    const unauthorizedSettings = await fetch(`${baseUrl}/api/settings`);
    assert.equal(unauthorizedSettings.status, 401);
    const unauthorizedMutation = await fetch(`${baseUrl}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "PSC_PROGRESS", value: {} }),
    });
    assert.equal(unauthorizedMutation.status, 401);
    const unauthorizedDelete = await fetch(`${baseUrl}/api/settings`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    assert.equal(unauthorizedDelete.status, 401);

    const loginResponse = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        username: "demo",
        password: "demo",
      }),
    });
    assert.equal(loginResponse.status, 200);
    const login = await readJson(loginResponse);
    assert.equal(login.user?.id, "demo");
    assert.equal(login.user?.username, "demo");

    const userCookie = findCookie(loginResponse.headers, "LOCKSTEP_USER");
    const demoSessionCookie = findCookie(
      loginResponse.headers,
      "LOCKSTEP_DEMO_SESSION",
    );
    assert.equal(userCookie, "LOCKSTEP_USER=demo");
    assert.ok(demoSessionCookie.startsWith("LOCKSTEP_DEMO_SESSION="));
    const cookieHeader = `${userCookie}; ${demoSessionCookie}`;

    const authenticatedStatusResponse = await fetch(`${baseUrl}/api/auth`, {
      headers: { Cookie: cookieHeader },
    });
    const authenticatedStatus = await readJson(authenticatedStatusResponse);
    assert.equal(authenticatedStatus.authenticated, true);

    const pageResponse = await fetch(`${baseUrl}/`, {
      headers: { Cookie: cookieHeader },
    });
    assert.equal(pageResponse.status, 200);
    assert.match(pageResponse.headers.get("content-type") || "", /text\/html/i);
    assert.match(await pageResponse.text(), /Lockstep/i);

    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      headers: { Cookie: cookieHeader },
    });
    assert.equal(settingsResponse.status, 200);
    const settings = await readJson(settingsResponse);
    assert.deepEqual(settings.PSC_IGNORED, {});
    assert.deepEqual(settings.PSC_PROFILE, {
      device: "mixed",
      risk: "high",
      focus: "accounts",
    });
    assert.equal(settings.PSC_CLOSE_WELCOME, true);
    assert.equal(settings.PSC_THEME, "dark");
    assert.equal(settings.PSC_USER_PROFILE?.id, "demo");

    assert.ok(
      settings.PSC_PROGRESS && typeof settings.PSC_PROGRESS === "object",
      "PSC_PROGRESS seed is missing",
    );
    const progressValues = Object.values(settings.PSC_PROGRESS);
    assert.equal(progressValues.length, 195);
    assert.ok(progressValues.every((completed) => completed === true));
    const completedItems = await countCompletedChecklistItems(
      settings.PSC_PROGRESS,
    );
    assert.equal(completedItems, 195);

    const profileMutationResponse = await fetch(`${baseUrl}/api/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        key: "PSC_USER_PROFILE",
        value: { id: "tampered", name: "Tampered" },
      }),
    });
    assert.equal(profileMutationResponse.status, 200);
    const profileMutation = await readJson(profileMutationResponse);
    assert.equal(profileMutation.PSC_USER_PROFILE?.id, "demo");

    const progressMutationResponse = await fetch(`${baseUrl}/api/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ key: "PSC_PROGRESS", value: {} }),
    });
    assert.equal(progressMutationResponse.status, 200);
    const progressMutation = await readJson(progressMutationResponse);
    assert.deepEqual(progressMutation.PSC_PROGRESS, {});

    const originalDay = auth.demoEpoch.slice(0, 10);
    const resetTimeZone = ["Pacific/Kiritimati", "Etc/GMT+12"].find(
      (timeZone) => dayInTimeZone(timeZone) !== originalDay,
    );
    assert.ok(resetTimeZone, "Unable to select a different demo day");
    process.env.LOCKSTEP_DEMO_RESET_TIMEZONE = resetTimeZone;

    const resetStatusResponse = await fetch(`${baseUrl}/api/auth`, {
      headers: { Cookie: cookieHeader },
    });
    const resetStatus = await readJson(resetStatusResponse);
    assert.equal(resetStatus.authenticated, false);
    assert.equal(resetStatus.demoResetTimeZone, resetTimeZone);
    assert.notEqual(resetStatus.demoEpoch, auth.demoEpoch);

    const staleSessionSettings = await fetch(`${baseUrl}/api/settings`, {
      headers: { Cookie: cookieHeader },
    });
    assert.equal(staleSessionSettings.status, 401);

    const refreshedLoginResponse = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        username: "demo",
        password: "demo",
      }),
    });
    assert.equal(refreshedLoginResponse.status, 200);
    const refreshedCookieHeader = `${findCookie(
      refreshedLoginResponse.headers,
      "LOCKSTEP_USER",
    )}; ${findCookie(refreshedLoginResponse.headers, "LOCKSTEP_DEMO_SESSION")}`;
    const refreshedSettingsResponse = await fetch(`${baseUrl}/api/settings`, {
      headers: { Cookie: refreshedCookieHeader },
    });
    assert.equal(refreshedSettingsResponse.status, 200);
    const refreshedSettings = await readJson(refreshedSettingsResponse);
    assert.equal(Object.keys(refreshedSettings.PSC_PROGRESS).length, 195);

    const logoutResponse = await fetch(`${baseUrl}/api/auth`, {
      method: "DELETE",
      headers: { Cookie: refreshedCookieHeader, Origin: baseUrl },
    });
    assert.equal(logoutResponse.status, 200);
    const settingsAfterLogout = await fetch(`${baseUrl}/api/settings`, {
      headers: { Cookie: refreshedCookieHeader },
    });
    assert.equal(settingsAfterLogout.status, 401);

    console.log(
      `Demo smoke test passed (${completedItems} seeded progress items).`,
    );
  } finally {
    await closeServer(server);
  }
};

export { run };

const isDirectRun = Boolean(
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href,
);

if (isDirectRun) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
