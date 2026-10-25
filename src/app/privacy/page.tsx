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
              The CV builder runs in your browser. Everything you type — your name, work history,
              education, skills — is processed and stored on your own device. The CV editor does not send
              your CV to our servers or to any third party. (Share links are described below: they keep
              the CV in the part of the link after <code className="text-xs bg-gray-100 px-1 rounded">#</code>,
              which browsers do not send to our server.)
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
              localStorage stays in this browser on this device and is not transmitted over the network.
              Nothing is encrypted at rest: anyone with access to this browser profile can read it.
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
                    <td className="px-3 py-2 font-mono text-gray-600">cv_maker_v2_{'{market}'}</td>
                    <td className="px-3 py-2">Your saved CV drafts for each market (older versions used <code>cv_maker_v1_…</code>)</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Until you delete it</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">cv_maker_photo_…</td>
                    <td className="px-3 py-2">Your CV photo, stored once and shared by drafts that use it</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Removed when no draft uses it</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-gray-600">cv_maker_quarantine_…</td>
                    <td className="px-3 py-2">Recovery copies of saved data that could not be read or had to be repaired, so nothing is lost silently</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Until you erase all data</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">cv_maker_applications</td>
                    <td className="px-3 py-2">Jobs you saved to the application tracker</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Until you delete it</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-gray-600">globalcv_…</td>
                    <td className="px-3 py-2">Preferences (dark mode, export mode, preview width, banner dismissed) and readiness-score history per draft</td>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Until you erase all data</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              All entries are <strong>strictly necessary</strong> for the app to function — no consent is required
              under the ePrivacy Directive. In the editor&apos;s <strong>Tools</strong> menu you can:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 mt-2 text-xs text-gray-600">
              <li><strong>Delete this CV</strong> — permanently removes the current draft (and its readiness history) from this device. Other drafts are kept.</li>
              <li><strong>Erase all data on this device</strong> — permanently removes every GlobalCV entry listed above (all drafts in every market, photos, recovery copies, the application tracker and preferences). Data of other websites is not touched.</li>
              <li><strong>Download all my data</strong> — saves a JSON file with everything GlobalCV stores in this browser.</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              Copies you exported yourself (PDFs, JSON backups) or links you shared are outside the app and are not deleted.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-3 text-sm text-amber-800">
              <strong>Shared computers:</strong> If you are using a public or shared device, your CV data
              may be accessible to other users. Use <strong>Erase all data on this device</strong> before leaving, or enable
              Privacy Mode so nothing is written to localStorage.
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
              The optional &quot;Share&quot; feature creates a link that contains your CV, compressed, after the
              <code className="text-xs bg-gray-100 px-1 rounded">#</code> in the URL. This data is
              <strong> not encrypted</strong> — compression is not protection.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Anyone who has the link can read the CV in it.</li>
              <li>Browsers do not send the part after <code className="text-xs bg-gray-100 px-1 rounded">#</code> to web servers, so opening a link does not transmit the CV to us or our host during normal use. The link can still be kept in browser history, bookmarks, chat or email apps, link previews and screenshots.</li>
              <li>Your photo and ID number are never included. Date of birth, nationality, marital status, gender, emergency contact, street address, commute details and your references&apos; contact details are excluded unless you tick the option to include them.</li>
              <li>Opening a link adds the CV as a new draft only after the recipient confirms; it never overwrites existing drafts.</li>
              <li>Older links that used <code className="text-xs bg-gray-100 px-1 rounded">?share=</code> still open, but that format was sent to the server when opened; the app removes it from the address bar immediately and does not import sensitive fields from it.</li>
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
              <li><strong>Right of access / portability:</strong> Export your CV as a PDF or JSON, or use &quot;Download all my data&quot; for everything stored in this browser.</li>
              <li><strong>Right to erasure:</strong> Use &quot;Delete this CV&quot; for one draft or &quot;Erase all data on this device&quot; to remove all GlobalCV data from this browser.</li>
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
