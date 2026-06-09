export type ImportResult = {
  acceptedRows: number;
  rejectedRows: number;
  errors: Array<{ row: number; message: string }>;
};

export type ExportFormat = "csv" | "xlsx";
