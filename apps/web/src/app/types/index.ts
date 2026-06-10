export type ZDHCLevel = 'Level 0' | 'Level 1' | 'Level 2' | 'Level 3' | 'Not Listed';
export type HSDStatus = 'VALID' | 'WARNING' | 'CRITICAL' | 'EXPIRED';

export type PageType =
  | 'dashboard'
  | 'danh-muc'
  | 'nhap-kho'
  | 'xuat-kho'
  | 'ton-kho'
  | 'bao-cao-lot'
  | 'bao-cao-vat-tu'
  | 'compliance'
  | 'settings';

export interface HoaChat {
  id: string;
  maVatTu: string;
  tenHoaChat: string;
  tenHoaChatEN: string;
  nhaCC: string;
  casNo: string;
  nhomHoaChat: string;
  donViTinh: string;
  zdhcMrslStatus: ZDHCLevel;
  sdsCo: boolean;
  sdsNgayCapNhat: string;
  mrlsCo: boolean;
  certCompliance: string;
  ghiChu: string;
  active: boolean;
}

export interface PhieuNhap {
  id: string;
  ngayNhap: string;
  soPhieuNhap: string;
  khoNhap: string;
  maVatTu: string;
  tenHoaChat: string;
  nhaCC: string;
  lotNo: string;
  soLuong: number;
  donViTinh: string;
  hsd: string;
  donGia: number;
  nguonNhap: string;
  nguoiNhap: string;
  ghiChu: string;
}

export interface PhieuXuat {
  id: string;
  ngayXuat: string;
  soPhieuXuat: string;
  boPhanXuat: string;
  lyDo: string;
  khoXuat: string;
  maVatTu: string;
  tenHoaChat: string;
  lotNo: string;
  soLuong: number;
  donViTinh: string;
  donHangMaHang: string;
  maMau: string;
  lenhSX: string;
  nguoiXuat: string;
  hsd: string;
  ghiChu: string;
}

export interface TonKhoLot {
  maVatTu: string;
  tenHoaChat: string;
  donViTinh: string;
  lotNo: string;
  hsd: string;
  khoNhap: string;
  tonLo: number;
  tongNhap: number;
  tongXuat: number;
  trangThaiHSD: HSDStatus;
  soNgayConLai: number;
  canhBao: string;
}

export interface AppSettings {
  tenNhaMay: string;
  diaChi: string;
  zdhcSupplierId: string;
  higgFemFacilityId: string;
  mrslVersion: string;
  nguoiLap: string;
  databaseRepo?: string;
  databasePath?: string;
  githubToken?: string;
  autoSyncEnabled?: boolean;
  autoSyncIntervalSeconds?: number;
  databaseMaxBytes?: number;
}

export interface AppDatabase {
  version: 1;
  savedAt: string;
  sourceRepository: string;
  hoaChat: HoaChat[];
  phieuNhap: PhieuNhap[];
  phieuXuat: PhieuXuat[];
  settings: AppSettings;
}
