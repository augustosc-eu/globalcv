import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  CVData,
  Market,
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
  Language,
  Certification,
  Reference,
  Project,
  PageSize,
  RemoteWorkProfile,
} from '@/types/cv.types';
import {
  saveCV,
  loadDraft,
  setActiveDraft,
  clearCV,
  eraseAllLocalData,
  registerRepairContext,
  SaveResult,
  StorageFailureReason,
  StorageResult,
  EraseResult,
} from '@/lib/storage/localStorage';
import { getMarketConfig } from '@/lib/markets';
import { MARKETS } from '@/lib/markets/registry';

for (const market of MARKETS) {
  const config = getMarketConfig(market);
  registerRepairContext({ market, templateId: config.templates[0]?.id ?? '', pageSize: config.pageSize });
}

type ImportSectionKey =
  | 'personalInfo'
  | 'objective'
  | 'workExperience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'references'
  | 'selfPromotion'
  | 'reasonForApplication'
  | 'desiredConditions';

interface WizardState {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

interface CVStoreState {
  cv: CVData;
  wizard: WizardState;
  isDirty: boolean;
  lastSaved: string | null;
  isSaving: boolean;
  privacyMode: boolean;
  history: CVData[];
  historyIndex: number;
  /** Last persistence failure; null when the latest save succeeded. */
  saveError: { reason: StorageFailureReason; message: string } | null;
  /** Revision of the current draft as last loaded/saved; null = never persisted. */
  loadedRevision: number | null;
  /** Current draft was loaded through automatic repair (original kept for recovery). */
  loadedFromRepair: boolean;
}

export type ConflictChoice = 'overwrite' | 'reload' | 'keep-both';

interface CVStoreActions {
  /** Loads a market/draft. Returns false (and keeps unsaved edits) if they could not be saved first. */
  initializeMarket: (market: Market, draftId?: string | null) => boolean;
  resetCV: (market: Market) => void;
  restoreCV: (data: CVData, options?: { markDirty?: boolean; setActive?: boolean; revision?: number | null }) => void;
  /** Opens external data (share link, backup file) as a brand-new draft; never merges or overwrites. */
  importAsNewDraft: (data: CVData, market: Market) => boolean;
  /** Permanently deletes the current draft from storage and starts an empty CV. */
  clearCurrentCV: () => StorageResult;
  /** Removes all GlobalCV data from this device and resets the editor. */
  eraseAllData: () => EraseResult;
  resolveSaveConflict: (choice: ConflictChoice) => SaveResult | boolean;
  dismissSaveError: () => void;
  setDraftTitle: (title: string) => void;

  setPersonalInfo: (info: Partial<PersonalInfo>) => void;
  setObjective: (text: string) => void;

  addWorkExperience: (exp: Omit<WorkExperience, 'id'>) => void;
  updateWorkExperience: (id: string, exp: Partial<WorkExperience>) => void;
  removeWorkExperience: (id: string) => void;
  reorderWorkExperience: (ids: string[]) => void;
  duplicateWorkExperience: (id: string) => void;

