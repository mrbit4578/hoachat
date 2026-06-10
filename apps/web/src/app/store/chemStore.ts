import { useState, useCallback } from 'react';
import type { HoaChat, PhieuNhap, PhieuXuat, TonKhoLot, AppSettings, AppDatabase } from '../types';
import { sampleHoaChat, samplePhieuNhap, samplePhieuXuat, defaultSettings } from '../data/sampleData';
import seedData from '../data/seedData.json';
import { createDatabaseSnapshot, DEFAULT_DATABASE_PATH, DEFAULT_DATABASE_REPO } from '../utils/dataPortability';

const KEYS = {
  hoaChat: 'zdhc_hoa_chat',
  phieuNhap: 'zdhc_phieu_nhap',
  phieuXuat: 'zdhc_phieu_xuat',
  settings: 'zdhc_settings',
  seedVersion: 'zdhc_seed_version',
};

function load<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s) as T;
  } catch {}
  return fallback;
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function withDefaultSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    databaseRepo: settings.databaseRepo || DEFAULT_DATABASE_REPO,
    databasePath: settings.databasePath || DEFAULT_DATABASE_PATH,
    githubToken: settings.githubToken || '',
  };
}

function ensureId<T extends { id?: string }>(item: T): T & { id: string } {
  return { ...item, id: item.id || genId() };
}

const seedDatabase = seedData as AppDatabase;
const seedHoaChat = seedDatabase.hoaChat?.length ? seedDatabase.hoaChat : sampleHoaChat;
const seedPhieuNhap = seedDatabase.phieuNhap ?? samplePhieuNhap;
const seedPhieuXuat = seedDatabase.phieuXuat ?? samplePhieuXuat;
const seedSettings = withDefaultSettings({ ...defaultSettings, ...(seedDatabase.settings ?? {}) });
let seedApplied = false;

function ensureSeedApplied() {
  if (seedApplied) return;
  seedApplied = true;
  try {
    const version = seedDatabase.savedAt || 'seed-v1';
    if (localStorage.getItem(KEYS.seedVersion) === version) return;
    save(KEYS.hoaChat, seedHoaChat);
    save(KEYS.phieuNhap, seedPhieuNhap);
    save(KEYS.phieuXuat, seedPhieuXuat);
    save(KEYS.settings, seedSettings);
    localStorage.setItem(KEYS.seedVersion, version);
  } catch {}
}

export function calcHSDStatus(hsd: string): { status: 'VALID' | 'WARNING' | 'CRITICAL' | 'EXPIRED'; daysLeft: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(hsd);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
  if (daysLeft < 0) return { status: 'EXPIRED', daysLeft };
  if (daysLeft <= 15) return { status: 'WARNING', daysLeft };
  if (daysLeft <= 30) return { status: 'CRITICAL', daysLeft };
  return { status: 'VALID', daysLeft };
}

