import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as XLSX from "xlsx";
import { existsSync, readFileSync } from "node:fs";
import { extractDataFromExcel } from "./excelExtractor";
import { septemberWorkbook, workbookFile } from "./__fixtures__/oblioWorkbooks";

const SALES_HEADERS = [
    "Nr. crt.",
    "Client",
    "Cod Fiscal",
    "Data incasarii",
    "Incasare",
    "Tip",
    "Factura",
    "Explicatie",
    "Moneda",
    "Valoare",
];

function createSalesFile(rows, headers = SALES_HEADERS) {
    const worksheet = XLSX.utils.aoa_to_sheet([
        [null, "Raport"],
        [null, "Perioada test"],
        [],
        headers,
        ...rows,
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "sheet 1");
    const content = XLSX.write(workbook, {
        bookType: "xls",
        type: "array",
    });

    return new File([content], "incasari-test.xls", {
        type: "application/vnd.ms-excel",
    });
}

function septemberFile(name, mutate = () => {}) {
    const workbook = septemberWorkbook(name.startsWith("Intrari") ? "entries" : "sales");
    mutate(workbook.Sheets[workbook.SheetNames[0]], workbook);
    return workbookFile(workbook, name);
}

afterEach(() => {
    spyOn(console, "warn").mockRestore();
});

describe("extractDataFromExcel sales classification", () => {
    test("imports September-style Oblio exports without losing the misspelled cash row", async () => {
        const entries = septemberFile("Intrari septembrie 2026.xls");
        const sales = septemberFile("Incasari_30-10-2026.xls");
        const result = await extractDataFromExcel(entries, sales, 10000);

        expect(result.entries).toHaveLength(13);
        expect(result.sales).toHaveLength(41);
        expect(result.entries.reduce((sum, row) => sum + row.merchandiseValue, 0)).toBeCloseTo(36550.1, 2);
        expect(result.sales.reduce((sum, row) => sum + row.cashValue, 0)).toBeCloseTo(15322.58, 2);
        expect(result.sales.reduce((sum, row) => sum + row.cardValue, 0)).toBeCloseTo(5660.3, 2);
        expect(result.processedEntries.find(day => day.date === "2026-09-26").sales).toEqual([
            {
                "Nr crt": 1,
                documentNumber: "RF 1895",
                explanation: "Raport fiscal Z 1897",
                merchandiseValue: 1560.5,
                cashValue: 1178.5,
                cardValue: 382,
            },
        ]);
        expect(result.processedEntries.at(-1).finalValue).toBeCloseTo(25567.22, 2);
        expect(result.validation.canExport).toBe(true);
        expect(result.validation.files.map(file => file.totalsMatch)).toEqual([true, true]);
        expect(result.validation.files[0].excludedRows).toBe(6);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({
            severity: "warning", code: "description", row: 40,
            originalValue: "incasari numerear",
        }));
    });

    test.skipIf(!existsSync(new URL("../../docs/Intrari septembrie 2026.xls", import.meta.url)) ||
        !existsSync(new URL("../../docs/Incasari_30-10-2026.xls", import.meta.url)))(
        "also reconciles the user's original local exports when available", async () => {
            const file = name => new File([readFileSync(new URL(`../../docs/${name}`, import.meta.url))], name);
            const result = await extractDataFromExcel(file("Intrari septembrie 2026.xls"), file("Incasari_30-10-2026.xls"));
            expect(result.validation.canExport).toBe(true);
            expect(result.validation.files.map(check => check.totalsMatch)).toEqual([true, true]);
            expect(result.entries).toHaveLength(13);
            expect(result.sales).toHaveLength(41);
            expect(result.processedEntries.find(day => day.date === "2026-09-26").totalSales).toBe(1560.5);
        }
    );

    test("includes a card-paid invoice as a separate report sale", async () => {
        const salesFile = createSalesFile([
            [
                29,
                null,
                null,
                "17.07.2026",
                1849,
                "Card",
                null,
                "incasari pos",
                "RON",
                10,
            ],
            [
                30,
                null,
                null,
                "17.07.2026",
                1849,
                "Raport Z",
                null,
                "incasari numerar",
                "RON",
                130,
            ],
            [
                31,
                "LEXDINCON SRL",
                "RO19102990",
                "17.07.2026",
                "cv.fact.009",
                "Card",
                "ATM0009",
                "contravaloarea facturii nr ATM0009 din 17.07.2026",
                "RON",
                962,
            ],
        ]);

        const result = await extractDataFromExcel(null, salesFile, 0);
        const day = result.processedEntries[0];

        expect(result.sales).toHaveLength(3);
        expect(day.date).toBe("2026-07-17");
        expect(day.sales).toEqual([
            {
                "Nr crt": 1,
                documentNumber: "RF 1847",
                explanation: "Raport fiscal Z 1849",
                merchandiseValue: 140,
                cashValue: 130,
                cardValue: 10,
            },
            {
                "Nr crt": 2,
                documentNumber: "cv.fact.009",
                explanation: "Factura ATM0009 - LEXDINCON SRL",
                merchandiseValue: 962,
                cashValue: 0,
                cardValue: 962,
            },
        ]);
        expect(day.totalSales).toBe(1102);
        expect(day.finalValue).toBe(-1102);
    });

    test("keeps a Chitanta linked to a factura as a cash sale", async () => {
        const salesFile = createSalesFile([
            [
                30,
                "GYCOPYACTIV 2018 S.R.L.",
                39013375,
                "31.03.2025",
                "ATM0002",
                "Chitanta",
                "ATM0008",
                "contravaloarea facturii nr ATM0008 din 31.03.2025",
                "RON",
                1188,
            ],
        ]);

        const result = await extractDataFromExcel(null, salesFile, 0);

        expect(result.processedEntries[0].sales).toEqual([
            {
                "Nr crt": 1,
                documentNumber: "ATM0002",
                explanation: "Chitanta GYCOPYACTIV 2018 S.R.L.",
                merchandiseValue: 1188,
                cashValue: 1188,
                cardValue: 0,
            },
        ]);
    });

    test("preserves Raport Z and POS behavior when the Factura header is absent", async () => {
        const headersWithoutFactura = SALES_HEADERS.filter(
            (header) => header !== "Factura"
        );
        const salesFile = createSalesFile(
            [
                [
                    1,
                    null,
                    null,
                    "01.07.2026",
                    1835,
                    "Card",
                    "incasari pos",
                    "RON",
                    317.5,
                ],
                [
                    2,
                    null,
                    null,
                    "01.07.2026",
                    1835,
                    "Raport Z",
                    "incasari numerar",
                    "RON",
                    447,
                ],
            ],
            headersWithoutFactura
        );

        const result = await extractDataFromExcel(null, salesFile, 0);

        expect(result.processedEntries[0].sales).toEqual([
            {
                "Nr crt": 1,
                documentNumber: "RF 1833",
                explanation: "Raport fiscal Z 1835",
                merchandiseValue: 764.5,
                cashValue: 447,
                cardValue: 317.5,
            },
        ]);
    });

    test("normalizes whitespace and casing in an invoice Card type", async () => {
        const salesFile = createSalesFile([
            [
                1,
                "Client Test",
                "RO1",
                "17.07.2026",
                "cv.fact.010",
                "  CARD  ",
                "ATM0010",
                "plata factura",
                "RON",
                50,
            ],
        ]);

        const result = await extractDataFromExcel(null, salesFile, 0);

        expect(result.processedEntries[0].sales[0]).toMatchObject({
            documentNumber: "cv.fact.010",
            explanation: "Factura ATM0010 - Client Test",
            cashValue: 0,
            cardValue: 50,
        });
    });

    test("skips an invoice with an unsupported payment type", async () => {
        const warning = spyOn(console, "warn").mockImplementation(() => {});
        const salesFile = createSalesFile([
            [
                1,
                "Client Test",
                "RO1",
                "17.07.2026",
                "cv.fact.011",
                "Transfer",
                "ATM0011",
                "plata factura",
                "RON",
                75,
            ],
        ]);

        const result = await extractDataFromExcel(null, salesFile, 0);

        expect(result.sales).toEqual([]);
        expect(result.processedEntries).toEqual([]);
        expect(warning).toHaveBeenCalledTimes(1);
        expect(warning.mock.calls[0][0]).toContain("unrecognized sale type");
    });
});

