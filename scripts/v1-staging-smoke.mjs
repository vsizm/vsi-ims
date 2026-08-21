const baseUrl = (process.env.VSI_BASE_URL || "https://vsi-ims-staging.vercel.app").replace(/\/$/, "");
const email = process.env.VSI_AUTH_EMAIL;
const password = process.env.VSI_SEED_PASSWORD || process.env.VSI_AUTH_PASSWORD;

if (!email || !password) {
  throw new Error("VSI_AUTH_EMAIL and VSI_SEED_PASSWORD (or VSI_AUTH_PASSWORD) are required");
}

const failures = [];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
  });
  return response;
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

console.log(`V1 staging smoke: ${baseUrl}`);

const health = await request("/api/health");
const healthBody = await health.text();
assert(health.status === 200, `health returned HTTP ${health.status}`);
try {
  const payload = JSON.parse(healthBody);
  assert(payload.status === "ok", "health status is not ok");
  assert(payload.databaseConfigured === true, "health reports databaseConfigured=false");
  assert(payload.apiKeyConfigured === true, "health reports apiKeyConfigured=false");
} catch {
  fail("health did not return valid JSON");
}

const protectedApi = await request("/api/programmes");
assert(protectedApi.status === 401, `unauthenticated /api/programmes returned HTTP ${protectedApi.status}, expected 401`);

const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await login.text();
assert(login.status === 200, `login returned HTTP ${login.status}`);

let sessionCookie = "";
try {
  const payload = JSON.parse(loginBody);
  assert(payload.authenticated === true, "login response did not authenticate the session");
} catch {
  fail("login did not return valid JSON");
}

const setCookie = login.headers.get("set-cookie") || "";
const cookieMatch = setCookie.match(/(?:^|,\s*)vsi_session=([^;]+)/);
if (cookieMatch) sessionCookie = `vsi_session=${cookieMatch[1]}`;
else fail("login did not return a vsi_session cookie");

const authMe = await request("/api/auth/me", {
  headers: { cookie: sessionCookie },
});
const authMeBody = await authMe.text();
assert(authMe.status === 200, `authenticated /api/auth/me returned HTTP ${authMe.status}`);
try {
  const payload = JSON.parse(authMeBody);
  assert(payload.authenticated === true, "auth/me did not report authenticated=true");
  assert(payload.email === email, "auth/me email does not match the configured test account");
} catch {
  fail("auth/me did not return valid JSON");
}

const dashboard = await request("/dashboard", {
  headers: { cookie: sessionCookie },
});
const dashboardBody = await dashboard.text();
assert(dashboard.status === 200, `authenticated /dashboard returned HTTP ${dashboard.status}`);
for (const fingerprint of ["__next_error__", "Application error", "Internal Server Error", '"digest"']) {
  assert(!dashboardBody.includes(fingerprint), `dashboard contains error fingerprint: ${fingerprint}`);
}

if (failures.length) {
  console.error(`\nV1 staging smoke failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("V1 staging smoke passed: health, API protection, login, session, and dashboard are healthy.");
