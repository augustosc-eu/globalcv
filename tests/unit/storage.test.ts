import { localStore, resetEnv } from '../helpers/browserEnv';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveCV,
  loadCV,
  loadDraft,
  clearCV,
  listSavedDrafts,
  getRecoveryStatus,
  exportAllLocalData,
  eraseAllLocalData,
  listQuarantineKeys,
  PHOTO_REF_PREFIX,
  saveApplication,
  listApplications,
  updateApplicationStatus,
} from '@/lib/storage/localStorage';
import { createEmptyCVData } from '@/store/cvStore';
import type { CVData, Market } from '@/types/cv.types';

function cvFor(market: Market, firstName: string, id?: string): CVData {
  const cv = createEmptyCVData(market);
  if (id) cv.id = id;
  cv.personalInfo.firstName = firstName;
  return cv;
}

function rawIndex(market: Market) {
  return JSON.parse(localStore.getItem(`cv_maker_v2_${market}`) ?? 'null');
}

const PHOTO = `data:image/jpeg;base64,${'A'.repeat(4000)}`;

describe('storage: never deletes data on read', () => {
  beforeEach(resetEnv);

  it('keeps a draft that fails validation (repairs it in memory, original untouched)', () => {
    const bad = cvFor('gb', 'Grace', 'cv_gb_bad') as unknown as Record<string, unknown>;
    bad.languages = [{ id: 'l1', language: 'French', isNative: false }]; // proficiency missing
    const serialized = JSON.stringify({ version: 2, activeDraftId: 'cv_gb_bad', drafts: { cv_gb_bad: { version: 2, data: bad, savedAt: '2026-01-01T00:00:00.000Z' } } });
    localStore.setItem('cv_maker_v2_gb', serialized);

    const loaded = loadDraft('gb');
    assert.ok(loaded, 'draft must still load');
    assert.equal(loaded.repaired, true);
    assert.equal(loaded.cv.personalInfo.firstName, 'Grace');
    assert.equal(loaded.cv.languages[0].language, 'French');
    // Reading must not rewrite storage.
    assert.equal(localStore.getItem('cv_maker_v2_gb'), serialized);
  });

  it('keeps drafts that cannot be repaired and reports them for recovery', () => {
    const serialized = JSON.stringify({ version: 2, activeDraftId: 'x', drafts: { x: { version: 2, data: 'not-a-cv', savedAt: '' } } });
    localStore.setItem('cv_maker_v2_eu', serialized);
    assert.equal(loadCV('eu'), null);
    assert.equal(localStore.getItem('cv_maker_v2_eu'), serialized);
    const status = getRecoveryStatus();
    assert.deepEqual(status.invalidDrafts, [{ market: 'eu', id: 'x' }]);
    assert.equal(status.needsAttention, true);

    // Saving another draft in the same market preserves the invalid one verbatim.
    assert.ok(saveCV(cvFor('eu', 'Eva')).ok);
    assert.equal(rawIndex('eu').drafts.x.data, 'not-a-cv');
  });

  it('quarantines corrupted JSON before it can be overwritten', () => {
    localStore.setItem('cv_maker_v2_br', '{not json');
    assert.equal(loadCV('br'), null);
    assert.equal(localStore.getItem('cv_maker_v2_br'), '{not json', 'original bytes must not be overwritten on read');
    const [qKey] = listQuarantineKeys();
    assert.ok(qKey);
    assert.equal(JSON.parse(localStore.getItem(qKey) as string).raw, '{not json');

    // A later save may replace the main key only because a copy exists.
    assert.ok(saveCV(cvFor('br', 'Bruno')).ok);
    assert.equal(loadCV('br')?.personalInfo.firstName, 'Bruno');
    assert.equal(JSON.parse(localStore.getItem(qKey) as string).raw, '{not json');
  });

  it('refuses to overwrite corrupted data when the quarantine copy cannot be written', () => {
    localStore.setItem('cv_maker_v2_jp', '{"broken":');
    localStore.quota = localStore.usedChars() + 10; // no room for a quarantine copy
    const result = saveCV(cvFor('jp', 'Hanako'));
    assert.equal(result.ok, false);
    assert.equal(localStore.getItem('cv_maker_v2_jp'), '{"broken":');
  });

  it('migrates legacy v1 drafts without data loss and only removes v1 after a successful write', () => {
    const legacy = cvFor('us', 'Lee', 'cv_us_legacy');
    localStore.setItem('cv_maker_v1_us', JSON.stringify({ version: 1, data: legacy, savedAt: '2025-01-01T00:00:00.000Z' }));
    assert.equal(loadCV('us')?.personalInfo.firstName, 'Lee');
    assert.ok(localStore.getItem('cv_maker_v1_us'), 'read must not remove the legacy key');

    localStore.failNextWrites = 1;
    assert.equal(saveCV({ ...legacy, objective: 'x' }, { expectedRevision: 0 }).ok, false);
    assert.ok(localStore.getItem('cv_maker_v1_us'), 'failed write must keep legacy data');

    assert.ok(saveCV({ ...legacy, objective: 'x' }, { expectedRevision: 0 }).ok);
    assert.equal(localStore.getItem('cv_maker_v1_us'), null);
    assert.equal(loadCV('us')?.objective, 'x');
  });
});

