import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useChemStore } from './chemStore';
import { createDatabaseSnapshot, databaseBytes, saveDatabaseToGitHub } from '../utils/dataPortability';

type ChemContextType = ReturnType<typeof useChemStore>;

const ChemContext = createContext<ChemContextType | null>(null);

export function ChemProvider({ children }: { children: React.ReactNode }) {
  const store = useChemStore();
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (!store.settings.githubToken) return;

    const snapshot = createDatabaseSnapshot({
      hoaChat: store.hoaChat,
      phieuNhap: store.phieuNhap,
      phieuXuat: store.phieuXuat,
      settings: store.settings,
    });
    if (databaseBytes(snapshot) >= 4 * 1024 * 1024) return;

    const timer = window.setTimeout(() => {
      saveDatabaseToGitHub(snapshot, store.settings).catch(error => {
        console.error('Auto GitHub database sync failed', error);
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [store.hoaChat, store.phieuNhap, store.phieuXuat, store.settings]);

  return <ChemContext.Provider value={store}>{children}</ChemContext.Provider>;
}

export function useChemContext() {
  const ctx = useContext(ChemContext);
  if (!ctx) throw new Error('useChemContext must be used within ChemProvider');
  return ctx;
}