export function useChemStore() {
  ensureSeedApplied();
  const [hoaChat, setHoaChat] = useState<HoaChat[]>(() => load(KEYS.hoaChat, seedHoaChat));
  const [phieuNhap, setPhieuNhap] = useState<PhieuNhap[]>(() => load(KEYS.phieuNhap, seedPhieuNhap));
  const [phieuXuat, setPhieuXuat] = useState<PhieuXuat[]>(() => load(KEYS.phieuXuat, seedPhieuXuat));
  const [settings, setSettings] = useState<AppSettings>(() => withDefaultSettings(load(KEYS.settings, seedSettings)));

  // HoaChat CRUD
  const addHoaChat = useCallback((item: Omit<HoaChat, 'id'>) => {
    setHoaChat(prev => {
      const next = [...prev, { ...item, id: genId() }];
      save(KEYS.hoaChat, next);
      return next;
    });
  }, []);

  const updateHoaChat = useCallback((id: string, item: Partial<HoaChat>) => {
    setHoaChat(prev => {
      const next = prev.map(h => (h.id === id ? { ...h, ...item } : h));
      save(KEYS.hoaChat, next);
      return next;
    });
  }, []);

  const deleteHoaChat = useCallback((id: string) => {
    setHoaChat(prev => {
      const next = prev.filter(h => h.id !== id);
      save(KEYS.hoaChat, next);
      return next;
    });
  }, []);

  const importHoaChat = useCallback((items: Array<Partial<HoaChat>>, mode: 'append' | 'replace' = 'append') => {
    setHoaChat(prev => {
      const clean = items
        .filter((item): item is HoaChat => Boolean(item.maVatTu && item.tenHoaChat))
        .map(item => ensureId({
          maVatTu: item.maVatTu ?? '',
          tenHoaChat: item.tenHoaChat ?? '',
          tenHoaChatEN: item.tenHoaChatEN ?? '',
          nhaCC: item.nhaCC ?? '',
          casNo: item.casNo ?? '',
          nhomHoaChat: item.nhomHoaChat ?? 'Khac',
          donViTinh: item.donViTinh ?? 'KG',
          zdhcMrslStatus: item.zdhcMrslStatus ?? 'Not Listed',
          sdsCo: Boolean(item.sdsCo),
          sdsNgayCapNhat: item.sdsNgayCapNhat ?? '',
          mrlsCo: Boolean(item.mrlsCo),
          certCompliance: item.certCompliance ?? '',
          ghiChu: item.ghiChu ?? '',
          active: item.active ?? true,
          id: item.id,
        }));
      const next = mode === 'replace' ? clean : [...prev, ...clean];
      save(KEYS.hoaChat, next);
      return next;
    });
  }, []);

  // PhieuNhap CRUD
  const addPhieuNhap = useCallback((item: Omit<PhieuNhap, 'id'>) => {
    setPhieuNhap(prev => {
      const next = [...prev, { ...item, id: genId() }];
      save(KEYS.phieuNhap, next);
      return next;
    });
  }, []);

  const deletePhieuNhap = useCallback((id: string) => {
    setPhieuNhap(prev => {
      const next = prev.filter(p => p.id !== id);
      save(KEYS.phieuNhap, next);
      return next;
    });
  }, []);

  const importPhieuNhap = useCallback((items: Array<Partial<PhieuNhap>>, mode: 'append' | 'replace' = 'append') => {
    setPhieuNhap(prev => {
      const clean = items
        .filter((item): item is PhieuNhap => Boolean(item.maVatTu && item.lotNo && item.soLuong))
        .map(item => ensureId({
          ngayNhap: item.ngayNhap ?? new Date().toISOString().split('T')[0],
          soPhieuNhap: item.soPhieuNhap ?? '',
          khoNhap: item.khoNhap ?? '',
          maVatTu: item.maVatTu ?? '',
          tenHoaChat: item.tenHoaChat ?? '',
          nhaCC: item.nhaCC ?? '',
          lotNo: item.lotNo ?? '',
          soLuong: Number(item.soLuong) || 0,
          donViTinh: item.donViTinh ?? 'KG',
          hsd: item.hsd ?? '',
          donGia: Number(item.donGia) || 0,
          nguonNhap: item.nguonNhap ?? '',
          nguoiNhap: item.nguoiNhap ?? '',
          ghiChu: item.ghiChu ?? '',
          id: item.id,
        }));
      const next = mode === 'replace' ? clean : [...prev, ...clean];
      save(KEYS.phieuNhap, next);
      return next;
    });
  }, []);

  // PhieuXuat CRUD
  const addPhieuXuat = useCallback((item: Omit<PhieuXuat, 'id'>) => {
    setPhieuXuat(prev => {
      const next = [...prev, { ...item, id: genId() }];
      save(KEYS.phieuXuat, next);
      return next;
    });
  }, []);

  const deletePhieuXuat = useCallback((id: string) => {
    setPhieuXuat(prev => {
      const next = prev.filter(p => p.id !== id);
      save(KEYS.phieuXuat, next);
      return next;
    });
  }, []);

  const importPhieuXuat = useCallback((items: Array<Partial<PhieuXuat>>, mode: 'append' | 'replace' = 'append') => {
    setPhieuXuat(prev => {
      const clean = items
        .filter((item): item is PhieuXuat => Boolean(item.maVatTu && item.lotNo && item.soLuong))
        .map(item => ensureId({
          ngayXuat: item.ngayXuat ?? new Date().toISOString().split('T')[0],
          soPhieuXuat: item.soPhieuXuat ?? '',
          boPhanXuat: item.boPhanXuat ?? '',
          lyDo: item.lyDo ?? '',
          khoXuat: item.khoXuat ?? '',
          maVatTu: item.maVatTu ?? '',
          tenHoaChat: item.tenHoaChat ?? '',
          lotNo: item.lotNo ?? '',
          soLuong: Number(item.soLuong) || 0,
          donViTinh: item.donViTinh ?? 'KG',
          donHangMaHang: item.donHangMaHang ?? '',
          maMau: item.maMau ?? '',
          lenhSX: item.lenhSX ?? '',
          nguoiXuat: item.nguoiXuat ?? '',
          hsd: item.hsd ?? '',
          ghiChu: item.ghiChu ?? '',
          id: item.id,
        }));
      const next = mode === 'replace' ? clean : [...prev, ...clean];
      save(KEYS.phieuXuat, next);
      return next;
    });
  }, []);

  // Settings
  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = withDefaultSettings({ ...prev, ...s });
      save(KEYS.settings, next);
      return next;
    });
  }, []);

  const replaceDatabase = useCallback((database: Partial<AppDatabase>) => {
    const nextHoaChat = Array.isArray(database.hoaChat) ? database.hoaChat.map(ensureId) : [];
    const nextPhieuNhap = Array.isArray(database.phieuNhap) ? database.phieuNhap.map(ensureId) : [];
    const nextPhieuXuat = Array.isArray(database.phieuXuat) ? database.phieuXuat.map(ensureId) : [];
    const nextSettings = withDefaultSettings({ ...settings, ...(database.settings ?? {}), githubToken: settings.githubToken || database.settings?.githubToken || '' });

    setHoaChat(nextHoaChat);
    setPhieuNhap(nextPhieuNhap);
    setPhieuXuat(nextPhieuXuat);
    setSettings(nextSettings);
    save(KEYS.hoaChat, nextHoaChat);
    save(KEYS.phieuNhap, nextPhieuNhap);
    save(KEYS.phieuXuat, nextPhieuXuat);
    save(KEYS.settings, nextSettings);
  }, [settings]);

  const getDatabaseSnapshot = useCallback(() =>
    createDatabaseSnapshot({ hoaChat, phieuNhap, phieuXuat, settings }),
    [hoaChat, phieuNhap, phieuXuat, settings]
  );

  // Computed: TonKho by Lot
  const getTonKhoByLot = useCallback((): TonKhoLot[] => {
    const map = new Map<string, TonKhoLot>();

    phieuNhap.forEach(p => {
      const key = `${p.maVatTu}|${p.lotNo}`;
      const info = hoaChat.find(h => h.maVatTu === p.maVatTu);
      if (!map.has(key)) {
        const { status, daysLeft } = calcHSDStatus(p.hsd);
        let canhBao = '';
        if (status === 'EXPIRED') canhBao = 'Lô hết hạn còn tồn;';
        else if (status === 'WARNING') canhBao = 'Cảnh báo HSD <= 15 ngày;';
        else if (status === 'CRITICAL') canhBao = 'Cảnh báo HSD <= 30 ngày;';
        map.set(key, {
          maVatTu: p.maVatTu,
          tenHoaChat: info?.tenHoaChat ?? p.tenHoaChat,
          donViTinh: p.donViTinh,
          lotNo: p.lotNo,
          hsd: p.hsd,
          khoNhap: p.khoNhap,
          tonLo: 0,
          tongNhap: 0,
          tongXuat: 0,
          trangThaiHSD: status,
          soNgayConLai: daysLeft,
          canhBao,
        });
      }
      const lot = map.get(key)!;
      lot.tongNhap += p.soLuong;
      lot.tonLo += p.soLuong;
    });

    phieuXuat.forEach(p => {
      const key = `${p.maVatTu}|${p.lotNo}`;
      if (map.has(key)) {
        const lot = map.get(key)!;
        lot.tongXuat += p.soLuong;
        lot.tonLo -= p.soLuong;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.maVatTu !== b.maVatTu) return a.maVatTu.localeCompare(b.maVatTu);
      return new Date(a.hsd).getTime() - new Date(b.hsd).getTime();
    });
  }, [hoaChat, phieuNhap, phieuXuat]);

  // FEFO suggestions: all lots with positive stock for a chemical, sorted by earliest HSD
  const getFefoSuggestions = useCallback(
    (maVatTu: string) =>
      getTonKhoByLot()
        .filter(t => t.maVatTu === maVatTu && t.tonLo > 0)
        .sort((a, b) => new Date(a.hsd).getTime() - new Date(b.hsd).getTime()),
    [getTonKhoByLot]
  );

  // Summary stats
  const getSummary = useCallback(() => {
    const tons = getTonKhoByLot().filter(t => t.tonLo > 0);
    return {
      totalChemicals: hoaChat.filter(h => h.active).length,
      expired: tons.filter(t => t.trangThaiHSD === 'EXPIRED').length,
      critical: tons.filter(t => t.trangThaiHSD === 'CRITICAL').length,
      warning: tons.filter(t => t.trangThaiHSD === 'WARNING').length,
      valid: tons.filter(t => t.trangThaiHSD === 'VALID').length,
      totalLots: tons.length,
      totalNhapThang: phieuNhap.filter(p => {
        const d = new Date(p.ngayNhap);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      totalXuatThang: phieuXuat.filter(p => {
        const d = new Date(p.ngayXuat);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [hoaChat, getTonKhoByLot, phieuNhap, phieuXuat]);

  return {
    hoaChat,
    addHoaChat,
    updateHoaChat,
    deleteHoaChat,
    importHoaChat,
    phieuNhap,
    addPhieuNhap,
    deletePhieuNhap,
    importPhieuNhap,
    phieuXuat,
    addPhieuXuat,
    deletePhieuXuat,
    importPhieuXuat,
    settings,
    updateSettings,
    replaceDatabase,
    getDatabaseSnapshot,
    getTonKhoByLot,
    getFefoSuggestions,
    getSummary,
  };
}
