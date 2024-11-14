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
