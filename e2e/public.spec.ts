import { expect, test } from "@playwright/test";

// The browser fetches the manifest, the icons and the worker without cookies, so none of them may need a session.
test("the manifest is public and makes the app installable", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ name: "Spaarplanner", start_url: "/overzicht", display: "standalone" });
});

test("the manifest icons are public images", async ({ request }) => {
  const { icons } = await (await request.get("/manifest.webmanifest")).json();
  expect(icons).toHaveLength(4);
  for (const { src } of icons) {
    const response = await request.get(src);
    expect(response.status(), src).toBe(200);
    expect(response.headers()["content-type"], src).toBe("image/png");
  }
});

// The URL is where Turbopack puts a worker registered with new URL(..., import.meta.url) (Next 16.4). Without
// Service-Worker-Allowed: / the browser refuses scope "/" for a script under /_next/.
test("the service worker is JavaScript that may control the whole site", async ({ request }) => {
  const response = await request.get("/_next/static/service-worker/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/javascript/);
  expect(response.headers()["service-worker-allowed"]).toBe("/");
});
