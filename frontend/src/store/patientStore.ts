import { create } from 'zustand';

interface PatientState {
  selectedPatientId: string | null;
  selectedPatientByFamily: Record<string, string | null>;
  setSelectedPatientId: (familyId: string, patientId: string | null) => void;
  getSelectedPatientId: (familyId: string, defaultId?: string) => string | null;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  selectedPatientId: null,
  selectedPatientByFamily: {},

  setSelectedPatientId: (familyId: string, patientId: string | null) => {
    if (familyId) {
      if (patientId) {
        localStorage.setItem(`activePatientId_${familyId}`, patientId);
      } else {
        localStorage.removeItem(`activePatientId_${familyId}`);
      }
    }
    set((state) => ({
      selectedPatientId: patientId,
      selectedPatientByFamily: {
        ...state.selectedPatientByFamily,
        [familyId]: patientId,
      },
    }));
  },

  getSelectedPatientId: (familyId: string, defaultId?: string) => {
    if (!familyId) return defaultId || null;
    const inState = get().selectedPatientByFamily[familyId];
    if (inState !== undefined && inState !== null) return inState;
    const stored = localStorage.getItem(`activePatientId_${familyId}`);
    if (stored) return stored;
    return defaultId || null;
  },
}));
