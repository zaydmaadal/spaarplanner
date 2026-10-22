"use client";

import type { ReactNode } from "react";
import { logoutAction } from "@/data/actions/auth";
import { unsubscribeFromPush } from "@/lib/push-client";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A shared device must not keep the previous user's push subscription (spec 7). Logging out never waits long for that.
export function LogoutForm({ children }: { children: ReactNode }) {
  return (
    <form
      action={async () => {
        await Promise.race([unsubscribeFromPush(), wait(3000)]);
        await logoutAction();
      }}
    >
      {children}
    </form>
  );
}
