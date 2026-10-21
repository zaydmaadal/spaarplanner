import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import PrivacyPage from "./page";

const html = renderToStaticMarkup(createElement(PrivacyPage));
const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the privacy page (spec 12)", () => {
  test("has one h1 and names who is responsible", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(text).toContain("Zayd Maadal");
  });

  test("lists the data, every processor, the backups and their term", () => {
    for (const word of ["gebruikersnaam", "inkomen", "spaardoelen", "checklist", "Supabase", "Frankfurt", "Vercel", "GitHub", "Google", "Apple", "Mozilla", "90 dagen"]) {
      expect(text).toContain(word);
    }
  });

  test("links to the export as a plain link (no download attribute: a logged-out click must not save the login page) and to account deletion", () => {
    expect(html).toMatch(/<a[^>]*href="\/api\/export"/);
    expect(html).not.toMatch(/<a[^>]*href="\/api\/export"[^>]*download/);
    expect(html).toMatch(/<a[^>]*href="\/meer\/account"/);
  });

  test("says the technical keys of the notifications are not in the export", () => {
    expect(text).toContain("Je krijgt één bestand met je gegevens, op de technische sleutels van je meldingen na.");
  });

  test("uses no em dash", () => expect(html).not.toContain(String.fromCharCode(0x2014)));
});
