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
import { saveCV, loadCV } from '@/lib/storage/localStorage';
import { getMarketConfig } from '@/lib/markets';

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createEmptyCVData(market: Market): CVData {
  const config = getMarketConfig(market);
  return {
    id: `cv_${market}_${Date.now()}`,
    market,
    templateId: config.templates[0]?.id ?? '',
    lastModified: new Date().toISOString(),
    version: 1,
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
  };
}

// ─── Store types ──────────────────────────────────────────────────────────────

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
  // Undo/redo history
  history: CVData[];
  historyIndex: number;
}

interface CVStoreActions {
  // Initialization
  initializeMarket: (market: Market) => void;
  resetCV: (market: Market) => void;
  restoreCV: (data: CVData) => void;

  // Personal info
  setPersonalInfo: (info: Partial<PersonalInfo>) => void;

  // Objective / summary
  setObjective: (text: string) => void;

  // Work experience
  addWorkExperience: (exp: Omit<WorkExperience, 'id'>) => void;
  updateWorkExperience: (id: string, exp: Partial<WorkExperience>) => void;
  removeWorkExperience: (id: string) => void;
  reorderWorkExperience: (ids: string[]) => void;

  // Education
  addEducation: (edu: Omit<Education, 'id'>) => void;
  updateEducation: (id: string, edu: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  reorderEducation: (ids: string[]) => void;

  // Skills
  addSkill: (skill: Omit<Skill, 'id'>) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  reorderSkills: (ids: string[]) => void;

  // Languages
  addLanguage: (lang: Omit<Language, 'id'>) => void;
  updateLanguage: (id: string, lang: Partial<Language>) => void;
  removeLanguage: (id: string) => void;

  // Certifications
  addCertification: (cert: Omit<Certification, 'id'>) => void;
  updateCertification: (id: string, cert: Partial<Certification>) => void;
  removeCertification: (id: string) => void;

  // References
  addReference: (ref: Omit<Reference, 'id'>) => void;
  updateReference: (id: string, ref: Partial<Reference>) => void;
  removeReference: (id: string) => void;

  // Japan-specific
  setSelfPromotion: (text: string) => void;
  setReasonForApplication: (text: string) => void;
  setDesiredConditions: (text: string) => void;

  // Template & appearance
  setMarket: (market: Market) => void;
  setTemplate: (templateId: string) => void;
  setPageSize: (size: PageSize) => void;
  setColorTheme: (color: string) => void;

  // Wizard navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSteps: (steps: string[]) => void;

  // Persistence
  save: () => void;
  markClean: () => void;

  // Privacy
  togglePrivacyMode: () => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
}

// ─── ID helper ────────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

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

      // ── Init ──────────────────────────────────────────────────────────────

      initializeMarket: (market: Market) => {
        const saved = get().privacyMode ? null : loadCV(market);
        if (saved) {
          set((state) => {
            state.cv = saved;
            state.isDirty = false;
            state.lastSaved = saved.lastModified;
          });
        } else {
          set((state) => {
            state.cv = createEmptyCVData(market);
            state.isDirty = false;
            state.lastSaved = null;
          });
        }
      },

      resetCV: (market: Market) => {
        set((state) => {
          state.cv = createEmptyCVData(market);
          state.isDirty = false;
          state.lastSaved = null;
        });
      },

      restoreCV: (data: CVData) => {
        set((state) => {
          state.cv = data;
          state.isDirty = true;
        });
      },

      // ── Personal info ─────────────────────────────────────────────────────

      setPersonalInfo: (info) => {
        set((state) => {
          state.cv.personalInfo = { ...state.cv.personalInfo, ...info };
          state.isDirty = true;
        });
      },

      // ── Objective ─────────────────────────────────────────────────────────

      setObjective: (text) => {
        set((state) => {
          state.cv.objective = text;
          state.isDirty = true;
        });
      },

      // ── Work Experience ───────────────────────────────────────────────────

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
            state.cv.workExperience[idx] = {
              ...state.cv.workExperience[idx],
              ...exp,
            };
            state.isDirty = true;
          }
        });
      },

      removeWorkExperience: (id) => {
        set((state) => {
          state.cv.workExperience = state.cv.workExperience.filter(
            (e) => e.id !== id
          );
          state.isDirty = true;
        });
      },

      reorderWorkExperience: (ids) => {
        set((state) => {
          const map = new Map(state.cv.workExperience.map((e) => [e.id, e]));
          state.cv.workExperience = ids
            .map((id) => map.get(id))
            .filter(Boolean) as WorkExperience[];
          state.isDirty = true;
        });
      },

      // ── Education ─────────────────────────────────────────────────────────

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
          state.cv.education = ids
            .map((id) => map.get(id))
            .filter(Boolean) as Education[];
          state.isDirty = true;
        });
      },

      // ── Skills ────────────────────────────────────────────────────────────

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
          state.cv.skills = ids
            .map((id) => map.get(id))
            .filter(Boolean) as Skill[];
          state.isDirty = true;
        });
      },

      // ── Languages ─────────────────────────────────────────────────────────

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

      // ── Certifications ────────────────────────────────────────────────────

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
            state.cv.certifications[idx] = {
              ...state.cv.certifications[idx],
              ...cert,
            };
            state.isDirty = true;
          }
        });
      },

      removeCertification: (id) => {
        set((state) => {
          state.cv.certifications = state.cv.certifications.filter(
            (c) => c.id !== id
          );
          state.isDirty = true;
        });
      },

      // ── References ────────────────────────────────────────────────────────

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
          state.cv.references = state.cv.references.filter(
            (r) => r.id !== id
          );
          state.isDirty = true;
        });
      },

      // ── Japan specific ────────────────────────────────────────────────────

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

      // ── Template & appearance ─────────────────────────────────────────────

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

      // ── Wizard ────────────────────────────────────────────────────────────

      setCurrentStep: (step) => {
        set((state) => {
          state.wizard.currentStep = Math.max(
            0,
            Math.min(step, state.wizard.totalSteps - 1)
          );
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

      // ── Persistence ───────────────────────────────────────────────────────

      save: () => {
        const { cv, privacyMode } = get();
        if (privacyMode) return;
        set((state) => {
          state.isSaving = true;
        });
        try {
          saveCV(cv);
          set((state) => {
            state.isDirty = false;
            state.lastSaved = new Date().toISOString();
            state.isSaving = false;
            state.cv.lastModified = new Date().toISOString();
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
          state.cv = JSON.parse(JSON.stringify(history[newIndex]));
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
          state.cv = JSON.parse(JSON.stringify(history[newIndex]));
          state.historyIndex = newIndex;
          state.isDirty = true;
        });
        isUndoRedoing = false;
      },
    }))
  )
);

// ── Autosave subscription ─────────────────────────────────────────────────────

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

// ── History subscription (undo/redo snapshots, debounced 2s, max 20) ─────────

const MAX_HISTORY = 20;
let historyTimer: ReturnType<typeof setTimeout> | null = null;

useCVStore.subscribe(
  (state) => state.isDirty,
  (isDirty) => {
    if (!isDirty) return;
    if (isUndoRedoing) return;
    if (historyTimer) clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      const store = useCVStore.getState();
      const snapshot: CVData = JSON.parse(JSON.stringify(store.cv));
      useCVStore.setState((state) => {
        // Drop any redo future when a new change comes in
        const base = state.history.slice(0, state.historyIndex + 1);
        const next = [...base, snapshot].slice(-MAX_HISTORY);
        state.history = next;
        state.historyIndex = next.length - 1;
      });
    }, 2000);
  }
);
