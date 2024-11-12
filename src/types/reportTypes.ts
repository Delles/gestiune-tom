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
