import { Market } from '@/types/cv.types';

export interface MarketSampleContent {
  summaries: string[];
  workBullets: string[];
  skills: string[];
  japanSpecific?: {
    selfPromotion: string;
    reasonForApplication: string;
  };
}

const samples: Record<Market, MarketSampleContent> = {
  us: {
    summaries: [
      'Results-driven operations professional with 6+ years of experience improving customer workflows and internal reporting. Skilled at translating ambiguous goals into measurable execution, with a track record of reducing cycle time and improving stakeholder visibility.',
    ],
    workBullets: [
      'Improved onboarding conversion by 18% by redesigning the activation workflow and partnering with product, engineering, and support.',
      'Reduced reporting time by 6 hours per week by automating recurring metrics and standardizing stakeholder dashboards.',
    ],
    skills: ['Stakeholder management', 'Data analysis', 'Project planning', 'Process improvement', 'SQL', 'Customer operations'],
  },
  eu: {
    summaries: [
      'Project coordinator with 5+ years of experience supporting cross-border digital and operational initiatives across European teams. Strong in multilingual stakeholder communication, GDPR-aware documentation, and structured delivery in multicultural environments.',
    ],
    workBullets: [
      'Coordinated rollout planning across teams in Germany, Spain, and the Netherlands, improving delivery predictability and documentation quality.',
      'Created a repeatable reporting process that helped leadership compare progress across regions, functions, and local implementation constraints.',
    ],
    skills: ['Cross-cultural communication', 'CEFR C1 English', 'GDPR documentation', 'Project coordination', 'Stakeholder reporting', 'Data analysis'],
  },
  gb: {
    summaries: [
      'Commercially minded project manager with 6+ years of experience delivering process improvements for UK-based service teams. Comfortable working with senior stakeholders, managing risk, and turning operational goals into practical delivery plans.',
    ],
    workBullets: [
      'Delivered a customer service workflow redesign across London and Manchester teams, reducing response times by 22%.',
      'Prepared weekly steering updates for senior stakeholders, improving visibility on milestones, risks, and budget decisions.',
    ],
    skills: ['Stakeholder engagement', 'Risk management', 'Service improvement', 'Excel reporting', 'Agile delivery', 'Supplier coordination'],
  },
  au: {
    summaries: [
      'Practical and collaborative business analyst with experience supporting digital transformation and operational improvement across Australian service teams. Skilled at gathering requirements, mapping processes, and helping teams deliver clear, usable change.',
    ],
    workBullets: [
      'Mapped end-to-end customer support processes for Sydney and Melbourne teams, identifying changes that reduced duplicate handling.',
      'Partnered with product, operations, and compliance teams to document requirements and support a smooth release cadence.',
    ],
    skills: ['Business analysis', 'Process mapping', 'Stakeholder workshops', 'Jira', 'Customer operations', 'Change support'],
  },
  latam: {
    summaries: [
      'Profesional orientado a resultados con experiencia coordinando proyectos operativos y digitales en equipos regionales. Destaco por la comunicación clara, la mejora de procesos y la capacidad de adaptar soluciones a distintos mercados de Latinoamérica.',
    ],
    workBullets: [
      'Coordiné la implementación de un nuevo flujo de atención para equipos en México, Colombia y Argentina, reduciendo tiempos de respuesta.',
      'Desarrollé reportes regionales para seguimiento de indicadores, facilitando decisiones comerciales y operativas.',
    ],
    skills: ['Gestión de proyectos', 'Análisis de datos', 'Mejora de procesos', 'Comunicación regional', 'Excel avanzado', 'Atención al cliente'],
  },
  br: {
    summaries: [
      'Profissional com experiência em melhoria de processos, atendimento ao cliente e coordenação de projetos digitais. Forte atuação com equipes multifuncionais, indicadores operacionais e comunicação clara com áreas de negócio.',
    ],
    workBullets: [
      'Implementei melhorias no fluxo de atendimento em São Paulo, reduzindo retrabalho e aumentando a previsibilidade das entregas.',
      'Criei dashboards semanais para acompanhamento de SLAs, apoiando decisões de liderança e priorização de demandas.',
    ],
    skills: ['Gestão de projetos', 'Análise de indicadores', 'Melhoria contínua', 'Comunicação com stakeholders', 'Excel avançado', 'Power BI'],
  },
  in: {
    summaries: [
      'Detail-oriented software engineer with 5+ years of experience building web applications and internal tools for high-growth teams in India. Strong foundation in full-stack development, system design, and cross-functional delivery.',
    ],
    workBullets: [
      'Built reusable dashboard components used by operations teams across Bengaluru and Mumbai, reducing manual reporting effort.',
      'Improved API response times by 35% through query optimisation, caching, and production monitoring improvements.',
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'System design', 'SQL', 'Agile development', 'Production support'],
  },
  jp: {
    summaries: [
      '事業会社にて業務改善およびプロジェクト推進を経験してまいりました。関係部署と丁寧に連携し、正確な進行管理と継続的な改善を通じて、組織の成果向上に貢献します。',
    ],
    workBullets: [
      '関係部署と連携し、業務フローを見直すことで対応時間の短縮と品質向上に貢献しました。',
      '定例レポートの作成手順を標準化し、チーム内での情報共有を円滑にしました。',
    ],
    skills: ['業務改善', '進行管理', '資料作成', '顧客対応', 'Excel', '関係部署との調整'],
    japanSpecific: {
      selfPromotion: '私は課題を整理し、周囲と協力しながら着実に改善を進めることを強みとしています。これまでの経験を活かし、貴社の業務品質向上に貢献したいと考えています。',
      reasonForApplication: '貴社の事業内容と成長方針に魅力を感じ、これまで培った経験を活かして貢献できると考え志望いたしました。',
    },
  },
};

export function getSampleContent(market: Market): MarketSampleContent {
  return samples[market];
}
