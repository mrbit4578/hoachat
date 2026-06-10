import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useChemStore } from './chemStore';
import {
  createDatabaseSnapshot,
  databaseBytes,
  databaseContentFingerprint,
  DEFAULT_DATABASE_MAX_BYTES,
  DEFAULT_SYNC_INTERVAL_SECONDS,
  loadDatabaseFromGitHub,
  mergeDatabaseSnapshots,
  saveDatabaseToGitHub,
} from '../utils/dataPortability';

type ChemContextType = ReturnType<typeof useChemStore>;

const ChemContext = createContext<ChemContextType | null>(null);

export function ChemProvider({ children }: { children: React.ReactNode }) {
  const store = useChemStore();
  const didMount = useRef(false);
  const syncInFlight = useRef(false);
  const suppressNextPush = useRef(false);
  const latestSnapshot = useMemo(() => createDatabaseSnapshot({
    hoaChat: store.hoaChat,
    phieuNhap: store.phieuNhap,
    phieuXuat: store.phieuXuat,
    settings: store.settings,
  }), [store.hoaChat, store.phieuNhap, store.phieuXuat, store.settings]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (suppressNextPush.current) {
      suppressNextPush.current = false;
      return;
    }
    if (!store.settings.githubToken || store.settings.autoSyncEnabled === false) return;

    const maxBytes = store.settings.databaseMaxBytes || DEFAULT_DATABASE_MAX_BYTES;
    if (databaseBytes(latestSnapshot) >= maxBytes) {
      console.warn('Database is above configured sync limit; auto push skipped.');
      return;
    }

    const timer = window.setTimeout(() => {
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      saveDatabaseToGitHub(latestSnapshot, store.settings)
        .catch(error => {
          console.error('Auto GitHub database push failed', error);
        })
        .finally(() => {
          syncInFlight.current = false;
        });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [store.hoaChat, store.phieuNhap, store.phieuXuat, store.settings, latestSnapshot]);

  useEffect(() => {
    if (!store.settings.githubToken || store.settings.autoSyncEnabled === false) return;

    const intervalSeconds = Math.max(5, store.settings.autoSyncIntervalSeconds || DEFAULT_SYNC_INTERVAL_SECONDS);
    const maxBytes = store.settings.databaseMaxBytes || DEFAULT_DATABASE_MAX_BYTES;

    async function syncFromGitHub() {
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      try {
        const remote = await loadDatabaseFromGitHub(store.settings);
        const local = createDatabaseSnapshot({
          hoaChat: store.hoaChat,
          phieuNhap: store.phieuNhap,
          phieuXuat: store.phieuXuat,
          settings: store.settings,
        });
        const merged = mergeDatabaseSnapshots(local, remote);
        const localKey = databaseContentFingerprint(local);
        const remoteKey = databaseContentFingerprint(remote);
        const mergedKey = databaseContentFingerprint(merged);

        if (mergedKey !== localKey) {
          suppressNextPush.current = true;
          store.replaceDatabase(merged);
        }

        if (mergedKey !== remoteKey && databaseBytes(merged) < maxBytes) {
          await saveDatabaseToGitHub(merged, store.settings);
        }
      } catch (error) {
        console.error('Auto GitHub database pull failed', error);
      } finally {
        syncInFlight.current = false;
      }
    }

    const timer = window.setInterval(syncFromGitHub, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [
    store.hoaChat,
    store.phieuNhap,
    store.phieuXuat,
    store.settings,
    store.replaceDatabase,
  ]);

  return <ChemContext.Provider value={store}>{children}</ChemContext.Provider>;
}

export function useChemContext() {
  const ctx = useContext(ChemContext);
  if (!ctx) throw new Error('useChemContext must be used within ChemProvider');
  return ctx;
}
