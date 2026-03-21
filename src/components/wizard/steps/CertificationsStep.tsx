'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Certification, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';

interface Props { market: Market; config: MarketConfig; }

export default function CertificationsStep({ market, config }: Props) {
  const { cv, addCertification, updateCertification, removeCertification } = useCVStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const label = config.sections.certifications.label ?? 'Certifications';

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="space-y-6">
      <StepHeader title={label} description={config.ui.certsDesc} />

      <div className="space-y-3">
        {cv.certifications.map((cert) => (
          <div key={cert.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === cert.id ? null : cert.id)}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{cert.name || config.ui.newCertification}</p>
                <p className="text-xs text-gray-500">{cert.issuer || config.ui.certIssuerPlaceholder}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); removeCertification(cert.id); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
                {expandedId === cert.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {expandedId === cert.id && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 mt-0 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {config.ui.certName}
                    </label>
                    <input value={cert.name} onChange={(e) => updateCertification(cert.id, { name: e.target.value })} className={inputCls}
                      placeholder={config.ui.certNamePlaceholder} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {config.ui.certIssuer}
                    </label>
                    <input value={cert.issuer} onChange={(e) => updateCertification(cert.id, { issuer: e.target.value })} className={inputCls}
                      placeholder={config.ui.certIssuerPlaceholder} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {config.ui.certDate}
                    </label>
                    <input type="month" value={cert.dateIssued ?? ''} onChange={(e) => updateCertification(cert.id, { dateIssued: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.certExpiry}</label>
                    <input type="month" value={cert.expiryDate ?? ''} onChange={(e) => updateCertification(cert.id, { expiryDate: e.target.value })} className={inputCls} />
                  </div>
                </div>
                {market !== 'jp' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.certCredential}</label>
                    <input value={cert.credentialId ?? ''} onChange={(e) => updateCertification(cert.id, { credentialId: e.target.value })} className={inputCls} placeholder={config.ui.certCredentialPlaceholder} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          addCertification({ name: '', issuer: '' });
          setTimeout(() => {
            const last = useCVStore.getState().cv.certifications.at(-1);
            if (last) setExpandedId(last.id);
          }, 50);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
      >
        <Plus size={16} />
        {config.ui.addCertification}
      </button>
    </div>
  );
}
