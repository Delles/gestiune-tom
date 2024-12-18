import React, { useState } from "react";
import { ProcessedEntry, ExtractedExcelData } from "@/types/reportTypes";

import { format } from "date-fns";
import { generateReportPDF } from "@/lib/generatePDF";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ReportCard } from "@/components/ReportCard";

interface ReportsSectionProps {
    data: ExtractedExcelData;
    companyName: string;
}

export function ReportsSection({ data, companyName }: ReportsSectionProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");

    const handleGenerateReport = async (
        entry: ProcessedEntry,
        action: "save" | "preview"
    ) => {
        try {
            if (!companyName) {
                setDialogMessage("Vă rugăm să introduceți numele companiei.");
                setDialogOpen(true);
                return;
            }

            const reportData = {
                date: new Date(entry.date),
                companyName,
                previousBalance: entry.initialValue,
                entries: entry.entries.map((item, index) => ({
                    id: index,
                    documentNumber: item.documentNumber,
                    explanation: item.explanation,
                    merchandiseValue: item.merchandiseValue,
                })),
                sales: entry.sales.map((item, index) => ({
                    id: index,
                    documentNumber: item.documentNumber,
                    explanation: item.explanation,
                    merchandiseValue: item.merchandiseValue,
                    cashValue: item.cashValue,
                    cardValue: item.cardValue,
                    "Nr crt": index + 1,
                })),
            };

            const pdfBlob = await generateReportPDF(reportData);

            if (action === "preview") {
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, "_blank");
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
            } else {
                if (window.showSaveFilePicker) {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: `raport_${format(
                            new Date(entry.date),
                            "dd_MM_yyyy"
                        )}.pdf`,
                        types: [
                            {
                                description: "PDF Document",
                                accept: { "application/pdf": [".pdf"] },
                            },
                        ],
                    });

                    const writableStream = await fileHandle.createWritable();
                    await writableStream.write(pdfBlob);
                    await writableStream.close();

                    setDialogMessage("Raportul a fost salvat cu succes!");
                    setDialogOpen(true);
                } else {
                    setDialogMessage(
                        "Funcția de salvare nu este suportată în acest browser."
                    );
                    setDialogOpen(true);
                }
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            setDialogMessage("A apărut o eroare la generarea raportului.");
            setDialogOpen(true);
        }
    };

    return (
        <div className="space-y-4">
            {data.processedEntries.map(
                (entry: ProcessedEntry, index: number) => (
                    <ReportCard
                        key={index}
                        entry={entry}
                        onGenerateReport={handleGenerateReport}
                    />
                )
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Notificare</DialogTitle>
                        <DialogDescription>{dialogMessage}</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
}
