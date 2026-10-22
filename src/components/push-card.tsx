"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { pushStatus, subscribeToPush, unsubscribeFromPush } from "@/lib/push-client";

// "loading" is all the server and the first client render know, so the browser APIs are only read after it.
function usePush() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof pushStatus>> | "loading">("loading");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void pushStatus().then(setStatus);
  }, []);

  async function change(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    await run().catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Er ging iets mis. Probeer het opnieuw."));
    setStatus(await pushStatus());
    setBusy(false);
  }
  // Both start synchronously in the click: the permission prompt must be asked inside the tap.
  const turnOn = () =>
    change(async () => {
      const result = await subscribeToPush();
      if (result === "ok") toast.success("Meldingen staan aan.");
      else toast.error(result === "denied" ? "Je gaf geen toestemming voor meldingen." : "Dit toestel kan geen meldingen tonen.");
    });
  const turnOff = () =>
    change(async () => {
      await unsubscribeFromPush();
      toast.success("Meldingen staan uit op dit toestel.");
    });
  return { status, busy, turnOn, turnOff };
}

// Spec 9: only in the installed app, before permission was asked, on a device without a subscription.
export function PushCard() {
  const { status, busy, turnOn } = usePush();
  if (status !== "off" || Notification.permission !== "default" || !matchMedia("(display-mode: standalone)").matches) return null;
  return (
    <section aria-label="Meldingen aanzetten" className="flex flex-col gap-3 rounded-strip bg-surface p-4">
      <h2 className="font-display text-lg font-semibold">Krijg een melding op loondag</h2>
      <p className="text-ink-2">Dan vul je meteen in wat je opzijzette.</p>
      <Button onClick={() => void turnOn()} disabled={busy}>
        Meldingen aanzetten
      </Button>
    </section>
  );
}

// The Meldingen card of Meer, per device. It is left out when this browser cannot do push.
export function PushSettings() {
  const { status, turnOn, turnOff } = usePush();
  if (status === "loading" || status === "unsupported") return null;
  return (
    <section aria-label="Meldingen" className="flex flex-col gap-2 rounded-card bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">Meldingen</h2>
      {status === "denied" ? (
        <p className="text-ink-2">Meldingen staan uit voor Spaarplanner. Zet ze aan in de instellingen van je toestel.</p>
      ) : (
        <CheckField
          label="Melding op loondag"
          hint="Alleen op dit toestel."
          checked={status === "on"}
          onChange={(on) => void (on ? turnOn() : turnOff())}
        />
      )}
    </section>
  );
}
