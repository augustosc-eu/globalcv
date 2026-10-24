import { resetEnv } from '../helpers/browserEnv';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import LZString from 'lz-string';
import {
  encodeCVToURL,
  decodeShareFromLocation,
  resolveIncomingShare,
  sanitizeForShare,
  MAX_ENCODED_LENGTH,
} from '@/lib/sharing/shareUrl';
import { createEmptyCVData } from '@/store/cvStore';
import { MARKETS } from '@/lib/markets/registry';
import type { CVData, Market } from '@/types/cv.types';

function fullCV(market: Market): CVData {
  const cv = createEmptyCVData(market);
  cv.personalInfo = {
    ...cv.personalInfo,
    firstName: 'Ana',
    lastName: 'Ito',
    email: 'ana@example.com',
    phone: '+81 90 0000 0000',
    photo: `data:image/jpeg;base64,${'A'.repeat(100)}`,
    idNumber: 'ID-123',
    dateOfBirth: '1990-04-01',
    nationality: 'Japanese',
    maritalStatus: 'single',
    gender: 'female',
    nearestStation: 'Shibuya',
    commuteTime: 30,
    emergencyContact: { name: 'Ken', relationship: 'brother', phone: '+81 1' },
    address: { street: '1-2-3 Example', postalCode: '150-0001', city: 'Tokyo', country: 'Japan', prefecture: 'Tokyo' },
  };
  cv.references = [{ id: 'r', name: 'Ref', title: 'Boss', company: 'Co', email: 'ref@example.com', phone: '123', relationship: 'manager' }];
  cv.projects = [{ id: 'p', name: 'Proj', description: 'Desc', url: 'https://example.com' }];
  cv.targetRole = 'Engineer';
  cv.targetCompany = 'Initech';
  cv.jobDescriptionNotes = 'notes';
  cv.remoteWorkProfile = { workModeTarget: 'both', collaborationTools: ['Slack'], asyncStrengths: [], portfolioProof: [] };
  cv.workExperience = [{ id: 'w', company: 'Acme', title: 'Dev', startDate: '2020-01', isPresent: true, description: 'x', achievements: [] }];
  return cv;
}

