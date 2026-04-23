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
  PageSize,
} from '@/types/cv.types';
import { saveCV, loadCV, setActiveDraft } from '@/lib/storage/localStorage';
import { getMarketConfig } from '@/lib/markets';

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
}

interface CVStoreActions {
  initializeMarket: (market: Market, draftId?: string | null) => void;
  resetCV: (market: Market) => void;
  restoreCV: (data: CVData, options?: { markDirty?: boolean; setActive?: boolean }) => void;
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

  setSelfPromotion: (text: string) => void;
  setReasonForApplication: (text: string) => void;
  setDesiredConditions: (text: string) => void;
  setTargeting: (data: Pick<CVData, 'targetRole' | 'targetCompany' | 'jobDescriptionNotes'>) => void;

  setMarket: (market: Market) => void;
  setTemplate: (templateId: string) => void;
  setPageSize: (size: PageSize) => void;
  setColorTheme: (color: string) => void;

  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSteps: (steps: string[]) => void;

  save: () => void;
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
    id: `cv_${market}_${Date.now()}`,
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

      initializeMarket: (market, draftId) => {
        const saved = get().privacyMode ? null : loadCV(market, draftId);
        const nextCV = saved ?? createEmptyCVData(market);

        if (saved && !get().privacyMode) {
          setActiveDraft(market, saved.id);
        }

        set((state) => {
          state.cv = nextCV;
          state.isDirty = false;
          state.lastSaved = nextCV.lastModified ?? null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
      },

      resetCV: (market) => {
        const nextCV = createEmptyCVData(market);
        set((state) => {
          state.cv = nextCV;
          state.isDirty = true;
          state.lastSaved = null;
          state.wizard.currentStep = 0;
          pushSnapshot(state, nextCV);
        });
      },

      restoreCV: (data, options) => {
        const nextCV = clone(data);
        if (options?.setActive !== false) {
          setActiveDraft(nextCV.market, nextCV.id);
        }
        set((state) => {
          state.cv = nextCV;
          state.isDirty = options?.markDirty ?? true;
          state.lastSaved = nextCV.lastModified ?? null;
          pushSnapshot(state, nextCV);
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

      save: () => {
        const { cv, privacyMode } = get();
        if (privacyMode) return;

        set((state) => {
          state.isSaving = true;
        });

        try {
          saveCV(cv);
          const savedAt = new Date().toISOString();
          set((state) => {
            state.isDirty = false;
            state.lastSaved = savedAt;
            state.isSaving = false;
            state.cv.lastModified = savedAt;
          });
        } catch {
          set((state) => {
            state.isSaving = false;
          });
        }
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

useCVStore.subscribe(
  (state) => state.isDirty,
  (isDirty) => {
    if (!isDirty) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      useCVStore.getState().save();
    }, 1500);
  }
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
