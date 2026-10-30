import { ImportValidation } from "@/types/reportTypes";

const formatMoney = (value: number) => value.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function ImportSummary({ validation }: { validation?: ImportValidation }) {
    if (!validation) return null;
    const blocked = !validation.canExport;
    const reconciled = validation.files.length > 0 && validation.files.every(file => file.totalsMatch === true);
    const priority = { error: 0, warning: 1, info: 2 };
    const issues = [...validation.issues].sort((a, b) => priority[a.severity] - priority[b.severity]);
    return (
        <div className={`mb-6 rounded-lg border p-4 text-sm ${blocked ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
            <p role={blocked ? "alert" : "status"} className="font-medium">
                {blocked
                    ? "Rapoartele sunt incomplete. Rezolvați erorile înainte de salvare."
                    : reconciled
                        ? "Verificare completă. Totalurile corespund fișierelor Oblio."
                        : "Fișiere procesate. Verificați observațiile importului."}
            </p>
            {blocked && (
                <p className="mt-1">Previzualizarea rămâne disponibilă pentru verificare. Corectați datele în Oblio și reîncărcați exportul.</p>
            )}
            <ul className="mt-2 space-y-1">
                {validation.files.map(file => (
                    <li key={`${file.kind}-${file.fileName}`}>
                        {file.kind === "entries" ? "Intrări" : "Încasări"}: {file.importedRows} poziții incluse, {formatMoney(file.importedTotal)} RON
                        {file.excludedRows > 0 && ` · ${file.excludedRows} poziții fără NIR și cu valoare de vânzare zero neincluse`}
                    </li>
                ))}
            </ul>
            {validation.issues.length > 0 && (
                <details className="mt-3">
                    <summary className="cursor-pointer font-medium">Detalii verificare ({validation.issues.length})</summary>
                    <ul className="mt-2 space-y-3">
                        {issues.map((issue, index) => (
                            <li key={`${issue.fileName}-${issue.row}-${issue.code}-${index}`} className="break-words">
                                <span className={issue.severity === "error" ? "font-medium text-red-800" : "font-medium"}>
                                    {issue.severity === "error" ? "Eroare" : issue.severity === "warning" ? "Observație" : "Informare"}
                                </span>
                                {issue.fileName && ` · ${issue.fileName}`}
                                {issue.sheetName && ` · ${issue.sheetName}`}
                                {issue.row !== undefined && ` · rând Excel ${issue.row}`}
                                <p>{issue.message}</p>
                                {issue.originalValue !== undefined && <p className="text-slate-600">Valoare originală: „{issue.originalValue}”</p>}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
