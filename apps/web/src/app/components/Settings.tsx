import React, { useState } from 'react';
import { Save, RotateCcw, Download, Upload, CloudDownload, CloudUpload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';
import { toast } from 'sonner';
import {
  DEFAULT_DATABASE_MAX_BYTES,
  DEFAULT_DATABASE_PATH,
  DEFAULT_DATABASE_REPO,
  DEFAULT_SYNC_INTERVAL_SECONDS,
  databaseBytes,
  downloadDatabase,
  formatBytes,
  loadDatabaseFromGitHub,
  readFileText,
  saveDatabaseToGitHub,
} from '../utils/dataPortability';

const MRSL_VERSIONS = ['ZDHC MRSL v3.1', 'ZDHC MRSL v2.0', 'ZDHC MRSL v1.1'];
const MB = 1024 * 1024;

function clampDatabaseMaxBytes(value: unknown) {
  const n = Number(value) || DEFAULT_DATABASE_MAX_BYTES / MB;
  return Math.min(95, Math.max(1, n)) * MB;
}

function clampSyncInterval(value: unknown) {
  return Math.max(5, Number(value) || DEFAULT_SYNC_INTERVAL_SECONDS);
}

export function Settings() {
  const { settings, updateSettings, replaceDatabase, getDatabaseSnapshot } = useChemContext();
  const [form, setForm] = useState({ ...settings });
  const [syncing, setSyncing] = useState(false);
  const snapshot = getDatabaseSnapshot();
  const dbBytes = databaseBytes(snapshot);
  const dbLimit = clampDatabaseMaxBytes(form.databaseMaxBytes || settings.databaseMaxBytes);
  const dbPercent = Math.min(100, Math.round((dbBytes / dbLimit) * 100));
  const dbLimitMb = Math.round(dbLimit / MB);

  function normalizedForm() {
    return {
      ...form,
      databaseRepo: form.databaseRepo || DEFAULT_DATABASE_REPO,
      databasePath: form.databasePath || DEFAULT_DATABASE_PATH,
      autoSyncEnabled: form.autoSyncEnabled ?? true,
      autoSyncIntervalSeconds: clampSyncInterval(form.autoSyncIntervalSeconds),
      databaseMaxBytes: dbLimit,
    };
  }

  function save() {
    updateSettings(normalizedForm());
    toast.success('Đã lưu cài đặt');
  }

  function reset() {
    setForm({ ...settings });
  }

  async function importDatabase(file: File | null) {
    if (!file) return;
    try {
      const text = await readFileText(file);
      replaceDatabase(JSON.parse(text));
      toast.success('Đã import database');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import database failed');
    }
  }

  async function pushGitHub() {
    try {
      setSyncing(true);
      const nextSettings = normalizedForm();
      const nextSnapshot = getDatabaseSnapshot();
      if (databaseBytes(nextSnapshot) >= nextSettings.databaseMaxBytes) {
        toast.error('Database đã vượt giới hạn đã cấu hình, hãy giảm dữ liệu hoặc tăng giới hạn trước khi push');
        return;
      }
      updateSettings(nextSettings);
      await saveDatabaseToGitHub(nextSnapshot, nextSettings);
      toast.success('Đã lưu database lên GitHub');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'GitHub save failed');
    } finally {
      setSyncing(false);
    }
  }

  async function pullGitHub() {
    try {
      setSyncing(true);
      const database = await loadDatabaseFromGitHub(normalizedForm());
      replaceDatabase(database);
      toast.success('Đã tải database từ GitHub');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'GitHub load failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="text-gray-700">Thông tin nhà máy</h3>
        <div className="space-y-4">
          <Field label="Tên nhà máy">
            <Input value={form.tenNhaMay} onChange={e => setForm(f => ({ ...f, tenNhaMay: e.target.value }))} />
          </Field>
          <Field label="Địa chỉ">
            <Input value={form.diaChi} onChange={e => setForm(f => ({ ...f, diaChi: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ZDHC Supplier ID">
              <Input value={form.zdhcSupplierId} onChange={e => setForm(f => ({ ...f, zdhcSupplierId: e.target.value }))} />
            </Field>
            <Field label="Higg FEM Facility ID">
              <Input value={form.higgFemFacilityId} onChange={e => setForm(f => ({ ...f, higgFemFacilityId: e.target.value }))} />
            </Field>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="text-gray-700">Cài đặt ZDHC</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phiên bản MRSL">
            <select
              className="w-full h-9 border rounded-md px-2 text-sm"
              value={form.mrslVersion}
              onChange={e => setForm(f => ({ ...f, mrslVersion: e.target.value }))}
            >
              {MRSL_VERSIONS.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Người lập mặc định">
            <Input value={form.nguoiLap} onChange={e => setForm(f => ({ ...f, nguoiLap: e.target.value }))} />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="text-gray-700">Database & GitHub</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="GitHub repository">
            <Input
              value={form.databaseRepo || DEFAULT_DATABASE_REPO}
              onChange={e => setForm(f => ({ ...f, databaseRepo: e.target.value }))}
              placeholder={DEFAULT_DATABASE_REPO}
            />
          </Field>
          <Field label="Database path">
            <Input
              value={form.databasePath || DEFAULT_DATABASE_PATH}
              onChange={e => setForm(f => ({ ...f, databasePath: e.target.value }))}
              placeholder={DEFAULT_DATABASE_PATH}
            />
          </Field>
        </div>
        <Field label="GitHub token">
          <Input
            type="password"
            value={form.githubToken || ''}
            onChange={e => setForm(f => ({ ...f, githubToken: e.target.value }))}
            placeholder="Fine-grained token có quyền Contents: Read/Write"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Chu kỳ đồng bộ (giây)">
            <Input
              type="number"
              min="5"
              value={form.autoSyncIntervalSeconds || DEFAULT_SYNC_INTERVAL_SECONDS}
              onChange={e => setForm(f => ({ ...f, autoSyncIntervalSeconds: Number(e.target.value) || DEFAULT_SYNC_INTERVAL_SECONDS }))}
            />
          </Field>
          <Field label="Giới hạn database (MB)">
            <Input
              type="number"
              min="1"
              max="95"
              value={dbLimitMb}
              onChange={e => setForm(f => ({ ...f, databaseMaxBytes: clampDatabaseMaxBytes(e.target.value) }))}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.autoSyncEnabled ?? true}
            onChange={e => setForm(f => ({ ...f, autoSyncEnabled: e.target.checked }))}
            className="w-4 h-4"
          />
          Bật đồng bộ tự động theo thời gian thực
        </label>

        <div className="text-xs text-gray-500">
          Khi đã lưu token, dữ liệu nhập/xóa/import sẽ tự push lên GitHub sau vài giây và tự pull dữ liệu mới từ GitHub theo chu kỳ đã đặt. Token chỉ lưu trong trình duyệt hiện tại và không được ghi vào database.
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => downloadDatabase(snapshot)}>
            <Download size={14} /> Export JSON
          </Button>
          <input id="import-database-json" type="file" accept=".json" className="hidden" onChange={e => importDatabase(e.target.files?.[0] ?? null)} />
          <Button variant="outline" onClick={() => document.getElementById('import-database-json')?.click()}>
            <Upload size={14} /> Import JSON
          </Button>
          <Button variant="outline" onClick={pullGitHub} disabled={syncing}>
            <CloudDownload size={14} /> Pull GitHub
          </Button>
          <Button variant="outline" onClick={pushGitHub} disabled={syncing || !form.githubToken}>
            <CloudUpload size={14} /> Push GitHub
          </Button>
        </div>

        <div className={`rounded-lg border p-3 text-xs ${dbPercent >= 90 ? 'bg-red-50 border-red-200 text-red-700' : dbPercent >= 75 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <div className="flex items-center justify-between mb-2">
            <span>Dung lượng database hiện tại</span>
            <span>{formatBytes(dbBytes)} / {formatBytes(dbLimit)} ({dbPercent}%)</span>
          </div>
          <div className="h-2 rounded-full bg-white border border-gray-200 overflow-hidden">
            <div className={`h-full ${dbPercent >= 90 ? 'bg-red-500' : dbPercent >= 75 ? 'bg-yellow-500' : 'bg-teal-500'}`} style={{ width: `${dbPercent}%` }} />
          </div>
          {dbPercent >= 75 && (
            <div className="mt-2">Database gần đầy so với giới hạn đã đặt. Hãy export backup hoặc tách dữ liệu theo tháng/năm nếu tiếp tục nhập rất nhiều dữ liệu.</div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-700">
        <div className="mb-2">Thông tin về hệ thống</div>
        <ul className="space-y-1 text-xs text-blue-600 list-disc list-inside">
          <li>Dữ liệu chạy offline trong trình duyệt và đồng bộ JSON lên GitHub khi có token ghi repo.</li>
          <li>Người nhận link muốn cùng nhập dữ liệu cần có token GitHub hợp lệ hoặc dùng cùng một tài khoản đã được cấp quyền ghi repository.</li>
          <li>Hỗ trợ quản lý theo chuẩn ZDHC MRSL, Lot.No và FEFO.</li>
          <li>Cảnh báo HSD: hết hạn, còn ≤15 ngày, còn ≤30 ngày và còn hạn.</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button onClick={save}><Save size={14} /> Lưu cài đặt</Button>
        <Button variant="outline" onClick={reset}><RotateCcw size={14} /> Đặt lại</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
