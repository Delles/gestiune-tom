import * as XLSX from "xlsx";
import {
    ExtractedEntry,
    ExtractedExcelData,
    ProcessedEntry,
    SaleItem,
} from "../types/reportTypes";

/**
 * Main function to extract and combine data from Entries and Sales Excel files.
 */
export async function extractDataFromExcel(
    entriesFile: File | null,
    salesFile: File | null,
    initialValue: number = 0
): Promise<ExtractedExcelData> {
    try {
        console.log(
            "Starting Excel extraction with initial value:",
            initialValue
        );

        const entriesData = entriesFile
            ? await processEntriesFile(entriesFile)
            : [];
        console.log("Processed entries data:", entriesData.length, "records");

        const salesData = salesFile ? await processSalesFile(salesFile) : [];
        console.log("Processed sales data:", salesData.length, "records");

        // Sort all data by date
        const sortedData = [...entriesData, ...salesData].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        console.log("Combined and sorted data:", sortedData.length, "records");

        // Process entries by date
        const processedEntries = combineDataByDate(sortedData, initialValue);
        console.log(
            "Final processed entries:",
            processedEntries.length,
            "records"
        );

        return {
            entries: entriesData,
            sales: salesData,
            processedEntries,
        };
    } catch (error) {
        console.error("Error in extractDataFromExcel:", error);
        throw error;
    }
}

/**
 * Process entries Excel file
 */
async function processEntriesFile(file: File): Promise<ExtractedEntry[]> {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json<ExcelSheetData>(worksheet, {
            header: 1,
        });

        const entries: ExtractedEntry[] = [];

        // Identify the header row by finding the row that contains 'Nr. crt'
        let headerRowIndex = -1;
        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            if (Array.isArray(row) && row.includes("Nr. crt")) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error(
                "Entries file does not contain a header row with 'Nr. crt'"
            );
        }

        const headers = excelData[headerRowIndex].map(String) as string[];
        const dataStartRow = headerRowIndex + 1;

        // Map headers to their indices for easy access
        const headerMap: { [key: string]: number } = {};
        headers.forEach((header, index) => {
            headerMap[header.trim()] = index;
        });

        // Required columns
        const requiredColumns = [
            "Nr. crt",
            "Nume furnizor",
            "NIR",
            "Data in stoc",
            "Total vanzare cu TVA",
        ];

        // Verify all required columns are present
        for (const column of requiredColumns) {
            if (!(column in headerMap)) {
                throw new Error(
                    `Entries file is missing required column: ${column}`
                );
            }
        }

        // Process each data row
        for (let i = dataStartRow; i < excelData.length; i++) {
            const row = excelData[i] as ExcelSheetData;
            if (!row || row.length === 0) continue; // Skip empty rows

            const document = (row[headerMap["NIR"]] as string) || ""; // Handle missing NIR
            if (!document) continue; // Skip rows where "NIR" is empty

            const dateStr = row[headerMap["Data in stoc"]];
            const explanation =
                (row[headerMap["Nume furnizor"]] as string) || "";
            const valoareStr = row[headerMap["Total vanzare cu TVA"]] as
                | string
                | number;
            const valoareIntrareStr = row[
                headerMap["Total achizitie cu TVA"]
            ] as string | number;

            // Parse and validate date
            const parsedDate = parseDate(dateStr as string);
            if (!parsedDate) {
                console.warn(
                    `Invalid or missing date in Entries file at row ${
                        i + 1
                    }: ${dateStr}`
                );
                continue; // Skip rows with invalid dates
            }

            // Parse merchandise value
            const valoare =
                typeof valoareStr === "number"
                    ? valoareStr
                    : parseFloat(valoareStr.toString().replace(",", "."));
            if (isNaN(valoare)) {
                console.warn(
                    `Invalid merchandise value in Entries file at row ${
                        i + 1
                    }: ${valoareStr}`
                );
                continue; // Skip rows with invalid values
            }

            const entry: ExtractedEntry = {
                date: parsedDate,
                documentNumber: document,
                explanation: explanation,
                merchandiseValue: valoare,
                purchaseValue:
                    typeof valoareIntrareStr === "number"
                        ? valoareIntrareStr
                        : parseFloat(
                              valoareIntrareStr
                                  ?.toString()
                                  ?.replace(",", ".") || "0"
                          ),
                isEntry: true,
                cashValue: undefined,
                cardValue: undefined,
            };

            entries.push(entry);
        }

        return entries;
    } catch (error) {
        console.error("Error processing Entries file:", error);
        throw error; // Re-throw the error to be caught in the main function
    }
}

/**
 * Process sales Excel file
 */
