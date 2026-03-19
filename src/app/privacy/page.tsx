import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — GlobalCV',
  description: 'How GlobalCV handles your data. Spoiler: we don\'t.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-10 transition-colors">
          <FileText size={16} /> GlobalCV
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">The short version</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-2">
              <p className="font-medium text-blue-900">We do not store your CV data.</p>
              <p className="font-medium text-blue-900">All data is processed locally in your browser.</p>
              <p className="font-medium text-blue-900">We do not have access to your information.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Who we are</h2>
            <p>
              GlobalCV is a free, open-source CV and resume builder built by Augusto Santa Cruz.
              The source code is publicly available at{' '}
              <a href="https://github.com/augustosc-eu/globalcv" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                github.com/augustosc-eu/globalcv
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What data we collect</h2>
            <p className="font-medium text-gray-900 mb-1">None.</p>
            <p>
              GlobalCV is a fully client-side application. Everything you type — your name, work history,
              education, skills — is processed entirely within your own browser. No data is ever
              transmitted to our servers or any third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">How your data is stored</h2>
            <p className="mb-3">
              Your CV data is saved automatically to your browser&apos;s <strong>localStorage</strong> — a
              storage mechanism built into your browser that is private to your device. This allows
              the app to restore your progress if you close and reopen the tab.
            </p>
            <p className="mb-3">
              This data <strong>never leaves your device</strong>. We have no access to it, cannot read it,
              and cannot recover it if lost.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
              <strong>Important:</strong> If you are using a shared or public computer, your CV data
              may be accessible to other users of that device. Use the &quot;Clear Data&quot; button in the
              app before leaving, or enable Privacy Mode to keep data in memory only.
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Share links</h2>
            <p>
              The &quot;Share&quot; feature generates a URL that contains your full CV data, compressed and
              encoded directly in the URL. This data is <strong>not encrypted</strong>. Anyone who has the
              link can view your CV. Share links are entirely optional and generated on demand.
              We do not store or log share URLs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Analytics and tracking</h2>
            <p>
              GlobalCV does not use any analytics, tracking pixels, advertising scripts, or third-party
              monitoring tools. There are no cookies set by the application itself.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Hosting provider</h2>
            <p>
              GlobalCV is hosted on <a href="https://vercel.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Vercel</a>.
              Vercel may collect standard server access logs (such as IP addresses and request metadata)
              as part of their infrastructure operations. This is subject to{' '}
              <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Vercel&apos;s Privacy Policy
              </a>. We do not have access to these logs in a form that identifies individual users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">GDPR and your rights</h2>
            <p className="mb-3">
              Because we do not collect or process any personal data on our servers, most GDPR rights
              (access, rectification, erasure, portability) are exercised directly by you within the app:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Access / portability:</strong> Export your CV as a PDF at any time.</li>
              <li><strong>Erasure:</strong> Use the &quot;Clear Data&quot; button to delete all data from your browser.</li>
              <li><strong>Privacy Mode:</strong> Disable localStorage entirely — data is kept in memory only and erased when you close the tab.</li>
            </ul>
            <p className="mt-3">
              If you have questions about Vercel&apos;s data processing, contact Vercel directly or refer to their
              Data Processing Agreement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Children</h2>
            <p>
              GlobalCV is not directed at children under 16. We do not knowingly collect any information
              from children. Since we collect no data at all, no special handling is required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Changes to this policy</h2>
            <p>
              If we ever introduce features that change how data is handled (e.g. cloud sync, analytics),
              we will update this policy and clearly communicate the changes. The current version will
              always be available at this URL.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p>
              Questions? Email{' '}
              <a href="mailto:acroix2020@gmail.com" className="text-blue-600 hover:underline">
                acroix2020@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-700 transition-colors">← Home</Link>
          <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </main>
  );
}
