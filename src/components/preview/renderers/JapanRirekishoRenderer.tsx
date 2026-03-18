import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

interface Props { cv: CVData; config: MarketConfig; }

// Format YYYY-MM to Japanese era + year + month
function toJapaneseDate(ym?: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y) return '';

  // Reiwa starts 2019-05-01
  if (y > 2019 || (y === 2019 && m >= 5)) {
    return `令和${y - 2018}年${m}月`;
  }
  // Heisei 1989-01-08 to 2019-04-30
  if (y > 1989 || (y === 1989 && m >= 1)) {
    return `平成${y - 1988}年${m}月`;
  }
  return `${y}年${m}月`;
}

export default function JapanRirekishoRenderer({ cv }: Props) {
  const { personalInfo: p } = cv;

  return (
    <div
      className="text-[9px] leading-tight"
      style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif', backgroundColor: 'white' }}
    >
      {/* Title */}
      <div className="text-center py-3 border-b-2 border-black">
        <h1 className="text-base font-bold tracking-[0.5em]">履　歴　書</h1>
        <p className="text-[8px] text-gray-500 mt-0.5">（JIS規格）</p>
      </div>

      <div className="border border-black">
        {/* Row 1: Date written */}
        <TableRow label="記入日" cols={1}>
          <span>　　　年　　月　　日現在</span>
        </TableRow>

        {/* Row 2: Furigana + Photo box */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black">
            <div className="border-b border-black px-2 py-1">
              <span className="text-[8px] text-gray-500 mr-2">ふりがな</span>
              <span>{p.furiganaLastName} {p.furiganaFirstName}</span>
            </div>
            <div className="px-2 py-2 flex items-baseline gap-2">
              <span className="text-[8px] text-gray-500">氏名</span>
              <span className="text-base font-bold">{p.lastName}　{p.firstName}</span>
            </div>
          </div>
          {/* Photo box */}
          <div
            className="border-l border-black flex-shrink-0 flex items-center justify-center bg-gray-50 text-gray-400"
            style={{ width: 80, minHeight: 96 }}
          >
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo} alt="証明写真" className="w-full h-full object-cover" style={{ maxWidth: 80, maxHeight: 96 }} />
            ) : (
              <div className="text-center">
                <div className="text-[8px] text-gray-400">写真</div>
                <div className="text-[7px] text-gray-300">3×4cm</div>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: DOB, gender */}
        <div className="flex border-b border-black">
          <div className="flex-1 px-2 py-1 border-r border-black">
            <span className="text-[8px] text-gray-500 mr-2">生年月日</span>
            <span>{p.dateOfBirth ? toJapaneseDate(p.dateOfBirth?.slice(0, 7)) : '　　年　月　日生'}</span>
            <span className="ml-2 text-[8px] text-gray-500">（満　　歳）</span>
          </div>
          <div className="px-2 py-1">
            <span className="text-[8px] text-gray-500 mr-2">性別</span>
            <span>{p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : '　'}</span>
          </div>
        </div>

        {/* Row 4: Current address */}
        <div className="border-b border-black px-2 py-1">
          <span className="text-[8px] text-gray-500 mr-2">現住所</span>
          <span>{p.address ? `〒　　　-　　　　 ${p.address.prefecture ?? ''}${p.address.city}${p.address.street ?? ''}` : '〒　　　-'}</span>
        </div>

        {/* Row 5: Phone, nearest station */}
        <div className="flex border-b border-black">
          <div className="flex-1 px-2 py-1 border-r border-black">
            <span className="text-[8px] text-gray-500 mr-2">電話</span>
            <span>{p.phone || '　　　　-　　　　-　　　　'}</span>
          </div>
          <div className="flex-1 px-2 py-1 border-r border-black">
            <span className="text-[8px] text-gray-500 mr-2">最寄駅</span>
            <span>{p.nearestStation || '　　　　駅'}</span>
          </div>
          <div className="px-2 py-1">
            <span className="text-[8px] text-gray-500 mr-1">通勤時間</span>
            <span>{p.commuteTime ? `約${p.commuteTime}分` : '約　　分'}</span>
          </div>
        </div>

        {/* Email */}
        <div className="border-b border-black px-2 py-1">
          <span className="text-[8px] text-gray-500 mr-2">E-mail</span>
          <span>{p.email || ''}</span>
        </div>

        {/* Education header */}
        <div className="border-b border-black bg-gray-100 px-2 py-1 flex gap-20">
          <span className="font-bold">年</span>
          <span className="font-bold">月</span>
          <span className="font-bold ml-4">学歴・職歴</span>
        </div>

        {/* Education entries */}
        <div className="border-b border-black px-2 py-0.5 text-gray-500">学歴</div>
        {cv.education.slice(0, 4).map((edu) => (
          <div key={edu.id} className="flex border-b border-black">
            <div className="w-16 px-2 py-1 border-r border-black text-center text-[8px]">
              {edu.startDate ? toJapaneseDate(edu.startDate) : ''}
            </div>
            <div className="flex-1 px-2 py-1">
              {edu.institution}　{edu.degree}{edu.fieldOfStudy ? `　${edu.fieldOfStudy}` : ''}　入学
            </div>
          </div>
        ))}
        {cv.education.slice(0, 4).map((edu) => (
          <div key={edu.id + '_end'} className="flex border-b border-black">
            <div className="w-16 px-2 py-1 border-r border-black text-center text-[8px]">
              {edu.endDate ? toJapaneseDate(edu.endDate) : edu.isPresent ? '在学中' : ''}
            </div>
            <div className="flex-1 px-2 py-1">
              {edu.institution}　{edu.degree}　{edu.isPresent ? '在学中' : '卒業'}
            </div>
          </div>
        ))}

        {/* Work experience header */}
        <div className="border-b border-black px-2 py-0.5 text-gray-500">職歴</div>
        {cv.workExperience.slice(0, 6).map((exp) => (
          <div key={exp.id}>
            <div className="flex border-b border-black">
              <div className="w-16 px-2 py-1 border-r border-black text-center text-[8px]">
                {exp.startDate ? toJapaneseDate(exp.startDate) : ''}
              </div>
              <div className="flex-1 px-2 py-1">
                {exp.company}{exp.departmentName ? `　${exp.departmentName}` : ''}　入社
                {exp.employmentType === 'contract' ? '（契約社員）' : exp.employmentType === 'part_time' ? '（アルバイト）' : ''}
              </div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-16 px-2 py-1 border-r border-black text-center text-[8px]">
                {!exp.isPresent && exp.endDate ? toJapaneseDate(exp.endDate) : ''}
              </div>
              <div className="flex-1 px-2 py-1">
                {exp.isPresent ? '現在に至る' : `退職${exp.reasonForLeaving ? `（${exp.reasonForLeaving}）` : ''}`}
              </div>
            </div>
          </div>
        ))}

        {/* Blank rows */}
        {Array.from({ length: Math.max(0, 4 - cv.workExperience.length) }).map((_, i) => (
          <div key={`blank-${i}`} className="flex border-b border-black h-6">
            <div className="w-16 px-2 border-r border-black" />
            <div className="flex-1 px-2" />
          </div>
        ))}

        {/* Certifications / Skills */}
        <div className="border-b border-black bg-gray-100 px-2 py-1">
          <span className="font-bold">免許・資格</span>
        </div>
        {cv.certifications.slice(0, 5).map((c) => (
          <div key={c.id} className="flex border-b border-black">
            <div className="w-16 px-2 py-1 border-r border-black text-center text-[8px]">
              {c.dateIssued ? toJapaneseDate(c.dateIssued) : ''}
            </div>
            <div className="flex-1 px-2 py-1">{c.name}　取得</div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 4 - cv.certifications.length) }).map((_, i) => (
          <div key={`blank-cert-${i}`} className="flex border-b border-black h-6">
            <div className="w-16 px-2 border-r border-black" />
            <div className="flex-1 px-2" />
          </div>
        ))}

        {/* Self PR + Reason */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-2">
            <div className="text-[8px] font-bold text-gray-700 mb-1">自己PR</div>
            <p className="text-[8px] text-gray-800 leading-relaxed whitespace-pre-line">{cv.selfPromotion || ''}</p>
          </div>
          <div className="flex-1 p-2">
            <div className="text-[8px] font-bold text-gray-700 mb-1">志望動機</div>
            <p className="text-[8px] text-gray-800 leading-relaxed whitespace-pre-line">{cv.reasonForApplication || ''}</p>
          </div>
        </div>

        {/* Desired conditions */}
        <div className="border-b border-black p-2">
          <span className="text-[8px] font-bold text-gray-700 mr-2">希望条件</span>
          <span className="text-[8px] text-gray-800">{cv.desiredConditions || '貴社の規定に従います。'}</span>
        </div>

        {/* Emergency contact + seal */}
        <div className="flex">
          <div className="flex-1 border-r border-black p-2">
            <div className="text-[8px] font-bold text-gray-700 mb-1">緊急連絡先</div>
            {p.emergencyContact ? (
              <div className="text-[8px]">
                <p>{p.emergencyContact.name}（{p.emergencyContact.relationship}）</p>
                <p>{p.emergencyContact.phone}</p>
              </div>
            ) : (
              <div className="text-[8px] text-gray-400">氏名：<br />続柄：<br />電話：</div>
            )}
          </div>
          <div className="w-16 flex flex-col items-center justify-center p-2 border-l border-black">
            <div className="text-[8px] text-gray-500 mb-1">捺印</div>
            <div className="w-10 h-10 border border-gray-400 rounded-full flex items-center justify-center text-[7px] text-gray-300">
              {p.personalSeal ? '印' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableRow({ label, children, cols = 2 }: { label: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className="flex border-b border-black">
      <div className={`w-20 px-2 py-1 border-r border-black bg-gray-50 text-[8px] text-gray-600 flex items-center`}>
        {label}
      </div>
      <div className="flex-1 px-2 py-1">{children}</div>
    </div>
  );
}
