export interface BaseEntry {
    documentNumber: string;
    explanation: string;
    merchandiseValue: number;
}

export interface ExtractedEntry extends BaseEntry {
    date: string;
    purchaseValue?: number;
    isEntry: boolean;
    cashValue?: number;
    cardValue?: number;
}

export interface EntryItem extends BaseEntry {
    "Nr crt": number;
    purchaseValue: number;
}

export interface SaleItem extends BaseEntry {
    "Nr crt": number;
    cashValue: number;
    cardValue: number;
    purchaseValue?: number;
}

export interface ProcessedEntry {
    date: string;
    initialValue: number;
    finalValue: number;
    entries: EntryItem[];
    sales: SaleItem[];
    totalValue: number;
    totalSales: number;
}

export interface ExtractedExcelData {
    entries: ExtractedEntry[];
    sales: ExtractedEntry[];
    processedEntries: ProcessedEntry[];
    validation?: ImportValidation;
}

export interface ImportIssue {
    severity: "info" | "warning" | "error";
    code: string;
    fileName: string;
    sheetName?: string;
    row?: number;
    message: string;
    originalValue?: string;
}

export interface ImportFileCheck {
    fileName: string;
    sheetName: string;
    kind: "entries" | "sales";
    importedRows: number;
    excludedRows: number;
    importedTotal: number;
    sourceTotal?: number;
    totalsMatch?: boolean;
    period?: { start: string; end: string };
}

export interface ImportValidation {
    canExport: boolean;
    issues: ImportIssue[];
    files: ImportFileCheck[];
}

export interface ReportData {
    date: Date;
    companyName: string;
    previousBalance: number;
    entries: BaseEntry[];
    sales: SaleItem[];
}

export interface Entry extends BaseEntry {
    id: number;
}

export interface SaleEntry extends BaseEntry {
    id: number;
    cashValue: number;
    cardValue: number;
    "Nr crt"?: number;
}