async function processSalesFile(file: File): Promise<ExtractedEntry[]> {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json<ExcelSheetData>(worksheet, {
            header: 1,
        });

        // Changed from salesMap to an array to hold individual entries
        const salesEntries: ExtractedEntry[] = [];

        // Identify the header row by finding the row that contains 'Nr. crt.'
        let headerRowIndex = -1;
        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            if (Array.isArray(row) && row.includes("Nr. crt.")) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error(
                "Sales file does not contain a header row with 'Nr. crt.'"
            );
        }

        const headers = excelData[headerRowIndex].map(String) as string[];
        const dataStartRow = headerRowIndex + 1;

        // Map headers to their indices for easy access
        const headerMap: { [key: string]: number } = {};
        headers.forEach((header, index) => {
            headerMap[header.trim()] = index;
        });

        // Required columns (ensure these cover both Raport Z and Chitanta structures)
        // We might need more flexibility here if Chitanta rows have different columns.
        // For now, assume these columns exist or are handled gracefully if missing.
        const requiredColumns = [
            "Nr. crt.",
            "Data incasarii",
            "Incasare",
            "Tip",
            "Explicatie",
            "Client",
            "Moneda",
            "Valoare",
        ];

        // Verify all required columns are present
        for (const column of requiredColumns) {
            if (!(column in headerMap)) {
                throw new Error(
                    `Sales file is missing required column: ${column}`
                );
            }
        }

        // Process each data row
        for (let i = dataStartRow; i < excelData.length; i++) {
            const row = excelData[i] as ExcelSheetData;
            if (!row || row.length === 0) continue; // Skip empty rows

            const dateStr = row[headerMap["Data incasarii"]];
            const incasareRaw = row[headerMap["Incasare"]]; // Keep raw value
            const explicatie = (row[headerMap["Explicatie"]] as string) || "";
            const valoareStr = row[headerMap["Valoare"]] as string | number;
            const tipValueRaw = row[headerMap["Tip"]]; // Read the Tip column
            const clientValueRaw = row[headerMap["Client"]]; // Read the Client column

            // Parse and validate date
            const parsedDate = parseDate(dateStr as string);
            if (!parsedDate) {
                console.warn(
                    `Invalid or missing date in Sales file at row ${
                        i + 1
                    }: ${dateStr}`
                );
                continue; // Skip rows with invalid dates
            }

            // Parse merchandise value
            const valoare =
                typeof valoareStr === "number"
                    ? valoareStr
                    : parseFloat(valoareStr.toString().replace(",", "."));
            if (isNaN(valoare)) {
                console.warn(
                    `Invalid merchandise value in Sales file at row ${
                        i + 1
                    }: ${valoareStr}`
                );
                continue; // Skip rows with invalid values
            }

            let documentNumber: string = "";
            let updatedExplanation: string = explicatie; // Default to original explanation
            let cashValue = 0;
            let cardValue = 0;
            let isValidSale = false;

            // Determine entry type and extract details
            const incasareStr = String(incasareRaw || "");
            const explicatieLower = explicatie.toLowerCase();
            const tipValueLower = String(tipValueRaw || "").toLowerCase(); // Process Tip value

            if (
                explicatieLower.includes("numerar") ||
                explicatieLower.includes("pos") ||
                explicatieLower.includes("card")
            ) {
                // Assume "Raport Fiscal Z" type based on explanation keywords
                // Extract the number part from 'incasare' (e.g., '1523 Card' or '1523 Raport Z')
                const match = incasareStr.match(/^(\d+)/);
                const documentValue = match ? parseInt(match[1], 10) : NaN;

                if (!isNaN(documentValue)) {
                    const updatedDocumentNumber = documentValue - 2; // Original logic
                    documentNumber = `RF ${updatedDocumentNumber}`;
                    updatedExplanation = `Raport fiscal Z ${documentValue}`;
                    isValidSale = true;

                    if (explicatieLower.includes("numerar")) {
                        cashValue = valoare;
                    } else {
                        // Includes "pos" or "card"
                        cardValue = valoare;
                    }
                } else {
                    console.warn(
                        `Could not parse document number for Raport Fiscal entry at row ${
                            i + 1
                        }: Incasare=${incasareStr}`
                    );
                }
            } else if (tipValueLower === "chitanta") {
                // Handle "Chitanta" type (identified by Tip column)
                documentNumber = incasareStr; // Use 'Incasare' column (e.g., "ATM0002")
                const clientName = String(clientValueRaw || ""); // Get client name
                updatedExplanation = `Chitanta ${clientName}`.trim(); // Construct new explanation

                cashValue = valoare; // Assume Chitanta is always cash for now
                isValidSale = true;
            }

            // If it's a valid sale type we processed, create an entry
            if (isValidSale) {
                const salesEntry: ExtractedEntry = {
                    date: parsedDate,
                    documentNumber: documentNumber,
                    explanation: updatedExplanation,
                    merchandiseValue: valoare, // Use the single row value
                    isEntry: false,
                    cashValue: cashValue,
                    cardValue: cardValue,
                    // purchaseValue is not relevant for sales
                };
                salesEntries.push(salesEntry);
            } else {
                console.warn(
                    `Skipping row ${
                        i + 1
                    } due to unrecognized sale type or parsing issue: Tip='${tipValueRaw}', Explicatie='${explicatie}', Incasare='${incasareStr}'`
                );
            }
        }

        // Return the array of individual ExtractedEntry objects
        // return Object.values(salesMap); // Old logic
        return salesEntries; // New logic
    } catch (error) {
        console.error("Error processing Sales file:", error);
        throw error; // Re-throw the error to be caught in the main function
    }
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

/**
 * Helper function to parse dates
 */
function parseDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    const parts = dateStr.split(".");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    const date = new Date(`${year}-${month}-${day}`);
    return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
}

type ExcelSheetData = (string | number | undefined)[];
