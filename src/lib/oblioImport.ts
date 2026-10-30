import * as XLSX from "xlsx";
import { ExtractedEntry, ImportFileCheck, ImportIssue } from "../types/reportTypes";

type Cell = string | number | null | undefined;
type Kind = "entries" | "sales";

const columns = {
    entries: ["Nr. crt", "Nume furnizor", "NIR", "Data in stoc", "Total vanzare cu TVA"],
    sales: ["Nr. crt.", "Data incasarii", "Incasare", "Tip", "Explicatie", "Client", "Moneda", "Valoare"],
};

function normalize(value: Cell): string {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/\s+/g, " ").trim();
}

function headerKey(value: Cell): string {
    return normalize(value).replace(/[.\s]/g, "");
}

// Oblio exports numeric cells, but pasted text can use Romanian grouping/decimals.
// Consume the entire value; parseFloat would silently accept truncated amounts.
function parseAmount(value: Cell): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    const text = value.trim().replace(/[\u00a0\u202f]/g, " ");
    let canonical: string;
    if (/^[+-]?\d{1,3}(?:\.\d{3})+,\d+$/.test(text)) {
        canonical = text.replace(/\./g, "").replace(",", ".");
    } else if (/^[+-]?\d{1,3}(?: \d{3})+(?:[,.]\d+)?$/.test(text)) {
        canonical = text.replace(/ /g, "").replace(",", ".");
    } else if (/^[+-]?\d+(?:[,.]\d+)?$/.test(text)) {
        canonical = text.replace(",", ".");
    } else {
        return null;
    }
    const amount = Number(canonical);
    return Number.isFinite(amount) ? amount : null;
}

function parseDate(value: Cell, date1904: boolean): string | null {
    let year: number, month: number, day: number;
    if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0) return null;
        const parts = XLSX.SSF.parse_date_code(value, { date1904 });
        if (!parts) return null;
        year = parts.y; month = parts.m; day = parts.d;
    } else {
        const text = String(value ?? "").trim();
        const local = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (local) {
            year = Number(local[3]); month = Number(local[2]); day = Number(local[1]);
        } else if (iso) {
            year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
        } else return null;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date.toISOString().slice(0, 10);
}

