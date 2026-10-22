import { EllipsisVertical, Share } from "lucide-react";

export function InstallGuide() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold">Zet de app op je beginscherm</h2>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">iPhone en iPad</h3>
        <ol className="list-decimal space-y-1 pl-5 text-ink-2">
          <li>Open Spaarplanner in Safari.</li>
          <li>
            Tik op de Deel-knop <Share aria-hidden className="inline size-4 align-text-bottom" />.
          </li>
          <li>
            Kies <strong className="text-ink">Zet op beginscherm</strong>.
          </li>
        </ol>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Android</h3>
        <ol className="list-decimal space-y-1 pl-5 text-ink-2">
          <li>Open Spaarplanner in Chrome.</li>
          <li>
            Tik op het menu <EllipsisVertical aria-hidden className="inline size-4 align-text-bottom" />.
          </li>
          <li>
            Kies <strong className="text-ink">App installeren</strong>.
          </li>
        </ol>
      </div>
      <p className="text-sm text-ink-2">Je logt één keer opnieuw in in de geïnstalleerde app.</p>
    </section>
  );
}