describe('storage: write failures are reported', () => {
  beforeEach(resetEnv);

  it('reports quota errors instead of claiming success', () => {
    localStore.failNextWrites = 5;
    const result = saveCV(cvFor('us', 'Quinn'));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, 'quota');
    assert.equal(loadCV('us'), null);
  });

  it('detects dropped writes via read-back verification', () => {
    localStore.dropWrites = true;
    const result = saveCV(cvFor('us', 'Drop'));
    assert.equal(result.ok, false);
  });

  it('an interrupted save leaves the previously saved version intact', () => {
    const cv = cvFor('au', 'Ava');
    const first = saveCV(cv);
    assert.ok(first.ok);
    localStore.failNextWrites = 1;
    const second = saveCV({ ...cv, objective: 'new' }, { expectedRevision: first.ok ? first.revision : 0 });
    assert.equal(second.ok, false);
    const stored = loadCV('au');
    assert.equal(stored?.personalInfo.firstName, 'Ava');
    assert.equal(stored?.objective, undefined);
  });
});

describe('storage: multi-tab safety', () => {
  beforeEach(resetEnv);

  it('saving one draft keeps drafts written by another tab', () => {
    const a = cvFor('eu', 'TabA', 'cv_eu_a');
    const b = cvFor('eu', 'TabB', 'cv_eu_b');
    assert.ok(saveCV(a).ok); // tab A
    assert.ok(saveCV(b).ok); // tab B (another draft)
    assert.ok(saveCV({ ...a, objective: 'edited' }, { expectedRevision: 1 }).ok); // tab A again
    const names = listSavedDrafts('eu').map((d) => loadCV('eu', d.id)?.personalInfo.firstName).sort();
    assert.deepEqual(names, ['TabA', 'TabB']);
    assert.equal(loadCV('eu', 'cv_eu_a')?.objective, 'edited');
  });

  it('refuses to overwrite a newer revision saved by another tab', () => {
    const cv = cvFor('in', 'Ira', 'cv_in_1');
    assert.ok(saveCV(cv).ok); // revision 1, both tabs loaded it
    assert.ok(saveCV({ ...cv, objective: 'from tab B' }, { expectedRevision: 1 }).ok); // tab B → rev 2
    const stale = saveCV({ ...cv, objective: 'from tab A' }, { expectedRevision: 1 }); // tab A still at rev 1
    assert.equal(stale.ok, false);
    assert.equal(stale.ok === false && stale.reason, 'conflict');
    assert.equal(loadCV('in')?.objective, 'from tab B');
    // Explicit overwrite is possible.
    assert.ok(saveCV({ ...cv, objective: 'from tab A' }, { expectedRevision: 1, force: true }).ok);
    assert.equal(loadCV('in')?.objective, 'from tab A');
  });

  it('does not resurrect a draft deleted in another tab', () => {
    const cv = cvFor('latam', 'Lu', 'cv_latam_1');
    assert.ok(saveCV(cv).ok);
    assert.ok(clearCV('latam', cv.id).ok); // other tab deletes it
    const result = saveCV({ ...cv, objective: 'late edit' }, { expectedRevision: 1 });
    assert.equal(result.ok === false && result.reason, 'deleted-elsewhere');
    assert.equal(loadCV('latam'), null);
  });
});

