import assert from "node:assert/strict";
import test from "node:test";

import { runKeepalive, validateConfig } from "./supabase-keepalive.mjs";

const validEnv = () => ({
  SUPABASE_PROJECT: "hamagiku",
  SUPABASE_PROJECT_REF: "srhthxknehzofuzjjrhh",
  SUPABASE_URL: "https://srhthxknehzofuzjjrhh.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"a".repeat(32)}`,
});

test("accepts only the configured Supabase origin", () => {
  assert.equal(
    validateConfig(validEnv()).endpoint,
    "https://srhthxknehzofuzjjrhh.supabase.co/rest/v1/rpc/keepalive_ping",
  );

  for (const badUrl of [
    "http://srhthxknehzofuzjjrhh.supabase.co",
    "https://srhthxknehzofuzjjrhh.supabase.co.evil.example",
    "https://srhthxknehzofuzjjrhh.supabase.co/rest/v1/reports",
  ]) {
    assert.throws(
      () => validateConfig({ ...validEnv(), SUPABASE_URL: badUrl }),
      /does not match/,
    );
  }
});

test("rejects secret and legacy JWT keys without echoing them", () => {
  const forbiddenKeys = [
    `sb_secret_${"s".repeat(32)}`,
    `eyJ${"j".repeat(40)}`,
    "not-a-key",
  ];

  for (const forbiddenKey of forbiddenKeys) {
    assert.throws(
      () =>
        validateConfig({
          ...validEnv(),
          SUPABASE_PUBLISHABLE_KEY: forbiddenKey,
        }),
      (error) => {
        assert.match(error.message, /publishable key/);
        assert.equal(error.message.includes(forbiddenKey), false);
        return true;
      },
    );
  }
});

test("posts only to the dedicated RPC and omits Authorization", async () => {
  let observed;
  const result = await runKeepalive({
    env: validEnv(),
    fetchImpl: async (url, options) => {
      observed = { url, options };
      return new Response(JSON.stringify("ok"), { status: 200 });
    },
  });

  assert.deepEqual(result, { project: "hamagiku", status: 200, attempts: 1 });
  assert.equal(
    observed.url,
    "https://srhthxknehzofuzjjrhh.supabase.co/rest/v1/rpc/keepalive_ping",
  );
  assert.equal(observed.options.method, "POST");
  assert.equal(observed.options.body, "{}");
  assert.equal(observed.options.redirect, "error");
  assert.equal(observed.options.headers.Authorization, undefined);
  assert.equal(
    observed.options.headers.apikey,
    validEnv().SUPABASE_PUBLISHABLE_KEY,
  );
});

test("retries retryable server errors", async () => {
  let attempts = 0;
  const delays = [];
  const result = await runKeepalive({
    env: validEnv(),
    fetchImpl: async () => {
      attempts += 1;
      return attempts < 3
        ? new Response("temporary", { status: 503 })
        : new Response(JSON.stringify("ok"), { status: 200 });
    },
    sleep: async (milliseconds) => delays.push(milliseconds),
  });

  assert.equal(result.attempts, 3);
  assert.deepEqual(delays, [250, 500]);
});

test("does not include an HTTP response body in errors", async () => {
  const sensitiveBody = "database-internal-detail";
  await assert.rejects(
    () =>
      runKeepalive({
        env: validEnv(),
        fetchImpl: async () => new Response(sensitiveBody, { status: 403 }),
      }),
    (error) => {
      assert.match(error.message, /HTTP 403/);
      assert.equal(error.message.includes(sensitiveBody), false);
      return true;
    },
  );
});

test("rejects an unexpected successful response", async () => {
  await assert.rejects(
    () =>
      runKeepalive({
        env: validEnv(),
        fetchImpl: async () =>
          new Response(JSON.stringify({ data: "business-row" }), { status: 200 }),
      }),
    /unexpected response/,
  );
});
