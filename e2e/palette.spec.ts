import { expect, test } from "@playwright/test";
import { adminClient, loginAs, seedHaider } from "./helpers";

const rand = () => Math.random().toString(36).slice(2, 8);
const html = (page: import("@playwright/test").Page) => page.locator("html");

test("nachtblauw is the default, and the login page shows the look of the last user", async ({ page, context, browser }) => {
  await page.goto("/inloggen");
  await expect(html(page)).toHaveAttribute("data-palette", "nachtblauw");

  const username = `look-${rand()}`;
  const id = await seedHaider(username);
  const { error } = await adminClient().from("profiles").update({ prefs: { palette: "zand", theme: "dark" } }).eq("id", id);
  if (error) throw error;
  await loginAs(page, username);
  await expect(html(page)).toHaveAttribute("data-palette", "zand");
  await expect(html(page)).toHaveAttribute("data-theme", "dark");

  // Signing in left the look in a cookie; a visitor with only that cookie (signed out) gets it on the very first paint.
  const look = (await context.cookies()).find((c) => c.name === "sp-look");
  expect(look?.value).toBe("zand.dark");
  const signedOut = await browser.newContext({ baseURL: page.url().split("/overzicht")[0] });
  await signedOut.addCookies([{ name: "sp-look", value: look!.value, url: page.url() }]);
  const login = await signedOut.newPage();
  await login.goto("/inloggen");
  await expect(html(login)).toHaveAttribute("data-palette", "zand");
  await expect(html(login)).toHaveAttribute("data-theme", "dark");
  await signedOut.close();
});

test("the palette picker offers six palettes and remembers the choice", async ({ page, context }) => {
  const username = `pick-${rand()}`;
  await seedHaider(username);
  await loginAs(page, username);
  await page.goto("/meer");
  const picker = page.getByRole("group", { name: "Kleurenpalet" });
  await expect(picker.getByRole("radio")).toHaveCount(6);
  await picker.getByText("Smaragd & goud").click();
  await expect(html(page)).toHaveAttribute("data-palette", "smaragd");
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "sp-look")?.value).toMatch(/^smaragd\./);
});
