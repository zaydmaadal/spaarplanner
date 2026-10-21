import { describe, expect, it } from "vitest";
import { isPublicPath } from "./paths";

describe("isPublicPath", () => {
  it.each([
    "/inloggen",
    "/registreren",
    "/privacy",
    "/api/cron/loondag",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/_next/static/x.js",
  ])("%s is public", (p) => expect(isPublicPath(p)).toBe(true));

  it.each(["/", "/overzicht", "/beheer", "/api/other", "/inloggen-nep", "/api/cronjob"])(
    "%s needs a session",
    (p) => expect(isPublicPath(p)).toBe(false),
  );
});
