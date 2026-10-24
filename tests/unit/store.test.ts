import { localStore, resetEnv } from '../helpers/browserEnv';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useCVStore, createEmptyCVData } from '@/store/cvStore';
import { loadCV, listSavedDrafts, saveCV } from '@/lib/storage/localStorage';
import type { CVData } from '@/types/cv.types';

const store = () => useCVStore.getState();

function freshStart(market: CVData['market'] = 'us') {
  resetEnv();
  useCVStore.setState({ privacyMode: false, isDirty: false, saveError: null, loadedRevision: null });
  assert.ok(store().initializeMarket(market));
}

describe('store: save status is truthful', () => {
  beforeEach(() => freshStart());

  it('marks a successful save as saved', () => {
    store().setPersonalInfo({ firstName: 'Alice' });
    const result = store().save();
    assert.ok(result?.ok);
    assert.equal(store().isDirty, false);
    assert.ok(store().lastSaved);
    assert.equal(store().saveError, null);
    assert.equal(loadCV('us')?.personalInfo.firstName, 'Alice');
  });

  it('never reports a failed save as successful (quota)', () => {
    store().setPersonalInfo({ firstName: 'Alice' });
    const before = store().lastSaved;
    localStore.failNextWrites = 10;
    const result = store().save();
    assert.equal(result?.ok, false);
    assert.equal(store().isDirty, true, 'changes must remain marked unsaved');
    assert.equal(store().lastSaved, before, 'lastSaved must not advance');
    assert.equal(store().saveError?.reason, 'quota');
    // Retry succeeds once space is available.
    localStore.failNextWrites = 0;
    assert.ok(store().save()?.ok);
    assert.equal(store().saveError, null);
  });

  it('does not discard unsaved edits when switching drafts fails to save them', () => {
    store().setPersonalInfo({ firstName: 'Unsaved' });
    localStore.failNextWrites = 10;
    assert.equal(store().initializeMarket('eu'), false);
    assert.equal(store().cv.personalInfo.firstName, 'Unsaved');
    assert.equal(store().cv.market, 'us');
  });
});

describe('store: Clear current CV / Erase all (audit P1-1 regression)', () => {
  beforeEach(() => freshStart('gb'));

  it('Clear deletes the draft from storage and does not keep it as another draft', () => {
    store().setPersonalInfo({ firstName: 'Alice', email: 'alice@example.com' });
    assert.ok(store().save()?.ok);
    const result = store().clearCurrentCV();
    assert.ok(result.ok);
    assert.equal(store().isDirty, false, 'empty CV is not auto-saved as a new draft');
    // "Reload": re-read from storage only.
    assert.equal(listSavedDrafts('gb').length, 0);
    assert.ok(!JSON.stringify(Object.fromEntries(localStore.keys().map((k) => [k, localStore.getItem(k)]))).includes('alice@example.com'));
    assert.ok(store().initializeMarket('gb'));
    assert.equal(store().cv.personalInfo.firstName, '');
  });

  it('Clear keeps other drafts', () => {
    const other = createEmptyCVData('gb');
    other.personalInfo.firstName = 'Keep';
    assert.ok(saveCV(other).ok);
    store().setPersonalInfo({ firstName: 'Delete' });
    assert.ok(store().save()?.ok);
    assert.ok(store().clearCurrentCV().ok);
    const names = listSavedDrafts('gb').map((d) => loadCV('gb', d.id)?.personalInfo.firstName);
    assert.deepEqual(names, ['Keep']);
  });

  it('Erase all removes every GlobalCV key, persists after reload, and leaves other data', () => {
    store().setPersonalInfo({ firstName: 'Alice' });
    assert.ok(store().save()?.ok);
    const jp = createEmptyCVData('jp');
    jp.personalInfo.photo = `data:image/jpeg;base64,${'B'.repeat(2000)}`;
    assert.ok(saveCV(jp).ok);
    localStore.setItem('cv_maker_applications', '[]');
    localStore.setItem('globalcv_preview_width', '400');
    localStore.setItem('third_party', 'x');
    const result = store().eraseAllData();
    assert.deepEqual(result.remaining, []);
    assert.deepEqual(localStore.keys(), ['third_party']);
    assert.ok(store().initializeMarket('gb'));
    assert.equal(store().cv.personalInfo.firstName, '');
    assert.equal(listSavedDrafts().length, 0);
  });
});

describe('store: import as new draft (audit P1-3 regression)', () => {
  beforeEach(() => freshStart('eu'));

  it('opens shared/backup data as a new draft in its own market without touching existing drafts', () => {
    store().setPersonalInfo({ firstName: 'Mine' });
    assert.ok(store().save()?.ok);
    const mineId = store().cv.id;

    const shared = createEmptyCVData('eu');
    shared.id = mineId; // even a colliding id must not overwrite
    shared.personalInfo.firstName = 'Shared';
    shared.projects = [{ id: 'p', name: 'P', description: 'D' }];
    shared.targetRole = 'Role';
    assert.ok(store().importAsNewDraft(shared, 'eu'));
    assert.notEqual(store().cv.id, mineId);
    assert.equal(store().cv.market, 'eu');
    assert.ok(store().save()?.ok);

    assert.equal(loadCV('eu', mineId)?.personalInfo.firstName, 'Mine');
    const imported = loadCV('eu', store().cv.id);
    assert.equal(imported?.personalInfo.firstName, 'Shared');
    assert.equal(imported?.projects[0].name, 'P');
    assert.equal(imported?.targetRole, 'Role');
    assert.equal(localStore.getItem('cv_maker_v2_us'), null, 'nothing written to another market');
  });

  it('falls back to the market default template when the imported template does not exist', () => {
    const shared = createEmptyCVData('eu');
    shared.templateId = 'nope';
    assert.ok(store().importAsNewDraft(shared, 'eu'));
    assert.notEqual(store().cv.templateId, 'nope');
  });
});

describe('store: multi-tab conflicts surface to the user', () => {
  beforeEach(() => freshStart('in'));

  it('blocks a stale save and lets the user keep both versions', () => {
    store().setPersonalInfo({ firstName: 'Tab A' });
    assert.ok(store().save()?.ok);
    const id = store().cv.id;
    // Another tab saves a newer revision of the same draft.
    const other = loadCV('in', id)!;
    assert.ok(saveCV({ ...other, objective: 'from tab B' }, { expectedRevision: 1 }).ok);

    store().setObjective('from tab A');
    const result = store().save();
    assert.equal(result?.ok === false && result.reason, 'conflict');
    assert.equal(store().isDirty, true);
    assert.equal(loadCV('in', id)?.objective, 'from tab B');

    const resolved = store().resolveSaveConflict('keep-both');
    assert.ok(resolved && typeof resolved === 'object' && resolved.ok);
    assert.equal(loadCV('in', id)?.objective, 'from tab B');
    assert.equal(loadCV('in', store().cv.id)?.objective, 'from tab A');
  });

  it('reloading the other tab\'s version is an explicit choice', () => {
    store().setObjective('v1');
    assert.ok(store().save()?.ok);
    const id = store().cv.id;
    const rev = store().loadedRevision!;
    assert.ok(saveCV({ ...loadCV('in', id)!, objective: 'other' }, { expectedRevision: rev }).ok);
    store().setObjective('mine');
    assert.equal(store().save()?.ok, false);
    store().resolveSaveConflict('reload');
    assert.equal(store().cv.objective, 'other');
    store().setObjective('mine again');
    assert.ok(store().save()?.ok);
  });
});
