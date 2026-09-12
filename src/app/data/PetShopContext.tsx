import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppointmentInput, Pet, PetInput, PetShopData, ServiceInput, Tutor, TutorInput } from './types';
import * as model from './model';
import { applyStoredMutation, DATA_STORAGE_KEY, isPetShopData, loadData } from './repository';
import { createDemoData } from './seed';
import { useAuth } from '../auth/AuthContext';

interface PetShopContextValue extends PetShopData {
  storageWarning: string | null;
  saveTutor: (input: TutorInput, id?: string) => Tutor;
  deleteTutor: (id: string) => void;
  savePet: (input: PetInput, id?: string) => Pet;
  deletePet: (id: string) => void;
  addAppointment: (input: AppointmentInput) => void;
  addService: (input: ServiceInput) => void;
  deleteService: (id: string) => void;
}

const PetShopContext = createContext<PetShopContextValue | null>(null);

export function PetShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [initial] = useState(() => {
    try { return loadData(window.localStorage); }
    catch { return { data: createDemoData(), warning: 'O armazenamento deste navegador está indisponível. Os cadastros não poderão ser salvos.' }; }
  });
  const [data, setData] = useState(initial.data);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const current = useRef(data);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== DATA_STORAGE_KEY) return;
      try {
        const next: unknown = JSON.parse(event.newValue || 'null');
        if (!isPetShopData(next)) throw new Error('Invalid data');
        current.current = next;
        setData(next);
        setStorageWarning(null);
      } catch { setStorageWarning('Os dados locais foram alterados em outra aba. Atualize a página antes de continuar.'); }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function commit(transform: (previous: PetShopData) => PetShopData, managerOnly = false): PetShopData {
    if (!user) throw new Error('Entre com uma conta de funcionário para continuar.');
    if (managerOnly && user.role !== 'gerente') throw new Error('Esta ação está disponível apenas para o gerente.');
    const next = applyStoredMutation(window.localStorage, current.current, transform);
    current.current = next;
    setData(next);
    setStorageWarning(null);
    return next;
  }

  const value: PetShopContextValue = {
    ...data, storageWarning,
    saveTutor(input, id) {
      const next = commit(previous => model.saveTutor(previous, input, id));
      return id ? next.tutors.find(tutor => tutor.id === id)! : next.tutors[next.tutors.length - 1];
    },
    deleteTutor: id => { commit(previous => model.deleteTutor(previous, id)); },
    savePet(input, id) {
      const next = commit(previous => model.savePet(previous, input, id));
      return id ? next.pets.find(pet => pet.id === id)! : next.pets[next.pets.length - 1];
    },
    deletePet: id => { commit(previous => model.deletePet(previous, id)); },
    addAppointment: input => { commit(previous => model.addAppointment(previous, input)); },
    addService: input => { commit(previous => model.addService(previous, input), true); },
    deleteService: id => { commit(previous => model.deleteService(previous, id), true); },
  };

  return <PetShopContext.Provider value={value}>{children}</PetShopContext.Provider>;
}

export function usePetShop() {
  const context = useContext(PetShopContext);
  if (!context) throw new Error('usePetShop precisa estar dentro de PetShopProvider.');
  return context;
}