describe('storage: photos, deletion and export', () => {
  beforeEach(resetEnv);

  it('stores identical photos once and resolves them on load', () => {
    const a = cvFor('jp', 'A', 'cv_jp_a');
    const b = cvFor('jp', 'B', 'cv_jp_b');
    a.personalInfo.photo = PHOTO;
    b.personalInfo.photo = PHOTO;
    assert.ok(saveCV(a).ok);
    assert.ok(saveCV(b).ok);
    const photoKeys = localStore.keys().filter((k) => k.startsWith('cv_maker_photo_'));
    assert.equal(photoKeys.length, 1);
    assert.ok(String(rawIndex('jp').drafts.cv_jp_a.data.personalInfo.photo).startsWith(PHOTO_REF_PREFIX));
    assert.equal(loadCV('jp', 'cv_jp_a')?.personalInfo.photo, PHOTO);
    assert.equal(loadCV('jp', 'cv_jp_b')?.personalInfo.photo, PHOTO);

    // Deleting one draft keeps the shared photo; deleting both removes it.
    assert.ok(clearCV('jp', 'cv_jp_a').ok);
    assert.equal(loadCV('jp', 'cv_jp_b')?.personalInfo.photo, PHOTO);
    assert.ok(clearCV('jp', 'cv_jp_b').ok);
    assert.equal(localStore.keys().filter((k) => k.startsWith('cv_maker_photo_')).length, 0);
  });

  it('still loads drafts with legacy inline photos', () => {
    const cv = cvFor('eu', 'Inline', 'cv_eu_inline');
    cv.personalInfo.photo = PHOTO;
    localStore.setItem('cv_maker_v2_eu', JSON.stringify({ version: 2, activeDraftId: cv.id, drafts: { [cv.id]: { version: 2, data: cv, savedAt: 'x' } } }));
    assert.equal(loadCV('eu')?.personalInfo.photo, PHOTO);
  });

  it('clearCV persists deletion (survives a reload)', () => {
    const cv = cvFor('gb', 'Gone', 'cv_gb_gone');
    assert.ok(saveCV(cv).ok);
    localStore.setItem(`globalcv_readiness_history_${cv.id}`, '[]');
    assert.ok(clearCV('gb', cv.id).ok);
    // "Reload": nothing cached in memory — read straight from storage.
    assert.equal(loadCV('gb', cv.id), null);
    assert.ok(!JSON.stringify(rawIndex('gb')).includes('Gone'));
    assert.equal(localStore.getItem(`globalcv_readiness_history_${cv.id}`), null);
  });

  it('exportAllLocalData includes drafts, quarantine and tracker data', () => {
    assert.ok(saveCV(cvFor('us', 'Exported')).ok);
    localStore.setItem('cv_maker_v2_br', '{bad');
    loadCV('br');
    saveApplication({ jobId: 'j1', jobTitle: 'Dev', company: 'Co', status: 'saved' });
    localStore.setItem('unrelated_app_key', 'keep');
    const exported = exportAllLocalData();
    const keys = Object.keys(exported.entries);
    assert.ok(keys.includes('cv_maker_v2_us'));
    assert.ok(keys.includes('cv_maker_applications'));
    assert.ok(keys.some((k) => k.startsWith('cv_maker_quarantine_')));
    assert.ok(!keys.includes('unrelated_app_key'));
  });

  it('eraseAllLocalData removes every GlobalCV key and nothing else', () => {
    const cv = cvFor('jp', 'Erase');
    cv.personalInfo.photo = PHOTO;
    assert.ok(saveCV(cv).ok);
    saveApplication({ jobId: 'j1', jobTitle: 'Dev', company: 'Co', status: 'saved' });
    localStore.setItem('globalcv_dark_mode', 'true');
    localStore.setItem('cv_maker_v1_eu', '{}');
    localStore.setItem('someone_else', 'keep');
    const result = eraseAllLocalData();
    assert.deepEqual(result.remaining, []);
    assert.deepEqual(localStore.keys(), ['someone_else']);
    assert.equal(loadCV('jp'), null);
  });
});

describe('storage: application tracker', () => {
  beforeEach(resetEnv);

  it('sanitises job URLs and reports failed writes', () => {
    const saved = saveApplication({ jobId: 'j', jobTitle: 'T', company: 'C', status: 'saved', jobUrl: 'javascript:alert(1)' });
    assert.ok(saved);
    assert.equal(saved.jobUrl, undefined);
    localStore.failNextWrites = 1;
    assert.equal(saveApplication({ jobId: 'k', jobTitle: 'T', company: 'C', status: 'saved' }), null);
  });

  it('keeps malformed tracker entries when updating others', () => {
    localStore.setItem('cv_maker_applications', JSON.stringify([{ weird: true }, { id: 'a', jobId: 'j', jobTitle: 'T', company: 'C', status: 'saved', savedAt: 'x' }]));
    assert.equal(listApplications().length, 1);
    assert.ok(updateApplicationStatus('a', 'applied'));
    const raw = JSON.parse(localStore.getItem('cv_maker_applications') as string);
    assert.equal(raw.length, 2);
    assert.equal(raw[1].status, 'applied');
  });

  it('quarantines an unreadable tracker before replacing it', () => {
    localStore.setItem('cv_maker_applications', '[oops');
    assert.ok(saveApplication({ jobId: 'j', jobTitle: 'T', company: 'C', status: 'saved' }));
    assert.ok(listQuarantineKeys().some((k) => k.includes('applications')));
  });
});
