import type { AppDatabase, AppSettings, HoaChat, PhieuNhap, PhieuXuat } from '../types';

export const DEFAULT_DATABASE_REPO = 'mrbit4578/hoachat';
export const DEFAULT_DATABASE_PATH = 'data/hoachat-db.json';
export const DEFAULT_DATABASE_MAX_BYTES = 95 * 1024 * 1024;
export const DEFAULT_SYNC_INTERVAL_SECONDS = 10;

type CsvValue = string | number | boolean | null | undefined;

export function csvCell(value: CsvValue) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  downloadText(filename, '\ufeff' + csv, 'text/csv;charset=utf-8');
}

export function readFileText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\ufeff/, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  return rows;
}

export function csvObjects(text: string) {
  const rows = parseCsv(text);
  const [headers = [], ...body] = rows;
  return body.map(row =>
    Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), row[index] ?? '']))
  );
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function toNumber(value: unknown) {
  const text = String(value ?? '').trim();
  const normalized = text.includes(',')
    ? text.includes('.')
      ? text.replace(/,/g, '')
      : /^\d+,\d{3}(\,\d{3})*$/.test(text)
        ? text.replace(/,/g, '')
        : text.replace(',', '.')
    : text;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function toIsoDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return text;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function toBool(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'co', 'có', 'x'].includes(text);
}

export function asArray<T>(payload: unknown, key: keyof AppDatabase): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>)[key])) {
    return (payload as Record<string, unknown>)[key] as T[];
  }
  return [];
}

export function createDatabaseSnapshot(input: {
  hoaChat: HoaChat[];
  phieuNhap: PhieuNhap[];
  phieuXuat: PhieuXuat[];
  settings: AppSettings;
}): AppDatabase {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    sourceRepository: input.settings.databaseRepo || DEFAULT_DATABASE_REPO,
    hoaChat: input.hoaChat,
    phieuNhap: input.phieuNhap,
    phieuXuat: input.phieuXuat,
    settings: {
      ...input.settings,
      githubToken: '',
      databaseRepo: input.settings.databaseRepo || DEFAULT_DATABASE_REPO,
      databasePath: input.settings.databasePath || DEFAULT_DATABASE_PATH,
    },
  };
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]) {
  const map = new Map<string, T>();
  remote.forEach(item => map.set(item.id, item));
  local.forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

export function mergeDatabaseSnapshots(local: AppDatabase, remote: AppDatabase): AppDatabase {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    sourceRepository: local.sourceRepository || remote.sourceRepository || DEFAULT_DATABASE_REPO,
    hoaChat: mergeById(local.hoaChat, remote.hoaChat),
    phieuNhap: mergeById(local.phieuNhap, remote.phieuNhap),
    phieuXuat: mergeById(local.phieuXuat, remote.phieuXuat),
    settings: {
      ...remote.settings,
      ...local.settings,
      githubToken: local.settings.githubToken || '',
      databaseRepo: local.settings.databaseRepo || remote.settings.databaseRepo || DEFAULT_DATABASE_REPO,
      databasePath: local.settings.databasePath || remote.settings.databasePath || DEFAULT_DATABASE_PATH,
      autoSyncEnabled: local.settings.autoSyncEnabled ?? remote.settings.autoSyncEnabled ?? true,
      autoSyncIntervalSeconds: local.settings.autoSyncIntervalSeconds || remote.settings.autoSyncIntervalSeconds || DEFAULT_SYNC_INTERVAL_SECONDS,
      databaseMaxBytes: local.settings.databaseMaxBytes || remote.settings.databaseMaxBytes || DEFAULT_DATABASE_MAX_BYTES,
    },
  };
}

export function databaseContentFingerprint(snapshot: AppDatabase) {
  return JSON.stringify({
    hoaChat: snapshot.hoaChat,
    phieuNhap: snapshot.phieuNhap,
    phieuXuat: snapshot.phieuXuat,
    settings: {
      ...snapshot.settings,
      githubToken: '',
    },
  });
}

export function downloadDatabase(snapshot: AppDatabase) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`hoachat-db-${stamp}.json`, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
}