  addEducation: (edu: Omit<Education, 'id'>) => void;
  updateEducation: (id: string, edu: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  reorderEducation: (ids: string[]) => void;
  duplicateEducation: (id: string) => void;

  addSkill: (skill: Omit<Skill, 'id'>) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  reorderSkills: (ids: string[]) => void;

  addLanguage: (lang: Omit<Language, 'id'>) => void;
  updateLanguage: (id: string, lang: Partial<Language>) => void;
  removeLanguage: (id: string) => void;

  addCertification: (cert: Omit<Certification, 'id'>) => void;
  updateCertification: (id: string, cert: Partial<Certification>) => void;
  removeCertification: (id: string) => void;
  duplicateCertification: (id: string) => void;

  addReference: (ref: Omit<Reference, 'id'>) => void;
  updateReference: (id: string, ref: Partial<Reference>) => void;
  removeReference: (id: string) => void;
  duplicateReference: (id: string) => void;

  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  removeProject: (id: string) => void;
  reorderProjects: (ids: string[]) => void;
  duplicateProject: (id: string) => void;

  setSelfPromotion: (text: string) => void;
  setReasonForApplication: (text: string) => void;
  setDesiredConditions: (text: string) => void;
  setTargeting: (data: Pick<CVData, 'targetRole' | 'targetCompany' | 'jobDescriptionNotes'>) => void;
  setRemoteWorkProfile: (profile: RemoteWorkProfile) => void;

  setQrCodeEnabled: (enabled: boolean) => void;

  setFontFamily: (font: CVData['fontFamily']) => void;

  setMarket: (market: Market) => void;
  setTemplate: (templateId: string) => void;
  setPageSize: (size: PageSize) => void;
  setColorTheme: (color: string) => void;

  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSteps: (steps: string[]) => void;

  save: (options?: { force?: boolean }) => SaveResult | null;
  markClean: () => void;
  togglePrivacyMode: () => void;

  undo: () => void;
  redo: () => void;

  clearSection: (section: ImportSectionKey) => void;
  applyImportSections: (
    data: Partial<CVData>,
    sections: Record<ImportSectionKey, boolean>,
    options?: { replaceExisting?: boolean }
  ) => void;
}

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function pushSnapshot(state: CVStoreState, cv: CVData) {
  state.history = [clone(cv)];
  state.historyIndex = 0;
}

export function createEmptyCVData(market: Market): CVData {
  const config = getMarketConfig(market);
  const now = new Date().toISOString();
  return {
    id: `cv_${market}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: `${config.name} Draft`,
    market,
    templateId: config.templates[0]?.id ?? '',
    lastModified: now,
    version: 2,
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
    workExperience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    references: [],
    projects: [],
    pageSize: config.pageSize,
    colorTheme: config.color,
    hiddenSections: [],
  };
}

let isUndoRedoing = false;

export const useCVStore = create<CVStoreState & CVStoreActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      cv: createEmptyCVData('us'),
      wizard: {
        currentStep: 0,
        totalSteps: 0,
        stepNames: [],
      },
      isDirty: false,
      lastSaved: null,
      isSaving: false,
      privacyMode: false,
      history: [],
      historyIndex: -1,
      saveError: null,
      loadedRevision: null,
      loadedFromRepair: false,

      initializeMarket: (market, draftId) => {
        if (!flushPendingSave()) return false;
        const loaded = get().privacyMode ? null : loadDraft(market, draftId);
        const nextCV = loaded?.cv ?? createEmptyCVData(market);

        if (loaded && !get().privacyMode) {
          setActiveDraft(market, loaded.cv.id);
        }

        set((state) => {
          state.cv = nextCV;
          state.isDirty = false;
          state.lastSaved = loaded ? nextCV.lastModified ?? null : null;
          state.loadedRevision = loaded?.revision ?? null;
          state.loadedFromRepair = loaded?.repaired ?? false;
          state.saveError = null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
        return true;
      },

      resetCV: (market) => {
        const nextCV = createEmptyCVData(market);
        set((state) => {
          state.cv = nextCV;
          state.isDirty = false;
          state.lastSaved = null;
          state.loadedRevision = null;
          state.loadedFromRepair = false;
          state.saveError = null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
      },

      restoreCV: (data, options) => {
        const nextCV = clone(data);
        if (options?.setActive !== false && !get().privacyMode) {
          setActiveDraft(nextCV.market, nextCV.id);
        }
        set((state) => {
          state.cv = nextCV;
          state.isDirty = options?.markDirty ?? true;
          state.lastSaved = options?.markDirty === false ? nextCV.lastModified ?? null : null;
          state.loadedRevision = options?.revision ?? null;
          state.loadedFromRepair = false;
          state.saveError = null;
          pushSnapshot(state, nextCV);
        });
      },

      importAsNewDraft: (data, market) => {
        if (!flushPendingSave()) return false;
        const config = getMarketConfig(market);
        const templateIds = config.templates.map((t) => t.id);
        const nextCV: CVData = {
          ...clone(data),
          id: `cv_${market}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          market,
          templateId: templateIds.includes(data.templateId) ? data.templateId : config.templates[0]?.id ?? '',
          lastModified: new Date().toISOString(),
        };
        set((state) => {
          state.cv = nextCV;
          state.isDirty = true;
          state.lastSaved = null;
          state.loadedRevision = null;
          state.loadedFromRepair = false;
          state.saveError = null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
        return true;
      },

      clearCurrentCV: () => {
        const { cv, privacyMode } = get();
        cancelPendingAutosave();
        const result: StorageResult = privacyMode ? { ok: true } : clearCV(cv.market, cv.id);
        if (!result.ok) {
          set((state) => {
            state.saveError = { reason: result.reason, message: result.message };
          });
          return result;
        }
        const nextCV = createEmptyCVData(cv.market);
        set((state) => {
          state.cv = nextCV;
          state.isDirty = false;
          state.lastSaved = null;
          state.loadedRevision = null;
          state.loadedFromRepair = false;
          state.saveError = null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
        return result;
      },

      eraseAllData: () => {
        cancelPendingAutosave();
        const market = get().cv.market;
        const result = eraseAllLocalData();
        const nextCV = createEmptyCVData(market);
        set((state) => {
          state.cv = nextCV;
          state.isDirty = false;
          state.lastSaved = null;
          state.loadedRevision = null;
          state.loadedFromRepair = false;
          state.saveError = null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
        return result;
      },

      resolveSaveConflict: (choice) => {
        const { cv } = get();
        if (choice === 'overwrite') return get().save({ force: true }) ?? false;
        if (choice === 'reload') {
          set((state) => {
            state.isDirty = false;
            state.saveError = null;
          });
          return get().initializeMarket(cv.market, cv.id);
        }
        set((state) => {
          state.cv.id = `cv_${cv.market}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          state.cv.title = `${cv.title ?? 'Draft'} (this tab)`;
          state.loadedRevision = null;
          state.isDirty = true;
        });
        return get().save() ?? false;
      },

      dismissSaveError: () => {
        set((state) => {
          state.saveError = null;
        });
      },

      setDraftTitle: (title) => {
        set((state) => {
          state.cv.title = title.trim() || state.cv.title;
          state.isDirty = true;
        });
      },

      setPersonalInfo: (info) => {
        set((state) => {
          state.cv.personalInfo = { ...state.cv.personalInfo, ...info };
          state.isDirty = true;
        });
      },

      setObjective: (text) => {
        set((state) => {
          state.cv.objective = text;
          state.isDirty = true;
        });
      },

      addWorkExperience: (exp) => {
        set((state) => {
          state.cv.workExperience.push({ ...exp, id: genId() });
          state.isDirty = true;
        });
      },

      updateWorkExperience: (id, exp) => {
        set((state) => {
          const idx = state.cv.workExperience.findIndex((e) => e.id === id);
          if (idx !== -1) {
            state.cv.workExperience[idx] = { ...state.cv.workExperience[idx], ...exp };
            state.isDirty = true;
          }
        });
      },

      removeWorkExperience: (id) => {
        set((state) => {
          state.cv.workExperience = state.cv.workExperience.filter((e) => e.id !== id);
          state.isDirty = true;
        });
      },

      reorderWorkExperience: (ids) => {
        set((state) => {
          const map = new Map(state.cv.workExperience.map((e) => [e.id, e]));
          state.cv.workExperience = ids.map((id) => map.get(id)).filter(Boolean) as WorkExperience[];
          state.isDirty = true;
        });
      },

      duplicateWorkExperience: (id) => {
        set((state) => {
          const item = state.cv.workExperience.find((exp) => exp.id === id);
          if (!item) return;
          state.cv.workExperience.splice(
            state.cv.workExperience.findIndex((exp) => exp.id === id) + 1,
            0,
            { ...clone(item), id: genId() }
          );
          state.isDirty = true;
        });
      },

      addEducation: (edu) => {
        set((state) => {
          state.cv.education.push({ ...edu, id: genId() });
          state.isDirty = true;
        });
      },

      updateEducation: (id, edu) => {
        set((state) => {
          const idx = state.cv.education.findIndex((e) => e.id === id);
          if (idx !== -1) {
            state.cv.education[idx] = { ...state.cv.education[idx], ...edu };
            state.isDirty = true;
          }
        });
      },

      removeEducation: (id) => {
        set((state) => {
          state.cv.education = state.cv.education.filter((e) => e.id !== id);
          state.isDirty = true;
        });
      },

      reorderEducation: (ids) => {
        set((state) => {
          const map = new Map(state.cv.education.map((e) => [e.id, e]));
          state.cv.education = ids.map((id) => map.get(id)).filter(Boolean) as Education[];
          state.isDirty = true;
        });
      },

      duplicateEducation: (id) => {
        set((state) => {
          const item = state.cv.education.find((edu) => edu.id === id);
          if (!item) return;
          state.cv.education.splice(
            state.cv.education.findIndex((edu) => edu.id === id) + 1,
            0,
            { ...clone(item), id: genId() }
          );
          state.isDirty = true;
        });
      },

      addSkill: (skill) => {
        set((state) => {
          state.cv.skills.push({ ...skill, id: genId() });
          state.isDirty = true;
        });
      },

      updateSkill: (id, skill) => {
        set((state) => {
          const idx = state.cv.skills.findIndex((s) => s.id === id);
          if (idx !== -1) {
            state.cv.skills[idx] = { ...state.cv.skills[idx], ...skill };
            state.isDirty = true;
          }
        });
      },

      removeSkill: (id) => {
        set((state) => {
          state.cv.skills = state.cv.skills.filter((s) => s.id !== id);
          state.isDirty = true;
        });
      },

      reorderSkills: (ids) => {
        set((state) => {
          const map = new Map(state.cv.skills.map((s) => [s.id, s]));
          state.cv.skills = ids.map((id) => map.get(id)).filter(Boolean) as Skill[];
          state.isDirty = true;
        });
      },

      addLanguage: (lang) => {
        set((state) => {
          state.cv.languages.push({ ...lang, id: genId() });
          state.isDirty = true;
        });
      },

      updateLanguage: (id, lang) => {
        set((state) => {
          const idx = state.cv.languages.findIndex((l) => l.id === id);
          if (idx !== -1) {
            state.cv.languages[idx] = { ...state.cv.languages[idx], ...lang };
            state.isDirty = true;
          }
        });
      },

      removeLanguage: (id) => {
        set((state) => {
          state.cv.languages = state.cv.languages.filter((l) => l.id !== id);
          state.isDirty = true;
        });
      },

      addCertification: (cert) => {
        set((state) => {
          state.cv.certifications.push({ ...cert, id: genId() });
          state.isDirty = true;
        });
      },

      updateCertification: (id, cert) => {
        set((state) => {
          const idx = state.cv.certifications.findIndex((c) => c.id === id);
          if (idx !== -1) {
            state.cv.certifications[idx] = { ...state.cv.certifications[idx], ...cert };
            state.isDirty = true;
          }
        });
      },

      removeCertification: (id) => {
        set((state) => {
          state.cv.certifications = state.cv.certifications.filter((c) => c.id !== id);
          state.isDirty = true;
        });
      },

      duplicateCertification: (id) => {
        set((state) => {
          const item = state.cv.certifications.find((cert) => cert.id === id);
          if (!item) return;
          state.cv.certifications.splice(
            state.cv.certifications.findIndex((cert) => cert.id === id) + 1,
            0,
            { ...clone(item), id: genId() }
          );
          state.isDirty = true;
        });
      },

      addReference: (ref) => {
        set((state) => {
          state.cv.references.push({ ...ref, id: genId() });
          state.isDirty = true;
        });
      },

      updateReference: (id, ref) => {
        set((state) => {
          const idx = state.cv.references.findIndex((r) => r.id === id);
          if (idx !== -1) {
            state.cv.references[idx] = { ...state.cv.references[idx], ...ref };
            state.isDirty = true;
          }
        });
      },

      removeReference: (id) => {
        set((state) => {
          state.cv.references = state.cv.references.filter((r) => r.id !== id);
          state.isDirty = true;
        });
      },

      duplicateReference: (id) => {
        set((state) => {
          const item = state.cv.references.find((ref) => ref.id === id);
          if (!item) return;
          state.cv.references.splice(
            state.cv.references.findIndex((ref) => ref.id === id) + 1,
            0,
            { ...clone(item), id: genId() }
          );
          state.isDirty = true;
        });
      },

      addProject: (project) => {
        set((state) => {
          state.cv.projects = state.cv.projects ?? [];
          state.cv.projects.push({ ...project, id: genId() });
          state.isDirty = true;
        });
      },

      updateProject: (id, project) => {
        set((state) => {
          const idx = (state.cv.projects ?? []).findIndex((p) => p.id === id);
          if (idx !== -1) {
            state.cv.projects[idx] = { ...state.cv.projects[idx], ...project };
            state.isDirty = true;
          }
        });
      },

      removeProject: (id) => {
        set((state) => {
          state.cv.projects = (state.cv.projects ?? []).filter((p) => p.id !== id);
          state.isDirty = true;
        });
      },

      reorderProjects: (ids) => {
        set((state) => {
          const map = new Map((state.cv.projects ?? []).map((p) => [p.id, p]));
          state.cv.projects = ids.map((id) => map.get(id)).filter(Boolean) as Project[];
          state.isDirty = true;
        });
      },

      duplicateProject: (id) => {
        set((state) => {
          const item = (state.cv.projects ?? []).find((p) => p.id === id);
          if (!item) return;
          state.cv.projects.splice(
            state.cv.projects.findIndex((p) => p.id === id) + 1,
            0,
            { ...clone(item), id: genId() }
          );
          state.isDirty = true;
        });
      },

      setSelfPromotion: (text) => {
        set((state) => {
          state.cv.selfPromotion = text;
          state.isDirty = true;
        });
      },

      setReasonForApplication: (text) => {
        set((state) => {
          state.cv.reasonForApplication = text;
          state.isDirty = true;
        });
      },

      setDesiredConditions: (text) => {
        set((state) => {
          state.cv.desiredConditions = text;
          state.isDirty = true;
        });
      },

      setTargeting: (data) => {
        set((state) => {
          state.cv.targetRole = data.targetRole;
          state.cv.targetCompany = data.targetCompany;
          state.cv.jobDescriptionNotes = data.jobDescriptionNotes;
          state.isDirty = true;
        });
      },

      setRemoteWorkProfile: (profile) => {
        set((state) => {
          state.cv.remoteWorkProfile = profile;
          state.isDirty = true;
        });
      },

      setQrCodeEnabled: (enabled) => {
        set((state) => {
          state.cv.qrCodeEnabled = enabled;
          state.isDirty = true;
        });
      },

      setFontFamily: (font) => {
        set((state) => {
          state.cv.fontFamily = font;
          state.isDirty = true;
        });
      },

      setMarket: (market) => {
        set((state) => {
          state.cv.market = market;
          const config = getMarketConfig(market);
          state.cv.pageSize = config.pageSize;
          state.cv.colorTheme = config.color;
          state.cv.templateId = config.templates[0]?.id ?? '';
          state.isDirty = true;
        });
      },

      setTemplate: (templateId) => {
        set((state) => {
          state.cv.templateId = templateId;
          state.isDirty = true;
        });
      },

      setPageSize: (size) => {
        set((state) => {
          state.cv.pageSize = size;
          state.isDirty = true;
        });
      },

      setColorTheme: (color) => {
        set((state) => {
          state.cv.colorTheme = color;
          state.isDirty = true;
        });
      },

      setCurrentStep: (step) => {
        set((state) => {
          state.wizard.currentStep = Math.max(0, Math.min(step, state.wizard.totalSteps - 1));
        });
      },

      nextStep: () => {
        set((state) => {
          if (state.wizard.currentStep < state.wizard.totalSteps - 1) {
            state.wizard.currentStep += 1;
          }
        });
      },

      prevStep: () => {
        set((state) => {
          if (state.wizard.currentStep > 0) {
            state.wizard.currentStep -= 1;
          }
        });
      },

      setSteps: (steps) => {
        set((state) => {
          state.wizard.stepNames = steps;
          state.wizard.totalSteps = steps.length;
        });
      },

      save: (options) => {
        const { cv, privacyMode, loadedRevision } = get();
        if (privacyMode) return null;
        cancelPendingAutosave();

        set((state) => {
          state.isSaving = true;
        });

        let result: SaveResult;
        try {
          result = saveCV(cv, { expectedRevision: loadedRevision, force: options?.force });
        } catch (err) {
          result = {
            ok: false,
            reason: 'unavailable',
            message: `Saving failed unexpectedly (${err instanceof Error ? err.message : 'unknown error'}). Your latest changes are NOT saved.`,
          };
        }

        if (result.ok) {
          const { savedAt, revision } = result;
          // Only mark clean if nothing changed while saving.
          const unchanged = get().cv === cv;
          set((state) => {
            if (unchanged) state.isDirty = false;
            state.lastSaved = savedAt;
            state.isSaving = false;
            state.saveError = null;
            state.loadedRevision = revision;
            state.loadedFromRepair = false;
            state.cv.lastModified = savedAt;
          });
        } else {
          const failed = result;
          set((state) => {
            state.isSaving = false;
            state.isDirty = true;
            state.saveError = { reason: failed.reason, message: failed.message };
          });
        }
        return result;
      },

      markClean: () => {
        set((state) => {
          state.isDirty = false;
        });
      },

      togglePrivacyMode: () => {
        set((state) => {
          state.privacyMode = !state.privacyMode;
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        isUndoRedoing = true;
        set((state) => {
          state.cv = clone(history[newIndex]);
          state.historyIndex = newIndex;
          state.isDirty = true;
        });
        isUndoRedoing = false;
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        isUndoRedoing = true;
        set((state) => {
          state.cv = clone(history[newIndex]);
          state.historyIndex = newIndex;
          state.isDirty = true;
        });
        isUndoRedoing = false;
      },

      clearSection: (section) => {
        set((state) => {
          switch (section) {
            case 'personalInfo':
              state.cv.personalInfo = createEmptyCVData(state.cv.market).personalInfo;
              break;
            case 'objective':
              state.cv.objective = '';
              break;
            case 'workExperience':
              state.cv.workExperience = [];
              break;
            case 'education':
              state.cv.education = [];
              break;
            case 'skills':
              state.cv.skills = [];
              break;
            case 'languages':
              state.cv.languages = [];
              break;
            case 'certifications':
              state.cv.certifications = [];
              break;
            case 'references':
              state.cv.references = [];
              break;
            case 'selfPromotion':
              state.cv.selfPromotion = '';
              break;
            case 'reasonForApplication':
              state.cv.reasonForApplication = '';
              break;
            case 'desiredConditions':
              state.cv.desiredConditions = '';
              break;
          }
          state.isDirty = true;
        });
      },

      applyImportSections: (data, sections, options) => {
        const replaceExisting = options?.replaceExisting ?? true;
        set((state) => {
          if (sections.personalInfo && data.personalInfo) {
            state.cv.personalInfo = { ...state.cv.personalInfo, ...data.personalInfo };
          }
          if (sections.objective && typeof data.objective === 'string') {
            state.cv.objective = data.objective;
          }
          if (sections.workExperience && data.workExperience) {
            state.cv.workExperience = replaceExisting
              ? data.workExperience.map((item) => ({ ...item, id: genId() })) as WorkExperience[]
              : [...state.cv.workExperience, ...data.workExperience.map((item) => ({ ...item, id: genId() })) as WorkExperience[]];
          }
          if (sections.education && data.education) {
            state.cv.education = replaceExisting
              ? data.education.map((item) => ({ ...item, id: genId() })) as Education[]
              : [...state.cv.education, ...data.education.map((item) => ({ ...item, id: genId() })) as Education[]];
          }
          if (sections.skills && data.skills) {
            state.cv.skills = replaceExisting
              ? data.skills.map((item) => ({ ...item, id: genId() })) as Skill[]
              : [...state.cv.skills, ...data.skills.map((item) => ({ ...item, id: genId() })) as Skill[]];
          }
          if (sections.languages && data.languages) {
            state.cv.languages = replaceExisting
              ? data.languages.map((item) => ({ ...item, id: genId() })) as Language[]
              : [...state.cv.languages, ...data.languages.map((item) => ({ ...item, id: genId() })) as Language[]];
          }
          if (sections.certifications && data.certifications) {
            state.cv.certifications = replaceExisting
              ? data.certifications.map((item) => ({ ...item, id: genId() })) as Certification[]
              : [...state.cv.certifications, ...data.certifications.map((item) => ({ ...item, id: genId() })) as Certification[]];
          }
          if (sections.references && data.references) {
            state.cv.references = replaceExisting
              ? data.references.map((item) => ({ ...item, id: genId() })) as Reference[]
              : [...state.cv.references, ...data.references.map((item) => ({ ...item, id: genId() })) as Reference[]];
          }
          if (sections.selfPromotion && typeof data.selfPromotion === 'string') {
            state.cv.selfPromotion = data.selfPromotion;
          }
          if (sections.reasonForApplication && typeof data.reasonForApplication === 'string') {
            state.cv.reasonForApplication = data.reasonForApplication;
          }
          if (sections.desiredConditions && typeof data.desiredConditions === 'string') {
            state.cv.desiredConditions = data.desiredConditions;
          }
          state.isDirty = true;
        });
      },
    }))
  )
);

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DELAY_MS = 1500;

function cancelPendingAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = null;
}

/**
 * Save pending edits before the editor switches to another draft/market.
 * Returns false when the save failed, so callers keep the unsaved edits.
 */
function flushPendingSave(): boolean {
  const state = useCVStore.getState();
  if (!state.isDirty || state.privacyMode) return true;
  const result = state.save();
  return result === null || result.ok;
}

// Debounced autosave on every CV change (so a failed save is retried on the next edit).
useCVStore.subscribe(
  (state) => [state.cv, state.isDirty] as const,
  ([, isDirty]) => {
    if (!isDirty) return;
    const { saveError } = useCVStore.getState();
    // Conflicts need an explicit user decision; don't retry them automatically.
    if (saveError && (saveError.reason === 'conflict' || saveError.reason === 'deleted-elsewhere')) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      useCVStore.getState().save();
    }, AUTOSAVE_DELAY_MS);
  },
  { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] }
);

const MAX_HISTORY = 20;
let historyTimer: ReturnType<typeof setTimeout> | null = null;

useCVStore.subscribe(
  (state) => state.isDirty,
  (isDirty) => {
    if (!isDirty || isUndoRedoing) return;
    if (historyTimer) clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      const store = useCVStore.getState();
      const snapshot = clone(store.cv);
      useCVStore.setState((state) => {
        const base = state.history.slice(0, state.historyIndex + 1);
        const next = [...base, snapshot].slice(-MAX_HISTORY);
        state.history = next;
        state.historyIndex = next.length - 1;
      });
    }, 2000);
  }
);
