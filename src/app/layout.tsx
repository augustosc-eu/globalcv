import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GlobalCV — Build Professional Resumes for Global Markets',
  description:
    'Create ATS-optimized resumes for the US, Europass CVs for Europe, traditional CVs for Latin America, and official 履歴書 for Japan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