describe('share links', () => {
  beforeEach(resetEnv);

  for (const market of MARKETS) {
    it(`round-trips a ${market} CV via the URL fragment (not the query)`, () => {
      const cv = fullCV(market);
      const url = encodeCVToURL(cv, {}, 'https://globalcv.test/anything?x=1');
      const parsed = new URL(url);
      assert.equal(parsed.pathname, `/${market}`);
      assert.equal(parsed.search, '', 'no query string: CV data must not be sent to the server');
      assert.ok(parsed.hash.startsWith('#cv=2.'));

      const decoded = decodeShareFromLocation(url);
      assert.equal(decoded.status, 'ok');
      if (decoded.status !== 'ok') return;
      assert.equal(decoded.market, market);
      assert.equal(decoded.cv.personalInfo.firstName, 'Ana');
      assert.equal(decoded.cv.projects[0].name, 'Proj');
      assert.equal(decoded.cv.targetRole, 'Engineer');
      assert.equal(decoded.cv.targetCompany, 'Initech');
      assert.deepEqual(decoded.cv.remoteWorkProfile?.collaborationTools, ['Slack']);
      assert.equal(decoded.cv.workExperience[0].company, 'Acme');
    });
  }

  it('excludes sensitive fields by default and never includes photo or ID number', () => {
    const json = JSON.stringify(sanitizeForShare(fullCV('jp')));
    for (const secret of ['ID-123', '1990-04-01', 'Japanese', 'single', 'female', 'Shibuya', 'Ken', '1-2-3 Example', '150-0001', 'ref@example.com', 'base64']) {
      assert.ok(!json.includes(secret), `payload must not contain ${secret}`);
    }
    assert.ok(json.includes('Tokyo'), 'coarse location is kept');
  });

  it('includes sensitive fields only on explicit opt-in (still never photo/ID)', () => {
    const url = encodeCVToURL(fullCV('jp'), { includeSensitive: true }, 'https://globalcv.test/');
    const decoded = decodeShareFromLocation(url);
    assert.equal(decoded.status, 'ok');
    if (decoded.status !== 'ok') return;
    assert.equal(decoded.cv.personalInfo.dateOfBirth, '1990-04-01');
    assert.equal(decoded.cv.references[0].email, 'ref@example.com');
    assert.equal(decoded.cv.personalInfo.idNumber, undefined);
    assert.equal(decoded.cv.personalInfo.photo, undefined);
  });

  it('reads legacy ?share= links and strips sensitive fields from them', () => {
    const legacy = LZString.compressToEncodedURIComponent(JSON.stringify(fullCV('eu')));
    const url = new URL('https://globalcv.test/eu');
    url.searchParams.set('share', legacy);
    const decoded = decodeShareFromLocation(url.toString());
    assert.equal(decoded.status, 'ok');
    if (decoded.status !== 'ok') return;
    assert.equal(decoded.legacy, true);
    assert.equal(decoded.cv.personalInfo.firstName, 'Ana');
    assert.equal(decoded.cv.personalInfo.dateOfBirth, undefined);
    assert.equal(decoded.cv.personalInfo.idNumber, undefined);
  });

  it('rejects truncated, corrupt, oversized and non-CV payloads gracefully', () => {
    const good = encodeCVToURL(fullCV('us'), {}, 'https://globalcv.test/');
    assert.equal(decodeShareFromLocation(good.slice(0, good.length - 40)).status, 'invalid');
    assert.equal(decodeShareFromLocation('https://globalcv.test/us#cv=2.@@@notlz').status, 'invalid');
    assert.equal(decodeShareFromLocation('https://globalcv.test/us#cv=9.abc').status, 'invalid');
    const huge = `https://globalcv.test/us#cv=2.${'A'.repeat(MAX_ENCODED_LENGTH + 1)}`;
    const hugeResult = decodeShareFromLocation(huge);
    assert.equal(hugeResult.status === 'invalid' && hugeResult.reason, 'too-large');
    const notCv = `https://globalcv.test/us#cv=2.${LZString.compressToEncodedURIComponent(JSON.stringify({ hello: 'world' }))}`;
    const notCvResult = decodeShareFromLocation(notCv);
    assert.equal(notCvResult.status === 'invalid' && notCvResult.reason, 'schema');
    assert.equal(decodeShareFromLocation('https://globalcv.test/us').status, 'none');
  });

  it('redirects links opened on the wrong market route, never re-sending data in the query', () => {
    const url = encodeCVToURL(fullCV('br'), {}, 'https://globalcv.test/');
    const wrongRoute = url.replace('/br#', '/us#');
    const action = resolveIncomingShare(wrongRoute, 'us');
    assert.equal(action.type, 'redirect');
    if (action.type !== 'redirect') return;
    assert.equal(new URL(action.href).pathname, '/br');
    assert.equal(new URL(action.href).search, '');

    const legacy = new URL('https://globalcv.test/us');
    legacy.searchParams.set('share', LZString.compressToEncodedURIComponent(JSON.stringify(fullCV('br'))));
    const legacyAction = resolveIncomingShare(legacy.toString(), 'us');
    assert.equal(legacyAction.type, 'redirect');
    if (legacyAction.type === 'redirect') {
      assert.equal(new URL(legacyAction.href).search, '');
      assert.ok(!legacyAction.href.includes('1990-04-01'));
    }
  });

  it('offers same-market links for import and reports invalid ones', () => {
    const url = encodeCVToURL(fullCV('gb'), {}, 'https://globalcv.test/');
    assert.equal(resolveIncomingShare(url, 'gb').type, 'offer');
    assert.equal(resolveIncomingShare('https://globalcv.test/gb#cv=2.zz', 'gb').type, 'invalid');
  });
});
