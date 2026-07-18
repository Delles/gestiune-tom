import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as XLSX from "xlsx";
import { extractDataFromExcel } from "./excelExtractor";

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

afterEach(() => {
    spyOn(console, "warn").mockRestore();
});

describe("extractDataFromExcel sales classification", () => {
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
