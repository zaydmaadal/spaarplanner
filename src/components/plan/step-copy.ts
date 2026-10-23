import { CalendarClock, Coins, HeartPulse, ListChecks, Repeat, Search, Target, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";

export type StepCopy = { title: string; Icon: LucideIcon; detail: string | null; action: { label: string; href: string } };

const SOON = { label: "Bekijk", href: "/plan" };

// The short face of a step: an icon, a title of a few words and the screen where it gets done. The long sentence of the
// rule stays as the explanation behind the info icon. Own steps (empty key) and unknown rules show their title as it is.
export function stepCopy(key: string, title: string): StepCopy {
  const [kind, id] = key.split(":");
  const short = (shortTitle: string, Icon: LucideIcon, action = SOON): StepCopy => ({ title: shortTitle, Icon, detail: title, action });
  switch (kind) {
    case "deposit":
      return { title, Icon: Wallet, detail: null, action: { label: "Storten", href: "/storten" } };
    case "negative_budget":
      return short("Je geeft meer uit dan je verdient", TriangleAlert, { label: "Uitgaven", href: "/meer/uitgaven" });
    case "over_target":
      return short("Je spaardoel is te hoog", TriangleAlert, { label: "Spaarplan", href: "/meer/plan" });
    case "standing_order":
      return short("Overschrijving klaarzetten", Repeat);
    case "goal_unreachable":
      return short("Je haalt de deadline niet", Target, { label: "Bekijk doel", href: `/doelen/${id}` });
    case "estimate":
      return short(title.startsWith("Kijk na") ? "Kijk je noodfonds na" : "Zoek de echte prijs op", Search, { label: "Pas aan", href: `/doelen/${id}/aanpassen` });
    case "ziekenfonds":
      return short("Sluit aan bij een ziekenfonds", HeartPulse);
    case "student_hours":
      return short("Hou je studentenuren bij", CalendarClock);
    case "side_income_tax":
      return short("Zet belastinggeld opzij", Coins);
    case "no_interest":
      return short("Kies een spaarpot zonder rente", Wallet);
    default:
      return { title, Icon: ListChecks, detail: null, action: SOON };
  }
}
