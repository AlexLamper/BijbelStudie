import React from 'react';

import StudyFlowVariantSwitcher from '../../StudyFlowVariantSwitcher';

/**
 * De strook die zegt: dit is een ontwerp in beoordeling.
 *
 * Bewust buiten het ontwerp gehouden - kaartachtergrond, gedempte tekst, eigen
 * randlijn. Alles eronder is het voorstel; deze regel is het meubilair van de
 * beoordelaar. Hij draagt ook de enige eerlijke disclaimer die de drie schermen
 * nodig hebben (de voortgang is verzonnen), zodat geen enkel los onderdeel zich
 * daarvoor hoeft te verontschuldigen.
 */
export default function ReviewStrip({ sticky = true }: { sticky?: boolean }) {
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5',
        'border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur sm:px-6 dark:border-border dark:bg-card/95',
        sticky ? 'sticky top-0 z-40' : '',
      ].join(' ')}
    >
      <StudyFlowVariantSwitcher />
      <p className="text-[11px] leading-none text-gray-400 dark:text-muted-foreground">
        Ontwerpvoorbeeld - voortgang is voorbeelddata en wordt niet opgeslagen.
      </p>
    </div>
  );
}
