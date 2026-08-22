import { pathToFileURL } from "node:url";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRYABLE_STATUS = new Set([408, 425, 429]);

const fail = (message) => {
  throw new Error(message);
};

export function validateConfig(env = process.env) {
  const project = env.SUPABASE_PROJECT;
  const projectRef = env.SUPABASE_PROJECT_REF;
  const rawUrl = env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;

  if (!project || !/^[a-z0-9_-]{1,40}$/.test(project)) {
    fail("SUPABASE_PROJECT is missing or invalid.");
  }
  if (!projectRef || !/^[a-z]{20}$/.test(projectRef)) {
    fail("SUPABASE_PROJECT_REF is missing or invalid.");
  }
  if (!rawUrl) {
    fail("SUPABASE_URL is required.");
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    fail("SUPABASE_URL is invalid.");
  }

  const expectedOrigin = `https://${projectRef}.supabase.co`;
  if (
    url.origin !== expectedOrigin ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    fail("SUPABASE_URL does not match SUPABASE_PROJECT_REF.");
  }

  if (!publishableKey) {
    fail("SUPABASE_PUBLISHABLE_KEY is required.");
  }
  if (
    publishableKey.startsWith("sb_secret_") ||
    publishableKey.startsWith("eyJ") ||
    !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey)
  ) {
    fail("Only a modern Supabase publishable key is accepted.");
  }

  return {
    project,
    endpoint: `${expectedOrigin}/rest/v1/rpc/keepalive_ping`,
    publishableKey,
  };
}

const shouldRetry = (status) => RETRYABLE_STATUS.has(status) || status >= 500;

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runKeepalive({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep = wait,
} = {}) {
  const config = validateConfig(env);
  if (typeof fetchImpl !== "function") {
    fail("A Fetch API implementation is required.");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          "Content-Type": "application/json",
          "X-Client-Info": "supabase-keepalive/2.0",
        },
        body: "{}",
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(250 * attempt);
        continue;
      }
      fail(`${config.project} keepalive failed after ${MAX_ATTEMPTS} network attempts.`);
    }

    if (!response.ok) {
      if (attempt < MAX_ATTEMPTS && shouldRetry(response.status)) {
        await sleep(250 * attempt);
        continue;
      }
      fail(`${config.project} keepalive failed with HTTP ${response.status}.`);
    }

    let result;
    try {
      result = JSON.parse(await response.text());
    } catch {
      fail(`${config.project} keepalive returned an invalid response.`);
    }
    if (result !== "ok") {
      fail(`${config.project} keepalive returned an unexpected response.`);
    }

    return { project: config.project, status: response.status, attempts: attempt };
  }

  fail(`${config.project} keepalive did not complete.`);
}

async function main() {
  try {
    const result = await runKeepalive();
    console.log(`${result.project} keepalive succeeded (HTTP ${result.status}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Keepalive failed.";
    console.error(`::error::${message.replace(/[\r\n]/g, " ")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
