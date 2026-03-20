import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Market } from '@/types/cv.types';
import PrivacyBanner from '@/components/shared/PrivacyBanner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

const validMarkets: Market[] = ['us', 'eu', 'latam', 'jp', 'gb', 'au', 'in', 'br'];

const marketMeta: Record<Market, { title: string; description: string }> = {
  us: {
    title: 'US Resume Builder — ATS-Optimized',
    description: 'Build a professional, ATS-friendly resume for the US job market.',
  },
  eu: {
    title: 'EU CV Builder — Europass Format',
    description: 'Create a professional Europass-compatible CV for European employers.',
  },
  latam: {
    title: 'Latin America CV Builder',
    description: 'Build a traditional CV tailored for the Latin American job market.',
  },
  jp: {
    title: '履歴書・職務経歴書ビルダー — Japan CV',
    description: '日本の採用基準に準じた履歴書・職務経歴書を作成します。',
  },
  gb: {
    title: 'UK CV Builder — British CV Format',
    description: 'Build a professional CV following UK conventions — A4, no photo, 2 pages.',
  },
  au: {
    title: 'Australian Resume Builder',
    description: 'Create a resume tailored for the Australian and New Zealand job market.',
  },
  in: {
    title: 'India CV Builder',
    description: 'Build a professional CV tailored for the Indian job market.',
  },
  br: {
    title: 'Criador de Currículo — Brasil',
    description: 'Crie um currículo profissional no padrão brasileiro.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market } = await params;
  if (!validMarkets.includes(market as Market)) return {};
  return marketMeta[market as Market];
}

export default async function MarketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!validMarkets.includes(market as Market)) {
    notFound();
  }
  return (
    <ErrorBoundary>
      <PrivacyBanner />
      {children}
    </ErrorBoundary>
  );
}
