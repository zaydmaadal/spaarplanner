import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { adminClient, fillAndSubmit, hydrated, loginAs, password, seedHaider } from "./helpers";

// Each test signs in once or twice (GoTrue limits sign-ins per IP), so a test is a few steps that build on each other.
// Everything is found through the visible page: Next keeps the previous screens mounted but hidden.

const rand = () => Math.random().toString(36).slice(2, 8);

test("/privacy opens without a session, and the export does not", async ({ page, request }) => {
  await page.goto("/privacy");
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy", exact: true })).toBeVisible();
  await expect(page.getByText("Zayd Maadal")).toBeVisible();

  // The proxy sends a visitor without a session to the login page, the same as for every other private path.
  const res = await request.get("/api/export", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toMatch(/\/inloggen$/);
});

test("the export is one JSON download with only the own rows and no push keys", async ({ page }) => {
  const username = `export-${rand()}`;
  const id = await seedHaider(username);
  // Somebody else with a goal that must stay out, and a subscription of this user whose keys must stay out.
  const other = await seedHaider(`export-ander-${rand()}`);
  const admin = adminClient();
  const writes = await Promise.all([
    admin.from("goals").update({ name: "Doel van een ander" }).eq("user_id", other).eq("kind", "trip"),
    admin.from("push_subscriptions").insert({ user_id: id, endpoint: "https://fcm.googleapis.com/fcm/send/e2e", p256dh: "p256dh-geheim", auth: "auth-geheim", user_agent: "e2e" }),
  ]);
  for (const { error } of writes) expect(error).toBeNull();
  await loginAs(page, username);

  await test.step("the link on the privacy page downloads spaarplanner-export.json", async () => {
    await page.goto("/privacy");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Gegevens downloaden", exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("spaarplanner-export.json");
    const text = await readFile((await download.path())!, "utf8");
    const data = JSON.parse(text);

    expect(Object.keys(data).sort()).toEqual(
      ["exported_at", "profiles", "plans", "income_sources", "budget_lines", "goals", "transactions", "checklist_items", "push_subscriptions"].sort(),
    );
    expect(data.goals.map((g: { name: string }) => g.name).sort()).toEqual(["Noodfonds", "Reis"]);
    expect(data.profiles).toEqual([expect.objectContaining({ id, username })]);
    expect(data.push_subscriptions).toHaveLength(1);
    for (const secret of ["Doel van een ander", other, "p256dh-geheim", "auth-geheim", "fcm.googleapis.com"]) expect(text).not.toContain(secret);
  });

  await test.step("it is never cached", async () => {
    const res = await page.request.get("/api/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    expect(res.headers()["content-disposition"]).toBe('attachment; filename="spaarplanner-export.json"');
    expect(res.headers()["cache-control"]).toBe("no-store");
  });
});

test("deleting the account asks for the password and a second tap, wipes the rows and ends the login", async ({ page }) => {
  const username = `wissen-${rand()}`;
  const id = await seedHaider(username);
  const admin = adminClient();
  await loginAs(page, username);

  await page.goto("/meer/account");
  await hydrated(page);
  await expect(page.getByRole("heading", { level: 1, name: "Account wissen", exact: true })).toBeVisible();
  await expect(page.getByText("Je account en al je gegevens worden gewist.")).toBeVisible();
  const form = page.locator("form").filter({ visible: true });
  await form.getByLabel("Wachtwoord", { exact: true }).fill(password);

  await test.step("the first tap only asks if you are sure, nothing is deleted", async () => {
    await form.getByRole("button", { name: "Account wissen", exact: true }).click();
    await expect(form.getByText("Weet je het zeker? Dit kan niet ongedaan worden gemaakt.", { exact: true })).toBeVisible();
    expect((await admin.auth.admin.getUserById(id)).data.user).not.toBeNull();
  });

  await test.step("the second tap deletes the account and sends you to the login page", async () => {
    await form.getByRole("button", { name: "Ja, wis mijn account", exact: true }).click();
    await expect(page).toHaveURL(/\/inloggen$/);
    expect((await admin.auth.admin.getUserById(id)).data.user).toBeNull();
    for (const table of ["plans", "income_sources", "goals"] as const) {
      expect((await admin.from(table).select("user_id").eq("user_id", id)).data).toEqual([]);
    }
    expect((await admin.from("profiles").select("id").eq("id", id)).data).toEqual([]);
  });

  await test.step("logging in again fails", async () => {
    await fillAndSubmit(page, username, password, "Inloggen");
    await expect(page.getByText("Je gebruikersnaam of wachtwoord klopt niet.")).toBeVisible();
    await expect(page).toHaveURL(/\/inloggen$/);
  });
});
