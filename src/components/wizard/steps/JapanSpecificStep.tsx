'use client';

import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';
import { getSampleContent } from '@/lib/markets/sampleContent';

interface Props { market: Market; config: MarketConfig; }

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition';
const textareaCls = `${inputCls} resize-none`;

export default function JapanSpecificStep({ config }: Props) {
  const { cv, setSelfPromotion, setReasonForApplication, setDesiredConditions } = useCVStore();
  const samples = getSampleContent(config.market).japanSpecific;

  return (
    <div className="space-y-6">
      <StepHeader
        title="追加情報"
        description="履歴書に必要な追加情報を記入してください。"
      />

      {/* Self-promotion */}
      {config.sections.selfPromotion.enabled && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            自己PR
            {config.sections.selfPromotion.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <p className="text-xs text-gray-500 mb-2">
            あなたの強み・特技・仕事への姿勢などを具体的に記入してください。（400字程度）
          </p>
          <textarea
            value={cv.selfPromotion ?? ''}
            onChange={(e) => setSelfPromotion(e.target.value)}
            rows={6}
            className={textareaCls}
            placeholder="私は○○を得意としており、これまで○○において○○の成果を上げてきました。貴社でも○○を活かして貢献したいと考えております。"
          />
          {samples?.selfPromotion && (
            <button
              type="button"
              onClick={() => setSelfPromotion(samples.selfPromotion)}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 transition-colors"
            >
              サンプルを使用
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1 text-right">{cv.selfPromotion?.length ?? 0}文字</p>
        </div>
      )}

      {/* Reason for application */}
      {config.sections.reasonForApplication.enabled && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            志望動機
            {config.sections.reasonForApplication.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <p className="text-xs text-gray-500 mb-2">
            この会社・職種を志望する理由を具体的に記入してください。（400字程度）
          </p>
          <textarea
            value={cv.reasonForApplication ?? ''}
            onChange={(e) => setReasonForApplication(e.target.value)}
            rows={6}
            className={textareaCls}
            placeholder="貴社の○○という事業に魅力を感じ、応募いたしました。私のこれまでの経験を活かして○○に貢献できると確信しております。"
          />
          {samples?.reasonForApplication && (
            <button
              type="button"
              onClick={() => setReasonForApplication(samples.reasonForApplication)}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 transition-colors"
            >
              サンプルを使用
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1 text-right">{cv.reasonForApplication?.length ?? 0}文字</p>
        </div>
      )}

      {/* Desired conditions */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1">希望条件（任意）</label>
        <p className="text-xs text-gray-500 mb-2">
          勤務地・給与・職種などの希望があれば記入してください。（特になければ「貴社の規定に従います」）
        </p>
        <textarea
          value={cv.desiredConditions ?? ''}
          onChange={(e) => setDesiredConditions(e.target.value)}
          rows={3}
          className={textareaCls}
          placeholder="貴社の規定に従います。"
        />
      </div>

      {/* Tips */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-red-800">履歴書のポイント</p>
        <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
          <li>自己PRは具体的なエピソードと数字を交えて記述しましょう</li>
          <li>志望動機は企業研究に基づき、その会社ならではの理由を書きましょう</li>
          <li>誤字・脱字がないか必ず確認してください</li>
          <li>記入漏れがある場合は「なし」または「―」と記入してください</li>
        </ul>
      </div>
    </div>
  );
}
