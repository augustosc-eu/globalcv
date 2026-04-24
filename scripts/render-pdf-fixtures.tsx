import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { rm, mkdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { CVPDFDocument } from '../src/lib/pdf/CVPDFDocument';
import { getMarketConfig } from '../src/lib/markets';
import { CVData, Market } from '../src/types/cv.types';
import { MarketConfig } from '../src/types/market.types';

type ExportMode = 'designed' | 'ats' | 'privacy' | 'compact';

const markets: Market[] = ['us', 'eu', 'gb', 'au', 'latam', 'br', 'in', 'jp'];
const modes: ExportMode[] = ['designed', 'ats', 'privacy', 'compact'];
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp', 'pdf-fixtures');

const longDescription = [
  'Led a global support team specialising in AI/ML and low-code app development, ensuring high customer satisfaction and efficient resolution of technical issues.',
  'Developed technical playbooks, improved team alignment, and introduced repeatable reporting for cross-functional stakeholders.',
  'Delivered a public service modernisation initiative with documentation, training, and rollout coordination across multiple teams and locations.',
].join('\n');

function baseCV(market: Market, config: MarketConfig, templateId: string): CVData {
  return {
    id: `fixture-${market}-${templateId}`,
    title: `${config.name} PDF Fixture`,
    market,
    templateId,
    lastModified: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    version: 1,
    pageSize: config.pageSize,
    colorTheme: config.themes[0]?.id,
    personalInfo: {
      firstName: market === 'jp' ? '太郎' : 'Augusto',
      lastName: market === 'jp' ? '田中' : 'Santa Cruz',
      email: 'hello@example.com',
      phone: '+34 658 02 33 14',
      linkedIn: 'linkedin.com/in/example',
      address: market === 'jp'
        ? { city: '渋谷区', country: '日本', prefecture: '東京都', street: '神南1-1-1' }
        : { city: market === 'eu' ? 'Brussels' : 'London', country: config.name },
      dateOfBirth: '1990-04-12',
      nationality: market === 'jp' ? '日本' : 'Spanish',
      gender: 'male',
      furiganaFirstName: 'たろう',
      furiganaLastName: 'たなか',
      nearestStation: '渋谷',
      commuteTime: 35,
    },
    objective: market === 'jp'
      ? '関係部署と連携しながら業務改善とプロジェクト推進に取り組んできました。正確性と継続的な改善を重視し、組織に貢献します。'
      : 'Project coordinator with 5+ years of experience supporting cross-border digital and operational initiatives. Strong in stakeholder communication, documentation, and structured delivery.',
    workExperience: [
      {
        id: 'work-1',
        company: 'Digital Ocean',
        title: 'Team Lead Support AI/ML',
        location: market === 'eu' ? 'Munich, Germany' : 'Remote',
        startDate: '2019-11',
        isPresent: true,
        description: longDescription,
      },
      {
        id: 'work-2',
        company: 'Paperspace',
        title: 'Senior Support Agent',
        location: 'Brooklyn, NY',
        startDate: '2017-02',
        endDate: '2019-10',
        isPresent: false,
        description: longDescription,
      },
      {
        id: 'work-3',
        company: 'City Hall',
        title: 'Modernisation Director',
        location: 'Coronel Vidal, Argentina',
        startDate: '2014-03',
        endDate: '2016-12',
        isPresent: false,
        description: longDescription,
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: market === 'jp' ? '○○大学' : 'University of Michigan',
        degree: market === 'jp' ? '卒業' : 'Technical Support Fundamentals',
        fieldOfStudy: market === 'jp' ? '情報工学科' : 'Computer Science',
        startDate: '2010-09',
        endDate: '2014-06',
        isPresent: false,
      },
    ],
    skills: [
      { id: 'skill-1', name: 'Cross-cultural communication', level: 4 },
      { id: 'skill-2', name: 'Technical documentation', level: 5 },
      { id: 'skill-3', name: 'Process improvement', level: 4 },
      { id: 'skill-4', name: 'Stakeholder reporting', level: 4 },
    ],
    languages: [
      { id: 'lang-1', language: 'English', proficiency: market === 'eu' ? 'B2' : 'professional', isNative: false },
      { id: 'lang-2', language: 'Spanish', proficiency: market === 'eu' ? 'C1' : 'native', isNative: true },
      { id: 'lang-3', language: market === 'jp' ? '日本語' : 'Italian', proficiency: market === 'jp' ? 'N2' : 'B1', isNative: false },
    ],
    certifications: [
      { id: 'cert-1', name: 'Google IT Support Certificate', issuer: 'Coursera', dateIssued: '2022-05' },
      { id: 'cert-2', name: 'Intermediate PostgreSQL', issuer: 'University of Michigan', dateIssued: '2023-09' },
    ],
    references: [
      { id: 'ref-1', name: 'Elena Rossi', title: 'Programme Manager', company: 'European Digital Agency', email: 'elena@example.com', relationship: 'Manager' },
    ],
    selfPromotion: '私は課題を整理し、周囲と協力しながら着実に改善を進めることを強みとしています。',
    reasonForApplication: '貴社の事業内容と成長方針に魅力を感じ、これまで培った経験を活かして貢献できると考え志望いたしました。',
    desiredConditions: '貴社の規定に従います。',
    hiddenSections: [],
  };
}

function applyMode(cv: CVData, config: MarketConfig, mode: ExportMode): CVData {
  const hiddenSections = [...(cv.hiddenSections ?? [])];
  const personalInfo = { ...cv.personalInfo };

  if (mode === 'ats' || mode === 'privacy' || (mode === 'compact' && config.fields.photo.visibility !== 'required')) {
    delete personalInfo.photo;
  }
  if (mode === 'privacy') {
    delete personalInfo.dateOfBirth;
    delete personalInfo.nationality;
    delete personalInfo.gender;
    delete personalInfo.maritalStatus;
    delete personalInfo.idNumber;
    delete personalInfo.emergencyContact;
  }
  if (mode === 'compact') {
    hiddenSections.push('references');
    return {
      ...cv,
      personalInfo,
      objective: cv.objective?.slice(0, 260),
      workExperience: cv.workExperience.slice(0, 3).map((work) => ({ ...work, description: work.description.slice(0, 190) })),
      education: cv.education.slice(0, 2),
      skills: cv.skills.slice(0, 8),
      languages: cv.languages.slice(0, 4),
      certifications: cv.certifications.slice(0, 2),
      references: [],
      hiddenSections: Array.from(new Set(hiddenSections)),
    };
  }

  return { ...cv, personalInfo, hiddenSections: Array.from(new Set(hiddenSections)) };
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const rendered: Array<{ market: Market; template: string; mode: ExportMode; bytes: number }> = [];
  for (const market of markets) {
    const config = getMarketConfig(market);
    for (const template of config.templates) {
      for (const mode of modes) {
        const cv = applyMode(baseCV(market, config, template.id), config, mode);
        const file = path.join(outDir, `${market}-${template.id}-${mode}.pdf`);
        const doc = React.createElement(CVPDFDocument, { cv, config, exportMode: mode });
        await renderToFile(doc as any, file);
        const fileStat = await stat(file);
        rendered.push({ market, template: template.id, mode, bytes: fileStat.size });
      }
    }
  }

  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(rendered, null, 2));
  console.log(`Rendered ${rendered.length} PDFs to ${path.relative(root, outDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
