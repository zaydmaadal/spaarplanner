import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/data/actions/account", () => ({ deleteAccountAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import AccountPage from "./page";

const html = renderToStaticMarkup(createElement(AccountPage)).replace(/<!-- -->/g, "");

describe("the account deletion page", () => {
  test("has one h1, says what is wiped, and asks for the password in a labelled field", () => {
    expect(html.match(/<h1[^>]*>Account wissen<\/h1>/g)).toHaveLength(1);
    expect(html).toContain("Je account en al je gegevens worden gewist.");
    expect(html).toMatch(/<label[^>]*for="([^"]+)"[^>]*>Wachtwoord<\/label>/);
    expect(html).toMatch(/<input[^>]*type="password"[^>]*autoComplete="current-password"|<input[^>]*autocomplete="current-password"[^>]*type="password"/);
  });

  test("starts with the destructive button only: nothing is confirmed yet", () => {
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Account wissen<\/button>/); // not a submit button: only the second step submits
    expect(html).not.toContain('type="submit"');
    expect(html).not.toContain("Weet je het zeker?");
    expect(html).not.toContain("Annuleren");
  });

  test("offers the export first as a plain download link (WebKit needs the attribute), and keeps the Meer tab active", () => {
    expect(html).toMatch(/<a[^>]*href="\/api\/export"/);
    expect(html).toMatch(/<a[^>]*href="\/api\/export"[^>]*download/); // WebKit only downloads with the attribute
    expect(html).toMatch(/href="\/meer"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/meer"/);
  });
});
