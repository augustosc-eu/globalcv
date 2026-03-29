import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, SITE_OWNER_NAME, SITE_OWNER_URL } from '@/lib/site';
import TopNav from '@/components/shared/TopNav';
import BrandLink from '@/components/shared/BrandLink';

export const metadata: Metadata = {
  title: 'Terms of Service — GlobalCV',
  description: 'Terms of use for GlobalCV.',
};

export default function TermsPage() {
  const ENABLE_POST_JOB = process.env.NEXT_PUBLIC_ENABLE_POST_JOB === 'true';

  return (
    <main className="app-shell-bg soft-grid-bg min-h-screen">
      <TopNav current="terms" showPostJob={ENABLE_POST_JOB} />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="surface-card rounded-3xl p-7 md:p-10">
          <BrandLink href="/" variant="legal" className="mb-8" />

          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: March 2026</p>

          <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance</h2>
            <p>
              By using GlobalCV, you agree to these terms. If you do not agree, do not use the app.
              These terms apply to all users of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. What GlobalCV is</h2>
            <p>
              GlobalCV is a free, browser-based tool that helps you create professional CVs and
              resumes formatted for different job markets. It also includes an optional jobs aggregator
              that displays listings from third-party providers. The service is provided as-is, free of charge,
              with no guarantees of availability, accuracy, or fitness for any particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Your data is your responsibility</h2>
            <p className="mb-3">
              All CV data is stored locally in your browser. We do not back up your data.
              You are solely responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Saving and exporting your CV before closing the browser</li>
              <li>Keeping a copy of your exported PDF</li>
              <li>Any loss of data due to clearing browser storage, switching devices, or browser updates</li>
            </ul>
            <p className="mt-3">
              We are not liable for any loss of CV data under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. No warranty</h2>
            <p>
              GlobalCV is provided <strong>&quot;as is&quot;</strong> without warranty of any kind, express or implied.
              We make no guarantees that:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
              <li>The app will be available at all times</li>
              <li>Generated CVs will meet the requirements of any specific employer or job market</li>
              <li>The app is free of bugs or errors</li>
              <li>PDF output will render identically across all PDF viewers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, {SITE_OWNER_NAME} shall not be liable for
              any direct, indirect, incidental, or consequential damages arising from your use of
              GlobalCV, including but not limited to data loss, missed job applications, or errors
              in generated documents.
            </p>
            <p className="mt-2">
              Company website:{' '}
              <a href={SITE_OWNER_URL} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                {SITE_OWNER_URL}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Acceptable use</h2>
            <p className="mb-2">You agree not to use GlobalCV to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Create fraudulent or misleading CVs</li>
              <li>Attempt to reverse-engineer, attack, or exploit the application</li>
              <li>Use the app in any way that violates applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Third-party job data</h2>
            <p className="mb-3">
              The Jobs section displays content from third-party job sources. Those listings, logos, and
              links remain subject to the respective provider&apos;s terms, licenses, and policies.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>We do not guarantee completeness, freshness, or continued availability of third-party listings.</li>
              <li>Source attribution and outbound links are shown as part of each listing.</li>
              <li>Some providers are deployment-gated and may only be enabled after separate approval or registration.</li>
              <li>Third-party providers may change or revoke access at any time.</li>
              <li>Suggested CV market links in the Jobs UI are informational only and may not always match your preferred application market.</li>
              <li>When you submit a job posting request form, you confirm you are authorized to share the listing details and contact information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Intellectual property</h2>
            <p>
              The GlobalCV source code is open-source and available under the MIT License.
              The CV content you create belongs entirely to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the app
              after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>
              Questions?{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700 transition-colors">← Home</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
