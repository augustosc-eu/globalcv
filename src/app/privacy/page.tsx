import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, SITE_OWNER_NAME, SITE_OWNER_URL } from '@/lib/site';
import TopNav from '@/components/shared/TopNav';
import BrandLink from '@/components/shared/BrandLink';

export const metadata: Metadata = {
  title: 'Privacy Policy — GlobalCV',
  description: 'How GlobalCV handles your data.',
};

export default function PrivacyPage() {
  const ENABLE_POST_JOB = process.env.NEXT_PUBLIC_ENABLE_POST_JOB === 'true';

  return (
    <main className="app-shell-bg soft-grid-bg min-h-screen">
      <TopNav current="privacy" showPostJob={ENABLE_POST_JOB} />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="surface-card rounded-3xl p-7 md:p-10">
          <BrandLink href="/" variant="legal" className="mb-8" />

          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: March 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">The short version</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-2">
              <p className="font-medium text-blue-900">We do not store your CV data on any server.</p>
              <p className="font-medium text-blue-900">All data is processed locally in your browser.</p>
              <p className="font-medium text-blue-900">We do not have access to your information.</p>
              <p className="font-medium text-blue-900">No cookies are set for CV editing; the optional Jobs board uses third-party data sources.</p>
              <p className="font-medium text-blue-900">If you submit a company job posting request, we process only the details you provide to review your listing.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Who we are</h2>
            <p>
              GlobalCV is a free, open-source CV and resume builder by{' '}
              <a href={SITE_OWNER_URL} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                {SITE_OWNER_NAME}
              </a>.
              The source code is publicly available at{' '}
              <a href="https://github.com/augustosc-eu/globalcv" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                github.com/augustosc-eu/globalcv
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What data we collect</h2>
            <p className="font-medium text-gray-900 mb-2">For CV building: none.</p>
            <p>
              GlobalCV is a fully client-side application. Everything you type — your name, work history,
              education, skills — is processed entirely within your own browser. No data is ever
              transmitted to our servers or any third party.
            </p>
            <p className="mt-3">
              For the optional <strong>Post a Job</strong> form, we process business contact details and listing
              information that you submit (company name, contact name/email, role details, and application URL)
              in order to review and handle your posting request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Browser storage used</h2>
            <p className="mb-4">
              The app uses browser <strong>localStorage</strong> only — no cookies of any kind are set.
              localStorage is private to your device and never transmitted over the network.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-600 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Key</th>
                    <th className="px-3 py-2 font-semibold">Purpose</th>
                    <th className="px-3 py-2 font-semibold">Legal basis</th>
                    <th className="px-3 py-2 font-semibold">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-3 py-2 font-mono text-gray-600">cv_maker_v1_{'{market}'}</td>
                    <td className="px-3 py-2">Saves your CV progress so you can resume later</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Until you clear it</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">globalcv_privacy_notice_dismissed</td>
                    <td className="px-3 py-2">Remembers that you dismissed the privacy banner</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Until you clear browser data</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Both entries are <strong>strictly necessary</strong> for the app to function — no consent is required
              under the ePrivacy Directive. You can delete them at any time using the &quot;Clear Data&quot; button
              or your browser&apos;s developer tools.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-3 text-sm text-amber-800">
              <strong>Shared computers:</strong> If you are using a public or shared device, your CV data
              may be accessible to other users. Use the &quot;Clear Data&quot; button before leaving, or enable
              Privacy Mode to disable localStorage entirely.
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Cookies</h2>
            <p>
              <strong>GlobalCV sets no cookies.</strong> The app uses localStorage exclusively (see table above).
              No session cookies, tracking cookies, or third-party cookies are present.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Third-party requests</h2>
            <p className="mb-3">
              For the CV builder flow, assets are self-hosted and no analytics or ad scripts are loaded.
            </p>
            <p className="mb-3">
              For the optional <strong>Jobs</strong> page, our server fetches listings from external job providers
              (for example Remotive, Arbeitnow, Jobicy, RemoteOK, 4dayweek, Himalayas, The Muse).
              This means those providers may receive server-side requests from our infrastructure.
            </p>
            <p className="mb-3">
              Some providers may be disabled by default in production until their usage requirements are validated.
            </p>
            <p className="mb-3">
              For job posting requests, form submissions are sent via our server endpoint and delivered by our email
              provider (Resend) to our inbox.
            </p>
            <p>
              Job listing logos may also be loaded from third-party image hosts directly in your browser.
              In that case, the image host may receive your IP address and user-agent when the image is requested.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Jobs-to-CV market recommendation</h2>
            <p className="mb-3">
              In the Jobs section, GlobalCV may show a suggested CV market (for example US, UK, EU, LATAM, BR, IN, JP)
              based on the listing&apos;s region and location text. This helps you jump directly to the most relevant CV template.
            </p>
            <p>
              This recommendation is computed in-app from job listing metadata and is not based on a personal profile.
              We do not store, track, or share recommendation history.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Share links</h2>
            <p className="mb-2">
              The optional &quot;Share&quot; feature generates a URL containing your CV data compressed and
              encoded in the query string. This data is <strong>not encrypted</strong>.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Anyone with the link can read your CV data.</li>
              <li>Share links are generated on demand — we never store or log them.</li>
              <li>Search engine crawlers are blocked from indexing share URLs via <code className="text-xs bg-gray-100 px-1 rounded">robots.txt</code>.</li>
              <li>Photos are excluded from share links.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Analytics and tracking</h2>
            <p>
              GlobalCV does not use any analytics platform, tracking pixel, advertising script,
              error monitoring service, or heat-mapping tool. There is no Vercel Analytics, Google Analytics,
              Sentry, Hotjar, or equivalent installed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Hosting provider</h2>
            <p>
              GlobalCV is hosted on <a href="https://vercel.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Vercel</a>.
              As with any web host, Vercel&apos;s infrastructure may log standard HTTP access data (IP address,
              request path, timestamp) for operational and security purposes. This is subject to{' '}
              <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Vercel&apos;s Privacy Policy
              </a>{' '}
              and their{' '}
              <a href="https://vercel.com/legal/dpa" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Data Processing Agreement
              </a>.
              We do not have access to individual-level access logs.
            </p>
            <p className="mt-3">
              We do not use provider API keys or user accounts for the public Jobs feed integration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">GDPR — your rights</h2>
            <p className="mb-3">
              For CV builder usage, GlobalCV does not collect or process personal data on our server,
              so most rights are exercised directly by you in the app:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>Right of access / portability:</strong> Export your CV as a PDF at any time.</li>
              <li><strong>Right to erasure:</strong> Click &quot;Clear Data&quot; to permanently delete all CV data from your browser.</li>
              <li><strong>Right to restrict processing:</strong> Enable Privacy Mode — no data is written to localStorage.</li>
              <li><strong>No consent required:</strong> All storage is strictly necessary for the service to function.</li>
            </ul>
            <p className="mt-3">
              For submitted job posting requests, you can request access, correction, or deletion by emailing us.
              For rights relating to Vercel&apos;s server-side logging, contact Vercel directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">ePrivacy / Cookie Law</h2>
            <p>
              Under the EU ePrivacy Directive (and national implementations such as PECR in the UK),
              strictly necessary storage does not require user consent. Both localStorage entries used
              by GlobalCV fall into this category — they exist solely to provide the service you requested.
              No consent banner is required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Children</h2>
            <p>
              GlobalCV is not directed at children under 16. We do not knowingly collect any information
              from children. Since no data is collected at all, no special handling is required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Changes to this policy</h2>
            <p>
              If features are ever introduced that change how data is handled (e.g. cloud sync, analytics),
              this policy will be updated and the changes clearly communicated. The current version is
              always available at this URL.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p>
              Questions? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700 transition-colors">← Home</Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
