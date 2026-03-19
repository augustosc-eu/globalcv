import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — GlobalCV',
  description: 'Terms of use for GlobalCV.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-10 transition-colors">
          <FileText size={16} /> GlobalCV
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
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
              resumes formatted for different job markets. It is provided as-is, free of charge,
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
              To the fullest extent permitted by law, Augusto Santa Cruz shall not be liable for
              any direct, indirect, incidental, or consequential damages arising from your use of
              GlobalCV, including but not limited to data loss, missed job applications, or errors
              in generated documents.
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
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Intellectual property</h2>
            <p>
              The GlobalCV source code is open-source and available under the MIT License.
              The CV content you create belongs entirely to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Changes</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the app
              after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
            <p>
              Questions?{' '}
              <a href="mailto:acroix2020@gmail.com" className="text-blue-600 hover:underline">
                acroix2020@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-700 transition-colors">← Home</Link>
          <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </main>
  );
}
