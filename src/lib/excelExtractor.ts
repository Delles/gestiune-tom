import * as XLSX from "xlsx";
import {
    ExtractedEntry,
    ExtractedExcelData,
    ProcessedEntry,
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

        const salesMap: { [date: string]: ExtractedEntry } = {};

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

        // Required columns based on sample data
        const requiredColumns = [
            "Nr. crt.",
            "Data incasarii",
            "Incasare",
            "Explicatie",
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
            const incasare = row[headerMap["Incasare"]] as string | number;

            const explicatie = (row[headerMap["Explicatie"]] as string) || "";
            const valoareStr = row[headerMap["Valoare"]] as string | number;

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

            // Create document number (e.g., "RF 1408")
            const documentValue = Number(incasare);
            const updatedDocumentNumber = documentValue - 2;
            const documentNumber = `RF ${updatedDocumentNumber}`;

            // Update explanation to include "Raport fiscal Z {documentValue}"
            const updatedExplanation = `Raport fiscal Z ${documentValue}`;

            // Determine payment type
            let cashValue = 0;
            let cardValue = 0;
            if (explicatie.toLowerCase().includes("numerar")) {
                cashValue = valoare;
            }
            if (
                explicatie.toLowerCase().includes("pos") ||
                explicatie.toLowerCase().includes("card")
            ) {
                cardValue = valoare;
            }

            const dateKey = parsedDate;

            if (!salesMap[dateKey]) {
                salesMap[dateKey] = {
                    date: parsedDate,
                    documentNumber,
                    explanation: updatedExplanation,
                    merchandiseValue: 0,
                    isEntry: false,
                    cashValue: 0,
                    cardValue: 0,
                };
            }

            // Aggregate values
            const salesEntry = salesMap[dateKey];
            if (salesEntry) {
                salesEntry.merchandiseValue =
                    (salesEntry.merchandiseValue || 0) + valoare;
                salesEntry.cashValue = (salesEntry.cashValue || 0) + cashValue;
                salesEntry.cardValue = (salesEntry.cardValue || 0) + cardValue;
            }
        }

        // Convert the map to an array of ExtractedEntry
        const mergedSales: ExtractedEntry[] = Object.values(salesMap);

        return mergedSales;
    } catch (error) {
        console.error("Error processing Sales file:", error);
        throw error; // Re-throw the error to be caught in the main function
    }
}

/**
 * Combine data by date and calculate running balances
 */
function combineDataByDate(
    sortedData: ExtractedEntry[],
    initialValue: number
): ProcessedEntry[] {
    const entriesByDate = new Map<string, ProcessedEntry>();

    sortedData.forEach((item) => {
        if (!entriesByDate.has(item.date)) {
            entriesByDate.set(item.date, {
                date: item.date,
                initialValue: 0,
                entries: [],
                sales: [],
                totalValue: 0,
                totalSales: 0,
                finalValue: 0,
            });
        }

        const dateEntry = entriesByDate.get(item.date)!;

        if (item.isEntry) {
            dateEntry.entries.push({
                "Nr crt": dateEntry.entries.length + 1,
                documentNumber: item.documentNumber,
                explanation: item.explanation,
                merchandiseValue: item.merchandiseValue,
                purchaseValue: item.purchaseValue || 0,
            });
            dateEntry.totalValue += item.merchandiseValue;
        } else {
            dateEntry.sales.push({
                "Nr crt": dateEntry.sales.length + 1,
                documentNumber: item.documentNumber,
                explanation: item.explanation,
                merchandiseValue: item.merchandiseValue,
                cashValue: item.cashValue || 0,
                cardValue: item.cardValue || 0,
            });
            dateEntry.totalSales += item.merchandiseValue;
        }
    });

    // Calculate running balances
    let runningBalance = initialValue;
    const result = Array.from(entriesByDate.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((entry) => {
            entry.initialValue = runningBalance;
            entry.finalValue =
                runningBalance + entry.totalValue - entry.totalSales;
            runningBalance = entry.finalValue;
            return entry;
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
