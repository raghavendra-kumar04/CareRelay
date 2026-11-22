import { create } from 'zustand';

interface FamilyState {
  activeFamilyId: string | null;
  setActiveFamilyId: (fid: string) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  activeFamilyId: typeof window !== 'undefined' ? localStorage.getItem('activeFamilyId') : null,
  setActiveFamilyId: (fid: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeFamilyId', fid);
    }
    set({ activeFamilyId: fid });
  },
}));
