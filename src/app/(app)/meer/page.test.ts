import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ prefs: { palette: "zonsopgang", theme: "system" } as { palette: string; theme: string } }));
vi.mock("@/data/supabase/server", () => ({ readPrefs: async () => m.prefs }));
vi.mock("@/data/actions/profile", () => ({ saveProfileAction: vi.fn() }));
vi.mock("@/data/actions/auth", () => ({ logoutAction: vi.fn() }));
vi.mock("@/data/actions/push", () => ({ removePushSubscriptionAction: vi.fn(), savePushSubscriptionAction: vi.fn() }));
// Marks every link that goes through next/link, to see which ones do not.
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => createElement("a", { href, "data-next-link": "", ...rest }, children) }));

import MorePage from "./page";

const render = async () => renderToStaticMarkup(await MorePage()).replace(/<!-- -->/g, "");
const headings = (out: string, level: number) => [...out.matchAll(new RegExp(`<h${level}[^>]*>(.*?)</h${level}>`, "g"))].map((x) => x[1].replace(/<[^>]+>/g, ""));
const anchor = (out: string, href: string) => new RegExp(`<a [^>]*href="${href.replaceAll("/", "\\/")}"[^>]*>`).exec(out)?.[0] ?? "";

beforeEach(() => {
  m.prefs = { palette: "zonsopgang", theme: "system" };
});

describe("the Profiel page (spec 8.7)", () => {
  test("has one h1 and the sections in order, with the Profiel tab active", async () => {
    const out = await render();
    expect(headings(out, 1)).toEqual(["Profiel"]);
    expect(headings(out, 2)).toEqual(["Je gegevens", "Uiterlijk", "Zet de app op je beginscherm", "Feedback", "Privacy en account"]);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(anchor(out, "/meer")).toContain('aria-current="page"');
  });

  test("names its regions with aria-label, not with generated ids (see the plan page test)", async () => {
    const out = await render();
    for (const name of ["Je gegevens", "Uiterlijk", "Privacy en account"]) expect(out).toContain(`<section aria-label="${name}"`);
    expect(out).not.toContain("aria-labelledby");
  });

  test("links to the settings pages, privacy, the password and account deletion", async () => {
    const out = await render();
    for (const [href, label] of [
      ["/meer/profiel", "Je naam"],
      ["/meer/feedback", "Feedback geven"],
      ["/meer/inkomen", "Inkomen"],
      ["/meer/uitgaven", "Uitgaven"],
      ["/meer/plan", "Spaarplan"],
      ["/meer/context", "Wat de app over je weet"],
      ["/privacy", "Privacy"],
      ["/wachtwoord-wijzigen", "Wachtwoord wijzigen"],
      ["/meer/account", "Account wissen"],
    ]) {
      expect(out, href).toMatch(new RegExp(`<a [^>]*href="${href.replaceAll("/", "\\/")}"[^>]*>${label}<`));
    }
  });

  test("offers the export as a plain download link: not next/link (it would prefetch the download)", async () => {
    const a = anchor(await render(), "/api/export");
    expect(a).not.toBe("");
    expect(a).not.toContain("data-next-link");
    expect(a).toContain("download");
  });

  test("has a logout button in a form", async () => {
    expect(await render()).toMatch(/<form[^>]*>\s*<button[^>]*type="submit"[^>]*>Uitloggen<\/button><\/form>/);
  });

  test("shows the four palettes and the three themes with the stored ones chosen", async () => {
    m.prefs = { palette: "smaragd", theme: "dark" };
    const out = await render();
    for (const name of ["Zonsopgang", "Smaragd", "Lagune", "Kersen", "Licht", "Donker", "Systeem"]) expect(out).toContain(name);
    const chosen = [...out.matchAll(/<input[^>]*type="radio"[^>]*checked=""[^>]*value="([^"]+)"/g)].map((x) => x[1]);
    expect(chosen).toEqual(["smaragd", "dark"]);
  });

  test("uses generated ids and no em dash", async () => {
    const out = await render();
    const ids = [...out.matchAll(/ id="([^"]+)"/g)].map((x) => x[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(out).not.toContain(String.fromCharCode(0x2014));
  });
});
