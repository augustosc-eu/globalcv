import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

interface Props { cv: CVData; config: MarketConfig; }

function toJpDate(ym?: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y) return '';
  if (y > 2019 || (y === 2019 && m >= 5)) return `令和${y - 2018}年${m}月`;
  if (y > 1989 || (y === 1989 && m >= 1)) return `平成${y - 1988}年${m}月`;
  return `${y}年${m}月`;
}

const sectionTitle = 'text-[9px] font-bold tracking-wider text-gray-500 border-b border-gray-300 pb-1 mb-2 uppercase';

export default function JapanShokumuRenderer({ cv }: Props) {
  const p = cv.personalInfo;

  return (
    <div className="bg-white p-8 text-[10px] leading-relaxed font-sans" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
      {/* Title */}
      <h1 className="text-center text-lg font-bold tracking-[0.3em] mb-1">職務経歴書</h1>
      <p className="text-center text-[8px] text-gray-400 mb-5">Shokumu Keirekisho</p>

      {/* Name + date */}
      <div className="flex justify-between items-end mb-5">
        <p className="font-bold text-sm">{p.lastName}　{p.firstName}</p>
        <p className="text-[8px] text-gray-400">作成日：　　　年　　月　　日</p>
      </div>

      {/* Contact */}
      <div className="border border-gray-200 rounded p-2 mb-4">
        <p className={sectionTitle}>連絡先</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[8px] text-gray-500">
          {p.email && <span>Email: {p.email}</span>}
          {p.phone && <span>Tel: {p.phone}</span>}
          {p.address?.city && <span>{p.address.prefecture ?? ''}{p.address.city}</span>}
          {p.linkedIn && <span>LinkedIn: {p.linkedIn}</span>}
        </div>
      </div>

      {/* Summary */}
      {cv.objective && (
        <div className="mb-4">
          <p className={sectionTitle}>職務要約</p>
          <p className="text-gray-700">{cv.objective}</p>
        </div>
      )}

      {/* Work experience */}
      {cv.workExperience.length > 0 && (
        <div className="mb-4">
          <p className={sectionTitle}>職務経歴</p>
          <div className="space-y-3">
            {cv.workExperience.map((exp) => (
              <div key={exp.id} className="pl-3 border-l-2 border-gray-300">
                <div className="flex justify-between">
                  <span className="font-bold text-[10px]">
                    {exp.company}{exp.departmentName ? `　${exp.departmentName}` : ''}
                  </span>
                  <span className="text-[8px] text-gray-400">
                    {exp.startDate ? toJpDate(exp.startDate) : ''} 〜 {exp.isPresent ? '現在' : (exp.endDate ? toJpDate(exp.endDate) : '')}
                  </span>
                </div>
                <p className="font-semibold text-[9px] text-gray-600 mb-0.5">
                  {exp.title}
                  {exp.employmentType === 'contract' ? '（契約社員）' : exp.employmentType === 'part_time' ? '（アルバイト）' : ''}
                </p>
                {exp.description && <p className="text-gray-600">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {cv.education.length > 0 && (
        <div className="mb-4">
          <p className={sectionTitle}>学歴</p>
          <div className="space-y-1">
            {cv.education.map((edu) => (
              <div key={edu.id} className="flex gap-3">
                <span className="text-[8px] text-gray-400 w-28 shrink-0">
                  {edu.startDate ? toJpDate(edu.startDate) : ''} 〜 {edu.isPresent ? '現在' : (edu.endDate ? toJpDate(edu.endDate) : '')}
                </span>
                <span className="font-semibold text-[9px]">
                  {edu.institution}　{edu.degree}{edu.fieldOfStudy ? `　${edu.fieldOfStudy}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {cv.skills.length > 0 && (
        <div className="mb-4">
          <p className={sectionTitle}>スキル・ツール</p>
          <div className="flex flex-wrap gap-x-3">
            {cv.skills.map((s) => <span key={s.id} className="text-gray-600">・{s.name}</span>)}
          </div>
        </div>
      )}

      {/* Languages */}
      {cv.languages.length > 0 && (
        <div className="mb-4">
          <p className={sectionTitle}>語学</p>
          <div className="space-y-0.5">
            {cv.languages.map((l) => (
              <p key={l.id} className="text-gray-700">
                {l.language}：{l.isNative ? 'ネイティブ' : l.proficiency}
                {l.certification ? `（${l.certification}）` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {cv.certifications.length > 0 && (
        <div className="mb-4">
          <p className={sectionTitle}>資格・免許</p>
          <div className="space-y-0.5">
            {cv.certifications.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.dateIssued && <span className="text-[8px] text-gray-400 w-20 shrink-0">{toJpDate(c.dateIssued)}</span>}
                <span className="text-gray-700">{c.name}{c.issuer ? `（${c.issuer}）` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Self-promotion */}
      {cv.selfPromotion && (
        <div className="mb-4">
          <p className={sectionTitle}>自己PR</p>
          <p className="text-gray-700">{cv.selfPromotion}</p>
        </div>
      )}

      {/* Reason for application */}
      {cv.reasonForApplication && (
        <div className="mb-4">
          <p className={sectionTitle}>志望動機</p>
          <p className="text-gray-700">{cv.reasonForApplication}</p>
        </div>
      )}
    </div>
  );
}
