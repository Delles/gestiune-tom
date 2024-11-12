import { ProcessedEntry, ReportData } from "@/types/reportTypes";

export function convertProcessedEntryToReportData(
    processedEntry: ProcessedEntry,
    companyName: string
): ReportData {
    return {
        date: new Date(processedEntry.date.split(".").reverse().join("-")),
        companyName,
        previousBalance: processedEntry.initialValue,
        entries: processedEntry.entries.map((entry, index) => ({
            id: index + 1,
            documentNumber: entry.documentNumber,
            explanation: entry.explanation,
            merchandiseValue: entry.merchandiseValue,
        })),
        sales: processedEntry.sales.map((sale, index) => ({
            id: index + 1,
            documentNumber: sale.documentNumber,
            explanation: sale.explanation,
            merchandiseValue: sale.merchandiseValue,
            cashValue: sale.cashValue,
            cardValue: sale.cardValue,
        })),
    };
}
