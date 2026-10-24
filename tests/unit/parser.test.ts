import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCVInput, splitTitleCompany } from '@/lib/parser/cvParser';
import type { Market } from '@/types/cv.types';

const fixture = (name: string) => readFileSync(join(__dirname, '..', 'fixtures', 'cv-text', `${name}.txt`), 'utf8');
const parse = (name: string, market: Market) => parseCVInput(fixture(name), market);

describe('parser: UK standard layout (audit P2-4 regression)', () => {
  const { data, warnings } = parse('uk-standard', 'gb');

  it('splits "Title — Company" and "Title, Company" headers correctly', () => {
    assert.equal(data.workExperience?.length, 2);
    const [first, second] = data.workExperience!;
    assert.equal(first.title, 'Senior Engineer');
    assert.equal(first.company, 'Acme Ltd');
    assert.equal(second.title, 'Engineer');
    assert.equal(second.company, 'Beta GmbH');
  });

  it('does not leak the next role header into the previous description', () => {
    const [first, second] = data.workExperience!;
    assert.ok(!first.description.includes('Beta GmbH'));
    assert.equal(first.description, 'Led migration to TypeScript, cutting bugs by 30%\nMentored four engineers');
    assert.equal(second.description, 'Built APIs.');
  });

  it('parses dates including "Present" and MM/YYYY', () => {
    const [first, second] = data.workExperience!;
    assert.deepEqual([first.startDate, first.endDate, first.isPresent], ['2020-01', '', true]);
    assert.deepEqual([second.startDate, second.endDate, second.isPresent], ['2016-03', '2019-12', false]);
  });

  it('keeps year-only education dates without inventing a month', () => {
    assert.equal(data.education?.[0].startDate, '2012');
    assert.equal(data.education?.[0].endDate, '2016');
  });

  it('imports every language on a comma-separated line', () => {
    assert.deepEqual(
      data.languages?.map((l) => [l.language, l.proficiency, l.isNative]),
      [['English', 'native', true], ['German', 'B2', false]]
    );
    assert.deepEqual(warnings, []);
  });
});

describe('parser: other layouts', () => {
  it('handles "Company | Title | dates" on one line and "Title at Company"', () => {
    const { data } = parse('us-pipes', 'us');
    const [a, b] = data.workExperience!;
    assert.deepEqual([a.title, a.company, a.startDate, a.isPresent], ['Software Developer', 'Acme Inc', '2021-06', true]);
    assert.equal(a.description, 'Shipped billing service\nReduced latency 40%');
    assert.deepEqual([b.title, b.company, b.startDate, b.endDate], ['Data Analyst', 'Northwind Corp', '2018', '2021']);
    assert.deepEqual(data.languages?.map((l) => [l.language, l.proficiency]), [['Spanish', 'conversational'], ['French', 'A2']]);
  });

  it('handles Spanish months, "Actualidad" and title/company on separate lines', () => {
    const { data, warnings } = parse('latam-es', 'latam');
    const [a, b] = data.workExperience!;
    assert.deepEqual([a.title, a.company, a.startDate, a.isPresent], ['Analista de Datos', 'Banco Ejemplo S.A.', '2019-03', true]);
    assert.deepEqual([b.title, b.company, b.startDate, b.endDate], ['Asistente de Investigación', 'Universidad Nacional', '2016', '2018']);
    assert.deepEqual(data.languages?.map((l) => [l.language, l.proficiency, l.isNative]), [['Español', 'native', true], ['Inglés', 'C1', false]]);
    assert.deepEqual(warnings, []);
  });

  it('handles Portuguese layouts with semicolon-separated languages', () => {
    const { data } = parse('br-pt', 'br');
    assert.deepEqual([data.workExperience![0].title, data.workExperience![0].company], ['Desenvolvedor Backend', 'Empresa Exemplo Ltda']);
    assert.deepEqual(data.languages?.map((l) => [l.language, l.proficiency]), [['Português', 'native'], ['Inglês', 'fluent']]);
  });

  it('parses ISO year-month ranges without splitting inside dates', () => {
    const { data } = parseCVInput('Ann Lee\n\nExperience\nDeveloper — Foo Ltd\n2020-01 - 2021-03\nDid things', 'gb');
    assert.deepEqual([data.workExperience![0].startDate, data.workExperience![0].endDate], ['2020-01', '2021-03']);
  });

  it('warns instead of silently dropping unrecognised language entries and text before the first role', () => {
    const { warnings } = parseCVInput('Ann Lee\n\nExperience\nSome intro line about me\n\nDeveloper — Foo Ltd\n2020 - 2021\n\nLanguages\n123', 'gb');
    assert.ok(warnings.some((w) => w.includes('before the first dated role')));
    assert.ok(warnings.some((w) => w.includes('Language not recognised')));
  });
});

describe('splitTitleCompany', () => {
  it('detects company-first headers', () => {
    assert.deepEqual(splitTitleCompany('Acme Ltd — Senior Engineer'), { title: 'Senior Engineer', company: 'Acme Ltd' });
  });
  it('defaults to title-first', () => {
    assert.deepEqual(splitTitleCompany('Product Lead | Initech'), { title: 'Product Lead', company: 'Initech' });
  });
  it('returns null when there is nothing to split', () => {
    assert.equal(splitTitleCompany('Engineer'), null);
  });
});
