import * as XLSX from "xlsx";

export const SALES_HEADERS = [
    "Nr. crt.", "Client", "Cod Fiscal", "Data incasarii", "Incasare",
    "Tip", "Factura", "Explicatie", "Moneda", "Valoare",
];

export const ENTRY_HEADERS = [
    "Nr. crt", "Nume furnizor", "CIF furnizor", "Document", "Data document",
    "Data scadentei", "Tip document", "Moneda", "Valoare", "Rest de plata",
    "NIR", "Data in stoc", "Moneda achizitie", "Total achizitie fara TVA",
    "Total achizitie TVA", "Total achizitie cu TVA", "Adaos %", "Total adaos",
    "Moneda vanzare", "Total vanzare fara TVA", "Total TVA vanzare",
    "Total vanzare cu TVA", "Status document", "Nota",
];

export function workbookFile(workbook, name = "oblio-test.xls") {
    return new File([XLSX.write(workbook, { bookType: name.endsWith(".xlsx") ? "xlsx" : "xls", type: "array" })], name, {
        type: "application/vnd.ms-excel",
    });
}

export function oblioWorkbook(headers, rows, period = "Perioada test") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        [], [null, "Raport"], [null, period], [], headers, ...rows,
    ]), "sheet 1");
    return workbook;
}

// Representative September layout and control totals, with synthetic supplier/document data.
// Tests must also run in a clean checkout without the user's ignored local .xls files.
export function septemberWorkbook(kind) {
    const date = day => `${String(day).padStart(2, "0")}.09.2026`;
    if (kind === "sales") {
        const days = [
            [1, 100, 961.3], [2, 487, 954], [3, 745.8, 754.7], [5, 125.8, 485.5],
            [7, 96.8, 242], [9, 309, 903.5], [10, null, 487], [11, 156, 779.4],
            [12, 247, 1085.5], [15, null, 844.6], [16, 502.2, 293.5], [17, 234, 1011.5],
            [18, null, 605], [19, 388, 902.08], [22, 207, 1149], [23, 104, 522.5],
            [24, 224.5, 127], [25, 1037.4, 333.5], [26, 382, 1178.5],
            [28, 29, 691], [29, 89.8, 521.5], [30, 195, 490],
        ];
        const rows = [];
        days.forEach(([day, card, cash], index) => {
            if (card !== null) rows.push([rows.length + 1, null, null, date(day), 1879 + index, "Card", null, "incasari pos", "RON", card]);
            rows.push([rows.length + 1, null, null, date(day), 1879 + index, "Raport Z", null,
                day === 26 ? "incasari numerear" : "incasari numerar", "RON", cash]);
        });
        return oblioWorkbook(SALES_HEADERS, [...rows, [],
            [null, null, null, null, null, null, null, null, "RON", 20982.88],
            [null, "Documentele anulate si cele nefinalizate nu apar in acest Raport."],
        ], "01.09.2026 - 30.09.2026");
    }
    const data = [
        [1, null, 250.02, 0], [2, "TMR1303", 4976.8901, 6110],
        [3, "TMR1304", 13664.32, 15600], [3, "TMR1305", 1043.26, 1589.6],
        [8, null, 250.04, 0], [7, null, 57.2, 0], [15, "TMR1306", 669.83, 474],
        [15, "TMR1307", 874.71, 1365], [15, null, 50.88, 0], [18, null, 260.1, 0],
        [18, "TMR1308", 770.9694, 1466], [22, "TMR1309", 1400.1273, 2308],
        [22, "TMR1310", 50.72, 68], [23, "TMR1311", 1371.489, 2105.5],
        [24, "TMR1312", 1255.64, 1955], [24, "TMR1313", 801.18, 1145],
        [25, "TMR1314", 540.215, 1100], [25, "TMR1315", 798.31, 1264],
        [26, null, 513.27, 0],
    ];
    const rows = data.map(([day, nir, purchase, retail], index) => {
        const row = Array(ENTRY_HEADERS.length).fill(null);
        row[0] = index + 1; row[1] = `Furnizor test ${index + 1}`; row[3] = `INV-${index + 1}`;
        row[4] = date(Math.max(1, day - 1)); row[6] = "Factura"; row[7] = "RON";
        row[8] = purchase; row[10] = nir; row[11] = date(day); row[12] = "RON";
        row[15] = purchase; row[18] = "RON"; row[21] = retail;
        return row;
    });
    const footer = Array(ENTRY_HEADERS.length).fill(null);
    footer[15] = 29599.1708; footer[21] = 36550.1;
    return oblioWorkbook(ENTRY_HEADERS, [...rows, [], footer], "01.09.2026 - 30.09.2026");
}
