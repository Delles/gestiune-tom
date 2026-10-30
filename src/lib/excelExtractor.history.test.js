import { describe, expect, test } from "bun:test";
import { extractDataFromExcel } from "./excelExtractor";
import { convertProcessedEntryToReportData } from "./dataConverter";
import { ENTRY_HEADERS, SALES_HEADERS, oblioWorkbook, workbookFile } from "./__fixtures__/oblioWorkbooks";

const sale = (number, document, type, amount, options = {}) => [
    number, options.client ?? null, null, options.date ?? "17.07.2026", document,
    type, options.invoice ?? null, options.description ?? "plata factura", "RON", amount,
];
const fiscal = (number, document, type, amount, options = {}) => sale(number, document, type, amount, {
    description: type === "Card" ? "incasari pos" : "incasari numerar", ...options,
});
const salesFile = (rows, headers = SALES_HEADERS, name = "incasari-history.xls") => workbookFile(oblioWorkbook(headers, rows), name);

describe("compatibility with historical Oblio importer changes", () => {
    // f722dfe (July 2026): Factura takes precedence, including numeric receipt IDs.
    test.each(["xls", "xlsx"])("keeps invoice receipts separate from fiscal rows in %s", async format => {
        const result = await extractDataFromExcel(null, salesFile([
            fiscal(1, 1849, "Card", 10), fiscal(2, 1849, "Raport Z", 130),
            sale(3, 1849, "Card", 962, { invoice: "ATM0009", client: "Client Test", description: "incasari pos" }),
            sale(4, "ATM0002", "Chitanta", 1188, { invoice: "ATM0008", client: "Alt Client", description: "incasari numerar" }),
        ], SALES_HEADERS, `incasari-history.${format}`), 5000);
        expect(result.validation.canExport).toBe(true);
        expect(result.sales).toHaveLength(4);
        expect(result.processedEntries[0].sales).toEqual([
            { "Nr crt": 1, documentNumber: "RF 1847", explanation: "Raport fiscal Z 1849", merchandiseValue: 140, cashValue: 130, cardValue: 10 },
            { "Nr crt": 2, documentNumber: "1849", explanation: "Factura ATM0009 - Client Test", merchandiseValue: 962, cashValue: 0, cardValue: 962 },
            { "Nr crt": 3, documentNumber: "ATM0002", explanation: "Chitanta Alt Client", merchandiseValue: 1188, cashValue: 1188, cardValue: 0 },
        ]);
        expect(result.processedEntries[0].totalSales).toBe(2290);
        expect(result.processedEntries[0].finalValue).toBe(2710);
    });

    // b35a6b9 (April 2025): Chitanta is its own cash document, even without Factura.
    test.each([true, false])("keeps standalone Chitanta receipts with Factura header present=%s", async includeInvoice => {
        let row = sale(1, "ATM0002", "Chitanta", 1188, { client: "Client Test" });
        if (!includeInvoice) row = row.filter((_, index) => index !== 6);
        const result = await extractDataFromExcel(null, salesFile([row], includeInvoice ? SALES_HEADERS : SALES_HEADERS.filter(header => header !== "Factura")));
        expect(result.validation.canExport).toBe(true);
        expect(result.processedEntries[0].sales).toEqual([
            { "Nr crt": 1, documentNumber: "ATM0002", explanation: "Chitanta Client Test", merchandiseValue: 1188, cashValue: 1188, cardValue: 0 },
        ]);
    });

    // 98382d0 (May 2025): merge cash/Card only for the same document AND day.
    test("groups paired components while preserving multiple Z reports on the same day", async () => {
        const result = await extractDataFromExcel(null, salesFile([
            fiscal(1, "1523 Card", "Card", 10), fiscal(2, "1524 Raport Z", "Raport Z", 200),
            fiscal(3, "1523 Raport Z", "Raport Z", 130), fiscal(4, "1524 Card", "Card", 20),
            fiscal(5, 1523, "Raport Z", 30, { date: "18.07.2026" }),
        ]));
        expect(result.validation.canExport).toBe(true);
        expect(result.processedEntries[0].sales).toEqual([
            { "Nr crt": 1, documentNumber: "RF 1521", explanation: "Raport fiscal Z 1523", merchandiseValue: 140, cashValue: 130, cardValue: 10 },
            { "Nr crt": 2, documentNumber: "RF 1522", explanation: "Raport fiscal Z 1524", merchandiseValue: 220, cashValue: 200, cardValue: 20 },
        ]);
        expect(result.processedEntries[1].sales[0]).toMatchObject({ "Nr crt": 1, documentNumber: "RF 1521", cashValue: 30, merchandiseValue: 30 });
    });

    test("preserves separate partial receipts against the same invoice", async () => {
        const result = await extractDataFromExcel(null, salesFile([
            sale(1, "cv.fact.001", "Card", 200, { invoice: "ATM0009", client: "Client Test" }),
            sale(2, "ATM0003", "Chitanta", 100, { invoice: "ATM0009", client: "Client Test" }),
        ]));
        expect(result.validation.canExport).toBe(true);
        expect(result.processedEntries[0].sales).toHaveLength(2);
        expect(result.processedEntries[0].totalSales).toBe(300);
        expect(result.processedEntries[0].sales[0].documentNumber).toBe("cv.fact.001");
        expect(result.processedEntries[0].sales[1].documentNumber).toBe("ATM0003");
    });

    test("keeps blank client invoice explanations usable and preserves zero-value receipts", async () => {
        const result = await extractDataFromExcel(null, salesFile([
            sale(1, "cv.fact.001", "Card", 0, { invoice: "ATM0009" }),
        ]));
        expect(result.validation.canExport).toBe(true);
        expect(result.processedEntries[0].sales[0]).toMatchObject({ documentNumber: "cv.fact.001", explanation: "Factura ATM0009", cardValue: 0, cashValue: 0 });
    });

    // a9a8e42 (November 2024): purchase value is retained, but stock balances use resale value.
    test("preserves purchase values, chronological running balances and PDF model conversion", async () => {
        const entry = (number, nir, date, purchase, retail) => ENTRY_HEADERS.map(header => ({
            "Nr. crt": number, "Nume furnizor": "Furnizor Test", NIR: nir,
            "Data in stoc": date, "Data document": "01.07.2026", "Total achizitie cu TVA": purchase,
            "Total vanzare cu TVA": retail, "Moneda vanzare": "RON", "Moneda achizitie": "RON",
        })[header] ?? null);
        const result = await extractDataFromExcel(workbookFile(oblioWorkbook(ENTRY_HEADERS, [
            entry(1, "TMR2", "18.07.2026", "400,125", 500),
            entry(2, "TMR1", "17.07.2026", 900, 1200),
        ])), salesFile([
            fiscal(1, 1850, "Card", 50, { date: "18.07.2026" }), fiscal(2, 1850, "Raport Z", 100, { date: "18.07.2026" }),
            fiscal(3, 1849, "Card", 10), fiscal(4, 1849, "Raport Z", 130),
            sale(5, "cv.fact.009", "Card", 962, { invoice: "ATM0009", client: "Client Test" }),
        ]), 1000);
        expect(result.validation.canExport).toBe(true);
        expect(result.processedEntries.map(day => [day.date, day.initialValue, day.totalValue, day.totalSales, day.finalValue])).toEqual([
            ["2026-07-17", 1000, 1200, 1102, 1098], ["2026-07-18", 1098, 500, 150, 1448],
        ]);
        expect(result.processedEntries[1].entries[0].purchaseValue).toBe(400.125);
        const pdf = convertProcessedEntryToReportData(result.processedEntries[0], "Societate Test");
        expect(pdf.companyName).toBe("Societate Test");
        expect(pdf.date.toISOString().slice(0, 10)).toBe("2026-07-17");
        expect(pdf.previousBalance).toBe(1000);
        expect(pdf.entries).toEqual([{ documentNumber: "TMR1", explanation: "Furnizor Test", merchandiseValue: 1200 }]);
        expect(pdf.sales).toEqual(result.processedEntries[0].sales);
    });
});
