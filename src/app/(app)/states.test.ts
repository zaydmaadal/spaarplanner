import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import OnboardingError from "@/app/onboarding/error";
import AppError from "./error";

describe("the error state of the app screens (spec 8.8)", () => {
  const html = renderToStaticMarkup(createElement(AppError, { retry: () => {}, error: new Error("geheime details"), reset: () => {} } as never));

  test("says what went wrong, offers a retry and a way out, and shows nothing of the error", () => {
    expect(html).toContain("Dit lukt nu even niet");
    expect(html).toMatch(/<button[^>]*>Opnieuw proberen<\/button>/);
    expect(html).toMatch(/<a[^>]*href="\/overzicht"[^>]*>Naar je overzicht<\/a>/);
    expect(html).not.toContain("geheime");
    expect(html).not.toContain("digest");
    expect(html).not.toContain(String.fromCharCode(0x2014));
  });

  test("the onboarding, outside the app group, shows the same card", () => {
    expect(OnboardingError).toBe(AppError);
  });
});