export function databaseBytes(snapshot: AppDatabase) {
  return new Blob([JSON.stringify(snapshot)]).size;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function githubApiUrl(repo: string, path: string) {
  return `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
}

export async function loadDatabaseFromGitHub(settings: AppSettings): Promise<AppDatabase> {
  const repo = settings.databaseRepo || DEFAULT_DATABASE_REPO;
  const path = settings.databasePath || DEFAULT_DATABASE_PATH;
  const res = await fetch(githubApiUrl(repo, path), {
    headers: settings.githubToken ? { Authorization: `Bearer ${settings.githubToken}` } : undefined,
  });

  if (!res.ok) throw new Error(`GitHub load failed: ${res.status}`);
  const data = await res.json();
  let raw = '';
  if (data.content) {
    raw = decodeURIComponent(
      escape(window.atob(String(data.content ?? '').replace(/\n/g, '')))
    );
  } else if (data.download_url) {
    const rawRes = await fetch(String(data.download_url), {
      headers: settings.githubToken ? { Authorization: `Bearer ${settings.githubToken}` } : undefined,
    });
    if (!rawRes.ok) throw new Error(`GitHub raw database load failed: ${rawRes.status}`);
    raw = await rawRes.text();
  }
  if (!raw) throw new Error('GitHub database content is empty');
  return JSON.parse(raw) as AppDatabase;
}

export async function saveDatabaseToGitHub(snapshot: AppDatabase, settings: AppSettings) {
  const repo = settings.databaseRepo || DEFAULT_DATABASE_REPO;
  const path = settings.databasePath || DEFAULT_DATABASE_PATH;
  const token = settings.githubToken;
  if (!token) throw new Error('Missing GitHub token');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };
  const url = githubApiUrl(repo, path);
  let sha: string | undefined;

  const current = await fetch(url, { headers });
  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
  } else if (current.status !== 404) {
    throw new Error(`GitHub current file check failed: ${current.status}`);
  }

  const content = window.btoa(
    unescape(encodeURIComponent(JSON.stringify(snapshot, null, 2)))
  );
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Update chemical database ${new Date().toISOString()}`,
      content,
      sha,
    }),
  });

  if (!res.ok) throw new Error(`GitHub save failed: ${res.status}`);
}

export function mapHoaChatCsv(row: Record<string, string>): Omit<HoaChat, 'id'> {
  return {
    maVatTu: row.ma_vt || row.ma_vat_tu || '',
    tenHoaChat: row.ten_hc || row.ten_hoa_chat || '',
    tenHoaChatEN: row.ten_en || row.ten_hoa_chat_en || '',
    nhaCC: row.nha_cc || row.nha_cung_cap || '',
    casNo: row.cas_no || '',
    nhomHoaChat: row.nhom_hc || row.nhom_hoa_chat || 'Khac',
    donViTinh: row.dvt || row.don_vi_tinh || 'KG',
    zdhcMrslStatus: (row.zdhc_mrsl || row.zdhc_mrsl_status || 'Not Listed') as HoaChat['zdhcMrslStatus'],
    sdsCo: toBool(row.sds),
    sdsNgayCapNhat: toIsoDate(row.ngay_cap_nhat_sds),
    mrlsCo: toBool(row.mrls),
    certCompliance: row.cert || '',
    ghiChu: row.ghi_chu || '',
    active: row.trang_thai ? !['ngung', 'inactive', 'false'].includes(row.trang_thai.toLowerCase()) : true,
  };
}

export function mapPhieuNhapCsv(row: Record<string, string>): Omit<PhieuNhap, 'id'> {
  return {
    ngayNhap: toIsoDate(row.ngay_nhap),
    soPhieuNhap: row.so_phieu || row.so_phieu_nhap || '',
    khoNhap: row.kho || row.kho_nhap || '',
    maVatTu: row.ma_vt || row.ma_vat_tu || '',
    tenHoaChat: row.ten_hc || row.ten_hoa_chat || '',
    nhaCC: row.nha_cc || '',
    lotNo: row.lot_no || '',
    soLuong: toNumber(row.so_luong),
    donViTinh: row.dvt || row.don_vi_tinh || 'KG',
    hsd: toIsoDate(row.hsd),
    donGia: toNumber(row.don_gia),
    nguonNhap: row.nguon || row.nguon_nhap || '',
    nguoiNhap: row.nguoi_nhap || '',
    ghiChu: row.ghi_chu || '',
  };
}

export function mapPhieuXuatCsv(row: Record<string, string>): Omit<PhieuXuat, 'id'> {
  return {
    ngayXuat: toIsoDate(row.ngay_xuat),
    soPhieuXuat: row.so_phieu || row.so_phieu_xuat || '',
    boPhanXuat: row.bo_phan || row.bo_phan_xuat || '',
    lyDo: row.ly_do || '',
    khoXuat: row.kho || row.kho_xuat || '',
    maVatTu: row.ma_vt || row.ma_vat_tu || '',
    tenHoaChat: row.ten_hc || row.ten_hoa_chat || '',
    lotNo: row.lot_no || '',
    soLuong: toNumber(row.so_luong),
    donViTinh: row.dvt || row.don_vi_tinh || 'KG',
    donHangMaHang: row.don_hang || row.don_hang_ma_hang || '',
    maMau: row.mau || row.ma_mau || '',
    lenhSX: row.lenh_sx || '',
    nguoiXuat: row.nguoi_xuat || '',
    hsd: toIsoDate(row.hsd),
    ghiChu: row.ghi_chu || '',
  };
}
