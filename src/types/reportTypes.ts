export interface Entry {
    id: number;
    documentNumber: string;
    explanation: string;
    merchandiseValue: number;
}

export interface SaleEntry extends Entry {
    cashValue: number;
    cardValue: number;
}

export interface ReportData {
    date: Date;
    companyName: string;
    previousBalance: number;
    entries: Entry[];
    sales: SaleEntry[];
}

export interface ExtractedEntry {
    date: string;
    documentNumber: string;
    explanation: string;
    merchandiseValue: number;
    isEntry: boolean;
    cashValue?: number;
    cardValue?: number;
}

export interface ProcessedEntry {
    date: string;
    initialValue: number;
    entries: {
        "Nr crt": number;
        documentNumber: string;
        explanation: string;
        merchandiseValue: number;
    }[];
    sales: {
        "Nr crt": number;
        documentNumber: string;
        explanation: string;
        cashValue: number;
        cardValue: number;
        merchandiseValue: number;
    }[];
    totalValue: number;
    totalSales: number;
    finalValue: number;
}

export interface ExtractedExcelData {
    entries: ExtractedEntry[];
    sales: ExtractedEntry[];
    processedEntries: ProcessedEntry[];
}