describe("Oblio import validation", () => {
    const sale = (overrides = {}) => Object.assign(
        [1, null, null, "26.09.2026", 1897, "Raport Z", null, "incasari numerar", "RON", 1178.5],
        overrides
    );

    test.each(["1.178,50", "1 178,50", "1\u00a0178,50", "1178,50", "1178.50", 1178.5])(
        "reads the entire amount %s", async amount => {
            const result = await extractDataFromExcel(null, createSalesFile([sale({ 9: amount })]));
            expect(result.sales[0].cashValue).toBe(1178.5);
            expect(result.validation.canExport).toBe(true);
        }
    );

    test.each([null, "", "1178.50oops", "1 17,50", "NaN", "Infinity"])(
        "blocks malformed or missing amounts %s without aborting inspection", async amount => {
            const result = await extractDataFromExcel(null, createSalesFile([sale({ 9: amount })]));
            expect(result.sales).toEqual([]);
            expect(result.validation.canExport).toBe(false);
            expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: "amount", row: 5 }));
        }
    );

    test("accepts native Excel dates and diacritics in headers and receipt types", async () => {
        const headers = SALES_HEADERS.map(header => header === "Nr. crt." ? " NR CRT " : header === "Data incasarii" ? "Data încasării" : header);
        const result = await extractDataFromExcel(null, createSalesFile([
            sale({ 3: 46291, 4: "ATM0002", 5: " Chitanță ", 7: "plata factura" }),
        ], headers));
        expect(result.sales[0]).toMatchObject({ date: "2026-09-26", documentNumber: "ATM0002", cashValue: 1178.5 });
        expect(result.validation.canExport).toBe(true);
    });

    test.each([
        [{ 5: "Card", 7: "incasari numerar" }, "classification"],
        [{ 5: "Transfer", 7: "deposit" }, "classification"],
        [{ 8: "EUR" }, "currency"],
        [{ 4: "1897oops" }, "document"],
        [{ 3: "29.02.2026" }, "date"],
    ])("blocks conflicting or invalid transaction fields %j", async (overrides, code) => {
        const result = await extractDataFromExcel(null, createSalesFile([sale(overrides)]));
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ severity: "error", code }));
    });

    test("imports blank descriptions using the structured payment type", async () => {
        const result = await extractDataFromExcel(null, createSalesFile([sale({ 5: "Card", 7: null })]));
        expect(result.sales[0].cardValue).toBe(1178.5);
        expect(result.validation.canExport).toBe(true);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: "description", severity: "warning" }));
    });

    test("does not silently double-count an identical transaction", async () => {
        const result = await extractDataFromExcel(null, createSalesFile([sale(), sale({ 0: 2 })]));
        expect(result.sales).toHaveLength(2);
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: "duplicate", row: 6 }));
    });

    test("does not claim reconciliation when the footer is absent", async () => {
        const result = await extractDataFromExcel(null, createSalesFile([sale()]));
        expect(result.validation.files[0].totalsMatch).toBeUndefined();
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: "missing_total", severity: "warning" }));
    });

    test("does not mistake an incomplete transaction for the export footer", async () => {
        const result = await extractDataFromExcel(null, createSalesFile([
            sale(),
            [null, "Client Test", null, null, null, null, null, "plata factura", "RON", 50],
        ]));
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ severity: "error", row: 6, code: "date" }));
    });

    test("preserves stock dates, purchase precision and valid cash-only days", async () => {
        const result = await extractDataFromExcel(
            septemberFile("Intrari septembrie 2026.xls"), septemberFile("Incasari_30-10-2026.xls")
        );
        expect(result.entries.find(entry => entry.documentNumber === "TMR1303")).toMatchObject({ date: "2026-09-02", purchaseValue: 4976.8901 });
        for (const date of ["2026-09-10", "2026-09-15", "2026-09-18"]) {
            expect(result.processedEntries.find(day => day.date === date).sales[0].cardValue).toBe(0);
        }
        expect(result.validation.canExport).toBe(true);
    });

    test.each([
        ["K7", null, "document"],
        ["L7", "31.09.2026", "date"],
        ["V7", "6110oops", "amount"],
        ["P7", null, "amount"],
        ["S7", "EUR", "currency"],
    ])("blocks invalid NIR fields in %s", async (cell, value, code) => {
        const result = await extractDataFromExcel(septemberFile("Intrari septembrie 2026.xls", sheet => {
            sheet[cell] = value === null ? { t: "z" } : { t: "s", v: value };
        }), null);
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ code, severity: "error", row: 7 }));
    });

    test("blocks mismatched Oblio report periods", async () => {
        const result = await extractDataFromExcel(
            septemberFile("Intrari septembrie 2026.xls"),
            septemberFile("Incasari_30-10-2026.xls", sheet => {
                sheet.B3 = { t: "s", v: "01.08.2026 - 30.09.2026" };
            })
        );
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: "period", severity: "error" }));
    });

    test("keeps a valid stock date outside the invoice export period visible for review", async () => {
        const result = await extractDataFromExcel(septemberFile("Intrari septembrie 2026.xls", sheet => {
            sheet.L7 = { t: "s", v: "01.10.2026" };
        }), null);
        expect(result.entries.find(entry => entry.documentNumber === "TMR1303").date).toBe("2026-10-01");
        expect(result.validation.canExport).toBe(true);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: "stock_date", severity: "warning", row: 7 }));
    });

    test("blocks stale footer totals even when every row is readable", async () => {
        const result = await extractDataFromExcel(null, createSalesFile([
            sale(), [null, null, null, null, null, null, null, null, "RON", 1200],
        ]));
        expect(result.sales).toHaveLength(1);
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.files[0].totalsMatch).toBe(false);
    });

    test("keeps valid rows for inspection but blocks incomplete reports", async () => {
        const result = await extractDataFromExcel(null, createSalesFile([
            [1, null, null, "26.09.2026", 1897, "Card", null, "incasari pos", "RON", 382],
            [2, null, null, "31.09.2026", 1897, "Raport Z", null, "incasari numerear", "RON", 1178.5],
            [null, null, null, null, null, null, null, null, "RON", 1560.5],
            [null, "Documentele anulate si cele nefinalizate nu apar in acest Raport."],
        ]));
        expect(result.sales).toHaveLength(1);
        expect(result.validation.canExport).toBe(false);
        expect(result.validation.issues).toContainEqual(expect.objectContaining({
            severity: "error", code: "date", row: 6,
        }));
        expect(result.validation.issues).toContainEqual(expect.objectContaining({
            severity: "error", code: "total", row: 7,
        }));
        expect(result.validation.issues.filter(issue => issue.code === "date")).toHaveLength(1);
        expect(result.validation.issues.some(issue => issue.code === "description")).toBe(false);
    });
});
