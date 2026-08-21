/**
 * The "Hoe het werkt" steps, shared between the rendered section on the landing
 * page and the HowTo JSON-LD on app/page.tsx.
 *
 * Structured data has to describe what a visitor actually sees. Keeping one
 * array means the schema can never claim four steps while the page shows three.
 */
export interface HowItWorksStep {
  num: string;
  /** Icon is picked in the component - this module stays free of JSX imports. */
  icon: "account" | "book" | "commentary";
  title: string;
  desc: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    num: "01",
    icon: "account",
    title: "Maak een gratis account aan",
    desc: "Registreer u met uw e-mailadres of log in met Google. Uw voortgang en notities worden automatisch opgeslagen.",
  },
  {
    num: "02",
    icon: "book",
    title: "Kies een bijbelboek of leesplan",
    desc: "Begin direct met lezen of schrijf u in voor een leesplan. Kies uw favoriete bijbelvertaling.",
  },
  {
    num: "03",
    icon: "commentary",
    title: "Ontdek grondteksten en commentaren",
    desc: "Verken de oorspronkelijke teksten met commentaren van erkende Bijbelgeleerden en verdiep je begrip.",
  },
];
