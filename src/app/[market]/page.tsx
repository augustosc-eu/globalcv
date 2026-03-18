'use client';

import { use } from 'react';
import { Market } from '@/types/cv.types';
import WizardShell from '@/components/wizard/WizardShell';

export default function MarketBuilderPage({
  params,
}: {
  params: Promise<{ market: string }> | { market: string };
}) {
  // Support both sync params (Next 14) and async params (Next 15+)
  const resolvedParams = 'then' in params ? use(params as Promise<{ market: string }>) : params;
  const market = resolvedParams.market as Market;
  return <WizardShell market={market} />;
}
