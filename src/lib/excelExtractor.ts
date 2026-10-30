import {
    ExtractedEntry,
    ExtractedExcelData,
    ImportValidation,
    ProcessedEntry,
    SaleItem,
} from "../types/reportTypes";
import { importOblioFile } from "./oblioImport";

/** Import the two Oblio exports without changing the established report aggregation. */
export async function extractDataFromExcel(
    entriesFile: File | null,
    salesFile: File | null,
    initialValue: number = 0
): Promise<ExtractedExcelData> {
    if (!Number.isFinite(initialValue)) throw new Error("Soldul inițial nu este valid.");
    const [entriesResult, salesResult] = await Promise.all([
        entriesFile ? importOblioFile(entriesFile, "entries") : undefined,
        salesFile ? importOblioFile(salesFile, "sales") : undefined,
    ]);
    const results = [entriesResult, salesResult].filter(result => result !== undefined);
    const validation: ImportValidation = {
        canExport: true,
        files: results.map(result => result.check),
        issues: results.flatMap(result => result.issues),
    };
    if (entriesResult?.check.period && salesResult?.check.period &&
        (entriesResult.check.period.start !== salesResult.check.period.start ||
         entriesResult.check.period.end !== salesResult.check.period.end)) {
        validation.issues.push({ severity: "error", code: "period", fileName: salesFile!.name,
            message: "Fișierele Oblio au perioade diferite. Încărcați exporturile pentru aceeași perioadă." });
    }
    if (!entriesFile || !salesFile) {
        validation.issues.push({ severity: "info", code: "single_file", fileName: "",
            message: `A fost încărcat doar exportul ${entriesFile ? "Intrări" : "Încasări"}. Rapoartele includ doar datele din acest fișier.` });
    }
    validation.canExport = !validation.issues.some(issue => issue.severity === "error");
    const entries = entriesResult?.entries ?? [];
    const sales = salesResult?.entries ?? [];
    const sortedData = [...entries, ...sales].sort((a, b) => a.date.localeCompare(b.date));
    return { entries, sales, processedEntries: combineDataByDate(sortedData, initialValue), validation };
}

/**
 * Combine data by date and calculate running balances.
 * This function will now also aggregate sales by documentNumber within each day.
 */
function combineDataByDate(
    sortedData: ExtractedEntry[],
    initialValue: number
): ProcessedEntry[] {
    const entriesByDate = new Map<string, ProcessedEntry>();

    // First pass: Group by date and prepare for aggregation
    sortedData.forEach((item) => {
        if (!entriesByDate.has(item.date)) {
            entriesByDate.set(item.date, {
                date: item.date,
                initialValue: 0, // Will be set in the second pass
                entries: [],
                sales: [], // Sales will be aggregated here
                totalValue: 0, // Sum of entry merchandiseValues, calculated in second pass
                totalSales: 0, // Sum of aggregated sale merchandiseValues, calculated in second pass
                finalValue: 0, // Will be set in the second pass
            });
        }

        const dateEntry = entriesByDate.get(item.date)!;

        if (item.isEntry) {
            // Add entry items directly. Nr crt will be their index + 1.
            dateEntry.entries.push({
                "Nr crt": dateEntry.entries.length + 1,
                documentNumber: item.documentNumber,
                explanation: item.explanation,
                merchandiseValue: item.merchandiseValue,
                purchaseValue: item.purchaseValue || 0,
            });
        } else {
            // This is a sale item, aggregate by documentNumber
            // For sales, we find if an item with the same documentNumber already exists for this date.
            // The explanation for "Raport Fiscal Z" type entries should be consistent if documentNumber is the same.
            const existingSaleIndex = dateEntry.sales.findIndex(
                (s) =>
                    s.documentNumber === item.documentNumber &&
                    s.explanation === item.explanation
            );

            if (existingSaleIndex !== -1) {
                // Aggregate with existing sale entry
                const existingSale = dateEntry.sales[existingSaleIndex];
                existingSale.cashValue += item.cashValue || 0;
                existingSale.cardValue += item.cardValue || 0;
                // merchandiseValue for this SaleItem will be updated in the second pass
            } else {
                // Add as a new sale entry.
                // Note: item.merchandiseValue from ExtractedEntry is the value from the specific Excel row.
                // The final SaleItem.merchandiseValue will be cashValue + cardValue.
                dateEntry.sales.push({
                    "Nr crt": 0, // Placeholder, will be set in the second pass
                    documentNumber: item.documentNumber,
                    explanation: item.explanation,
                    merchandiseValue: 0, // Placeholder, will be sum of cashValue and cardValue
                    cashValue: item.cashValue || 0,
                    cardValue: item.cardValue || 0,
                    // purchaseValue is optional in SaleItem and not typically part of sales aggregation from these Excel types.
                } as SaleItem); // Cast to SaleItem explicitly
            }
        }
    });

    // Second pass: Finalize each day's entry, calculate totals, and running balances
    const result: ProcessedEntry[] = [];
    let runningBalance = initialValue;

    // Sort dates before processing to ensure correct running balance calculation
    const sortedDates = Array.from(entriesByDate.keys()).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    sortedDates.forEach((date) => {
        const dateEntry = entriesByDate.get(date)!;

        // Finalize entries: calculate totalValue for the day
        dateEntry.totalValue = dateEntry.entries.reduce(
            (sum, entry) => sum + entry.merchandiseValue,
            0
        );

        // Finalize sales:
        // 1. Set "Nr crt" for each aggregated sale.
        // 2. Calculate merchandiseValue (total) for each aggregated sale.
        // 3. Calculate totalSales for the day.
        dateEntry.sales.forEach((sale, index) => {
            sale["Nr crt"] = index + 1;
            sale.merchandiseValue = sale.cashValue + sale.cardValue;
        });
        dateEntry.totalSales = dateEntry.sales.reduce(
            (sum, sale) => sum + sale.merchandiseValue,
            0
        );

        // Calculate balances for the day
        dateEntry.initialValue = runningBalance;
        dateEntry.finalValue =
            dateEntry.initialValue +
            dateEntry.totalValue -
            dateEntry.totalSales;
        runningBalance = dateEntry.finalValue;

        result.push(dateEntry);
    });

    return result;
}
