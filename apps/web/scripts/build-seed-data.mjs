import fs from 'node:fs';
import path from 'node:path';

const [,, danhMucPath, phieuNhapPath] = process.argv;
if (!danhMucPath || !phieuNhapPath) {
  console.error('Usage: node scripts/build-seed-data.mjs <danh_muc.csv> <phieu_nhap.csv>');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
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
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function csvObjects(filePath) {
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const [headers = [], ...body] = rows;
  return body.map(row => Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), row[index] ?? ''])));
}

function toNumber(value) {
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

function toBool(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'co', 'có', 'x'].includes(text);
}

function toIsoDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return text;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function zdhcLevel(value) {
  const text = String(value || 'Not Listed').trim();
  return ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Not Listed'].includes(text) ? text : 'Not Listed';
}

const hoaChat = csvObjects(danhMucPath)
  .filter(row => row.ma_vt && (row.ten_hoa_chat || row.ten_hc))
  .map((row, index) => ({
    id: `HC${String(index + 1).padStart(5, '0')}`,
    maVatTu: row.ma_vt || row.ma_vat_tu || '',
    tenHoaChat: row.ten_hoa_chat || row.ten_hc || '',
    tenHoaChatEN: row.ten_en || '',
    nhaCC: row.nha_cc || row.nha_cung_cap || '',
    casNo: row.cas_no || '',
    nhomHoaChat: row.nhom_hc || row.nhom_hoa_chat || 'Khac',
    donViTinh: row.dvt || row.don_vi_tinh || 'KG',
    zdhcMrslStatus: zdhcLevel(row.zdhc_mrsl || row.zdhc_mrsl_status),
    sdsCo: toBool(row.sds),
    sdsNgayCapNhat: toIsoDate(row.ngay_cap_nhat_sds),
    mrlsCo: toBool(row.mrls),
    certCompliance: row.cert || '',
    ghiChu: row.ghi_chu || '',
    active: true,
  }));

const byCode = new Map(hoaChat.map(item => [String(item.maVatTu).replace(/^0+/, '') || item.maVatTu, item]));

const phieuNhap = csvObjects(phieuNhapPath)
  .filter(row => (row.ma_vt || row.ma_vat_tu) && row.lot_no && row.so_luong)
  .map((row, index) => {
    const code = row.ma_vt || row.ma_vat_tu || '';
    const chemical = byCode.get(String(code).replace(/^0+/, '') || code);
    return {
      id: `PN${String(index + 1).padStart(5, '0')}`,
      ngayNhap: toIsoDate(row.ngay_nhap),
      soPhieuNhap: row.so_phieu || row.so_phieu_nhap || '',
      khoNhap: row.kho || row.kho_nhap || 'Kho phụ liệu',
      maVatTu: chemical?.maVatTu ?? code,
      tenHoaChat: chemical?.tenHoaChat ?? row.ten_hc ?? row.ten_hoa_chat ?? '',
      nhaCC: row.nha_cc || chemical?.nhaCC || '',
      lotNo: row.lot_no || '',
      soLuong: toNumber(row.so_luong),
      donViTinh: row.dvt || row.don_vi_tinh || chemical?.donViTinh || 'KG',
      hsd: toIsoDate(row.hsd),
      donGia: toNumber(row.don_gia),
      nguonNhap: row.nguon || row.nguon_nhap || '',
      nguoiNhap: row.nguoi_nhap || '',
      ghiChu: row.ghi_chu || '',
    };
  });

const settings = {
  tenNhaMay: '',
  diaChi: '',
  zdhcSupplierId: '',
  higgFemFacilityId: '',
  mrslVersion: 'ZDHC MRSL v3.1',
  nguoiLap: '',
  databaseRepo: 'mrbit4578/hoachat',
  databasePath: 'data/hoachat-db.json',
  githubToken: '',
};

const database = {
  version: 1,
  savedAt: new Date().toISOString(),
  sourceRepository: 'mrbit4578/hoachat',
  hoaChat,
  phieuNhap,
  phieuXuat: [],
  settings,
};

fs.mkdirSync(path.resolve('src/app/data'), { recursive: true });
fs.mkdirSync(path.resolve('data'), { recursive: true });
fs.writeFileSync(path.resolve('src/app/data/seedData.json'), `${JSON.stringify(database, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.resolve('data/hoachat-db.json'), `${JSON.stringify(database, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ hoaChat: hoaChat.length, phieuNhap: phieuNhap.length, phieuXuat: 0 }, null, 2));
