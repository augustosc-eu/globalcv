'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';

type BrandVariant = 'nav' | 'legal' | 'editor';

interface BrandLinkProps {
  href?: string;
  variant?: BrandVariant;
  className?: string;
}

const LOGO_SRC = process.env.NEXT_PUBLIC_BRAND_LOGO_SRC || '/brand/globalcv-logo.png';

const WRAPPER_CLASSES: Record<BrandVariant, string> = {
  nav: 'h-10 w-[186px]',
  legal: 'h-11 w-[210px]',
  editor: 'h-8 w-[160px]',
};

export default function BrandLink({
  href = '/',
  variant = 'nav',
  className = '',
}: BrandLinkProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <Link
      href={href}
      className={`inline-flex items-center text-slate-900 transition-opacity hover:opacity-85 ${className}`}
      aria-label="GlobalCV home"
    >
      {!logoError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_SRC}
          alt="GlobalCV"
          className={`${WRAPPER_CLASSES[variant]} object-contain object-left`}
          onError={() => setLogoError(true)}
        />
      ) : (
        <span className="inline-flex items-center gap-2 text-sm font-bold">
          <FileText size={16} className="text-blue-600" />
          GlobalCV
        </span>
      )}
    </Link>
  );
}