function money(value: number): string {
    return value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Reads only the two supported Oblio exports. Report/PDF formatting stays outside this module. */
export async function importOblioFile(file: File, kind: Kind): Promise<{
    entries: ExtractedEntry[];
    check: ImportFileCheck;
    issues: ImportIssue[];
}> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
    const candidates = workbook.SheetNames.flatMap(sheetName => {
        // range: 0 retains physical Excel row numbers, even when !ref starts at A2.
        const rows = XLSX.utils.sheet_to_json<Cell[]>(workbook.Sheets[sheetName], {
            header: 1, range: 0, defval: null, blankrows: true,
        });
        const headerRow = rows.findIndex(row =>
            row.some(cell => headerKey(cell) === "nrcrt") &&
            row.some(cell => headerKey(cell) === headerKey(kind === "entries" ? "NIR" : "Incasare"))
        );
        return headerRow < 0 ? [] : [{ sheetName, rows, headerRow }];
    });
    if (candidates.length !== 1) {
        throw new Error(`${file.name}: ${candidates.length ? "mai multe foi Oblio identificate" : "format Oblio nerecunoscut"}. Încărcați exportul ${kind === "entries" ? "Intrări" : "Încasări"}.`);
    }
    const { sheetName, rows, headerRow } = candidates[0];
    const headers = new Map<string, number>();
    rows[headerRow].forEach((cell, index) => {
        const key = headerKey(cell);
        if (!key) return;
        if (headers.has(key)) throw new Error(`${file.name}: coloana „${cell}” apare de mai multe ori.`);
        headers.set(key, index);
    });
    for (const column of columns[kind]) {
        if (!headers.has(headerKey(column))) throw new Error(`${file.name}: lipsește coloana Oblio „${column}”.`);
    }
    const get = (row: Cell[], column: string): Cell => row[headers.get(headerKey(column)) ?? -1];
    const entries: ExtractedEntry[] = [];
    const issues: ImportIssue[] = [];
    const check: ImportFileCheck = { fileName: file.name, sheetName, kind, importedRows: 0, excludedRows: 0, importedTotal: 0 };
    const issue = (severity: ImportIssue["severity"], code: string, row: number | undefined, message: string, originalValue?: Cell) => {
        issues.push({ severity, code, fileName: file.name, sheetName, row, message,
            ...(originalValue == null ? {} : { originalValue: String(originalValue) }) });
    };
    for (const row of rows.slice(0, headerRow)) {
        for (const cell of row) {
            const match = String(cell ?? "").match(/^(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})$/);
            if (match) {
                const start = parseDate(match[1], date1904), end = parseDate(match[2], date1904);
                if (start && end && start <= end) check.period = { start, end };
                else issue("error", "period", undefined, "Perioada exportului Oblio nu este validă.", cell);
            }
        }
    }
    const valueColumn = kind === "entries" ? "Total vanzare cu TVA" : "Valoare";
    const identityColumns = kind === "entries"
        ? ["Nr. crt", "NIR", "Document", "Data in stoc", "Nume furnizor"]
        : ["Nr. crt.", "Incasare", "Data incasarii", "Tip", "Factura", "Client", "Explicatie"];
    const seen = new Set<string>();
    let footerRow: number | undefined;
    for (let index = headerRow + 1; index < rows.length; index++) {
        const row = rows[index];
        const rowNumber = index + 1;
        if (!row?.some(cell => String(cell ?? "").trim())) continue;
        if (row.some(cell => normalize(cell).startsWith("documentele anulate")) &&
            get(row, valueColumn) == null && !get(row, "Nr. crt")) continue;
        const candidate = identityColumns.some(column => String(get(row, column) ?? "").trim());
        if (!candidate) {
            // Oblio's final total has values, but no transaction identity or date.
            if (get(row, valueColumn) != null) {
                const total = parseAmount(get(row, valueColumn));
                if (footerRow !== undefined || total === null) {
                    issue("error", "total", rowNumber, "Totalul din exportul Oblio nu poate fi verificat.", get(row, valueColumn));
                } else {
                    check.sourceTotal = total;
                    footerRow = rowNumber;
                }
            } else {
                issue("error", "unrecognized_row", rowNumber, "Rând nerecunoscut în exportul Oblio. Verificați datele înainte de salvare.");
            }
            continue;
        }
        const amount = parseAmount(get(row, valueColumn));
        const nir = String(get(row, "NIR") ?? "").trim();
        if (kind === "entries" && !nir && amount === 0) {
            check.excludedRows++;
            issue("info", "no_nir", rowNumber, "Poziție neinclusă: fără NIR și cu valoare de vânzare zero.");
            continue;
        }
        let invalid = false;
        const fail = (code: string, message: string, value?: Cell) => {
            invalid = true; issue("error", code, rowNumber, message, value);
        };
        if (amount === null) fail("amount", "Valoare lipsă sau nevalidă. Corectați în Oblio și reîncărcați exportul.", get(row, valueColumn));
        const dateValue = get(row, kind === "entries" ? "Data in stoc" : "Data incasarii");
        const date = parseDate(dateValue, date1904);
        if (!date) fail("date", "Dată lipsă sau nevalidă. Corectați în Oblio și reîncărcați exportul.", dateValue);
        else if (check.period && (date < check.period.start || date > check.period.end)) {
            if (kind === "sales") fail("date", "Data încasării este în afara perioadei exportului Oblio.", dateValue);
            else issue("warning", "stock_date", rowNumber, "Data în stoc este în afara perioadei exportului. Poziția a fost păstrată la data NIR; verificați în Oblio.", dateValue);
        }
        const currencyColumns = kind === "entries" ? ["Moneda vanzare", "Moneda achizitie"] : ["Moneda"];
        for (const column of currencyColumns) {
            const currency = normalize(get(row, column));
            if (headers.has(headerKey(column)) && currency !== "ron") fail("currency", `Moneda din „${column}” trebuie să fie RON.`, get(row, column));
        }
        let entry: ExtractedEntry | undefined;
        if (kind === "entries") {
            if (!nir) fail("document", "Poziție cu valoare de vânzare, dar fără NIR. Verificați în Oblio.");
            const purchase = headers.has(headerKey("Total achizitie cu TVA")) ? parseAmount(get(row, "Total achizitie cu TVA")) : 0;
            if (purchase === null) fail("amount", "Valoarea de achiziție este lipsă sau nevalidă.", get(row, "Total achizitie cu TVA"));
            if (!invalid) entry = { date: date!, documentNumber: nir, explanation: String(get(row, "Nume furnizor") ?? ""),
                merchandiseValue: amount!, purchaseValue: purchase!, isEntry: true };
        } else {
            const type = normalize(get(row, "Tip"));
            const description = String(get(row, "Explicatie") ?? "");
            const text = normalize(description);
            const hasCash = /\bnumerar\b/.test(text);
            const hasCard = /\b(?:pos|card)\b/.test(text);
            const receipt = String(get(row, "Incasare") ?? "").trim();
            const invoice = String(get(row, "Factura") ?? "").trim();
            const client = String(get(row, "Client") ?? "").trim();
            let documentNumber = receipt, explanation = "", cash = false;
            if (!receipt) fail("document", "Numărul încasării lipsește.");
            if (type === "chitanta") {
                explanation = `Chitanta ${client}`.trim(); cash = true;
                if (hasCard) fail("classification", "Tipul Chitanță contrazice explicația plății.", description);
            } else if (invoice && type === "card") {
                explanation = [`Factura ${invoice}`, client].filter(Boolean).join(" - ");
                if (hasCash) fail("classification", "Tipul Card contrazice explicația plății.", description);
            } else if (!invoice && (type === "raport z" || type === "card")) {
                // This Oblio export lists the fiscal cash component as Raport Z, separately from Card.
                cash = type === "raport z";
                const match = receipt.match(/^(\d+)(?:\s+(?:card|raport\s+z))?$/i);
                const number = match ? Number(match[1]) : NaN;
                if (!Number.isSafeInteger(number) || number < 2) fail("document", "Numărul raportului fiscal nu este valid.", receipt);
                else {
                    // Preserve the established fiscal numbering used by existing reports.
                    documentNumber = `RF ${number - 2}`;
                    explanation = `Raport fiscal Z ${number}`;
                }
                if ((cash && hasCard) || (!cash && hasCash)) fail("classification", "Tipul încasării contrazice explicația plății. Verificați în Oblio.", description);
                else if (!invalid && !(cash ? hasCash : hasCard)) {
                    issue("warning", "description", rowNumber, `${dateValue}: suma ${amount === null ? "" : money(amount)} lei a fost inclusă la ${cash ? "numerar" : "card"} pe baza tipului „${get(row, "Tip")}”. Explicație neobișnuită.`, description);
                }
            } else {
                fail("classification", "Tip de încasare nerecunoscut pentru raport. Verificați în Oblio.", get(row, "Tip"));
                console.warn(`unrecognized sale type at row ${rowNumber}: ${get(row, "Tip")}`);
            }
            if (!invalid) entry = { date: date!, documentNumber, explanation, merchandiseValue: amount!, isEntry: false,
                cashValue: cash ? amount! : 0, cardValue: cash ? 0 : amount! };
        }
        if (entry) {
            const key = JSON.stringify(entry);
            if (seen.has(key)) issue("error", "duplicate", rowNumber, "Poziție identică repetată. Verificați în Oblio; nu a fost eliminată automat.");
            seen.add(key);
            entries.push(entry);
            check.importedTotal += entry.merchandiseValue;
        }
    }
    check.importedRows = entries.length;
    if (check.sourceTotal !== undefined) {
        check.totalsMatch = Math.abs(check.importedTotal - check.sourceTotal) < 0.005;
        if (!check.totalsMatch) issue("error", "total", footerRow,
            `Total importat: ${money(check.importedTotal)} lei. Total Oblio: ${money(check.sourceTotal)} lei. Diferență: ${money(check.sourceTotal - check.importedTotal)} lei.`);
    } else issue("warning", "missing_total", undefined, "Exportul nu conține un total Oblio identificabil. Totalul importat nu a putut fi comparat.");
    if (!entries.length && !check.excludedRows && !issues.some(item => item.severity === "error")) {
        issue("error", "empty", undefined, "Exportul nu conține poziții pentru raport.");
    }
    return { entries, check, issues };
}
