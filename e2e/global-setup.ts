import { ensureAdmin } from "./helpers";

// Once, before the workers start: the iPhone and Pixel projects would otherwise race to create the same admin.
export default async function globalSetup() {
  await ensureAdmin();
}
