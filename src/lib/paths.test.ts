import { describe, expect, it } from "vitest";
import { hideAdminPath, isAdminPath, isPublicPath, redirectTarget } from "./paths";

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

  it.each(["/", "/overzicht", "/beheer", "/api/other", "/api/export", "/meer/account", "/inloggen-nep", "/api/cronjob"])(
    "%s needs a session",
    (p) => expect(isPublicPath(p)).toBe(false),
  );
});

describe("redirectTarget", () => {
  const flagged = { app_metadata: { must_change_password: true } };
  const normal = { app_metadata: {} };

  it("lets visitors without a session onto public paths", () =>
    expect(redirectTarget("/privacy", null)).toBeNull());
  it("sends visitors without a session to /inloggen", () =>
    expect(redirectTarget("/overzicht", null)).toBe("/inloggen"));
  it("sends flagged users to /wachtwoord-wijzigen", () =>
    expect(redirectTarget("/overzicht", flagged)).toBe("/wachtwoord-wijzigen"));
  it("does not loop on /wachtwoord-wijzigen", () =>
    expect(redirectTarget("/wachtwoord-wijzigen", flagged)).toBeNull());
  it("leaves public paths alone for flagged users", () =>
    expect(redirectTarget("/manifest.webmanifest", flagged)).toBeNull());
  it("lets normal users through", () => expect(redirectTarget("/overzicht", normal)).toBeNull());
  it("keeps /wachtwoord-wijzigen private without a session", () =>
    expect(redirectTarget("/wachtwoord-wijzigen", null)).toBe("/inloggen"));
});

describe("isAdminPath", () => {
  it.each(["/beheer", "/beheer/", "/beheer/x"])("%s is admin only", (p) => expect(isAdminPath(p)).toBe(true));
  it.each(["/", "/beheerder", "/x/beheer", "/Beheer"])("%s is not", (p) => expect(isAdminPath(p)).toBe(false));
});

describe("hideAdminPath", () => {
  const admins = ["admin-1"];
  it("shows /beheer to an admin", () => expect(hideAdminPath("/beheer", "admin-1", admins)).toBe(false));
  it("hides /beheer and below from other users", () => {
    expect(hideAdminPath("/beheer", "user-1", admins)).toBe(true);
    expect(hideAdminPath("/beheer/x", "user-1", admins)).toBe(true);
  });
  it("hides /beheer when nobody is an admin or there is no sub", () => {
    expect(hideAdminPath("/beheer", "user-1", [])).toBe(true);
    expect(hideAdminPath("/beheer", undefined, admins)).toBe(true);
    expect(hideAdminPath("/beheer", undefined, [])).toBe(true);
  });
  it("leaves other paths alone", () => expect(hideAdminPath("/overzicht", "user-1", admins)).toBe(false));
});
