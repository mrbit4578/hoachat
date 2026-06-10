import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'synced' | 'readonly' | 'error';
type ChemContextType = ReturnType<typeof useChemStore> & {
  syncStatus: SyncStatus;
  syncMessage: string;
  lastSyncedAt: string;
  syncNow: () => Promise<void>;
};

const ChemContext = createContext<ChemContextType | null>(null);

export function ChemProvider({ children }: { children: React.ReactNode }) {
  const store = useChemStore();
  const didMount = useRef(false);
  const syncInFlight = useRef(false);
  const suppressNextPush = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState('Đang chuẩn bị đồng bộ');
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const latestSnapshot = useMemo(() => createDatabaseSnapshot({
    hoaChat: store.hoaChat,
    phieuNhap: store.phieuNhap,
    phieuXuat: store.phieuXuat,
    settings: store.settings,
  }), [store.hoaChat, store.phieuNhap, store.phieuXuat, store.settings]);

  const syncNow = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    const hasWriteToken = Boolean(store.settings.githubToken);
    const maxBytes = store.settings.databaseMaxBytes || DEFAULT_DATABASE_MAX_BYTES;
    try {
      setSyncStatus('pulling');
      setSyncMessage('Đang tải database mới nhất từ GitHub');
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

      if (mergedKey !== remoteKey) {
        if (!hasWriteToken) {
          setSyncStatus('readonly');
          setSyncMessage('Đã tải dữ liệu GitHub, nhưng máy này chưa có token để ghi dữ liệu lên GitHub');
          setLastSyncedAt(new Date().toISOString());
          return;
        }
        if (databaseBytes(merged) >= maxBytes) {
          setSyncStatus('error');
          setSyncMessage('Database vượt giới hạn cấu hình, không thể push lên GitHub');
          return;
        }
        setSyncStatus('pushing');
        setSyncMessage('Đang ghi database đã gộp lên GitHub');
        await saveDatabaseToGitHub(merged, store.settings);
      }

      setSyncStatus(hasWriteToken ? 'synced' : 'readonly');
      setSyncMessage(hasWriteToken ? 'Đã đồng bộ hai chiều với GitHub' : 'Đã tải dữ liệu GitHub, chế độ chỉ đọc vì chưa có token');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(error instanceof Error ? error.message : 'Đồng bộ GitHub thất bại');
      console.error('GitHub database sync failed', error);
    } finally {
      syncInFlight.current = false;
    }
  }, [
    store.hoaChat,
    store.phieuNhap,
    store.phieuXuat,
    store.settings,
    store.replaceDatabase,
  ]);

  useEffect(() => {
    if (store.settings.autoSyncEnabled === false) return;
    const startupTimer = window.setTimeout(() => {
      syncNow();
    }, 500);
    return () => window.clearTimeout(startupTimer);
  }, [syncNow, store.settings.autoSyncEnabled]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (suppressNextPush.current) {
      suppressNextPush.current = false;
      return;
    }
    if (store.settings.autoSyncEnabled === false) return;
    if (!store.settings.githubToken) {
      setSyncStatus('readonly');
      setSyncMessage('Máy này chưa có token nên dữ liệu mới chỉ lưu cục bộ, chưa ghi lên GitHub');
      return;
    }

    const maxBytes = store.settings.databaseMaxBytes || DEFAULT_DATABASE_MAX_BYTES;
    if (databaseBytes(latestSnapshot) >= maxBytes) {
      setSyncStatus('error');
      setSyncMessage('Database vượt giới hạn cấu hình, auto push bị tạm dừng');
      return;
    }

    const timer = window.setTimeout(() => {
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      setSyncStatus('pushing');
      setSyncMessage('Đang ghi thay đổi lên GitHub');
      saveDatabaseToGitHub(latestSnapshot, store.settings)
        .then(() => {
          setSyncStatus('synced');
          setSyncMessage('Đã ghi thay đổi lên GitHub');
          setLastSyncedAt(new Date().toISOString());
        })
        .catch(error => {
          setSyncStatus('error');
          setSyncMessage(error instanceof Error ? error.message : 'Auto push GitHub thất bại');
          console.error('Auto GitHub database push failed', error);
        })
        .finally(() => {
          syncInFlight.current = false;
        });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [store.hoaChat, store.phieuNhap, store.phieuXuat, store.settings, latestSnapshot]);

  useEffect(() => {
    if (store.settings.autoSyncEnabled === false) return;
    const intervalSeconds = Math.max(5, store.settings.autoSyncIntervalSeconds || DEFAULT_SYNC_INTERVAL_SECONDS);
    const timer = window.setInterval(syncNow, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [syncNow, store.settings.autoSyncEnabled, store.settings.autoSyncIntervalSeconds]);

  const contextValue = useMemo(() => ({
    ...store,
    syncStatus,
    syncMessage,
    lastSyncedAt,
    syncNow,
  }), [store, syncStatus, syncMessage, lastSyncedAt, syncNow]);

  return <ChemContext.Provider value={contextValue}>{children}</ChemContext.Provider>;
}

export function useChemContext() {
  const ctx = useContext(ChemContext);
  if (!ctx) throw new Error('useChemContext must be used within ChemProvider');
  return ctx;
}
