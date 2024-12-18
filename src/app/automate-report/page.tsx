"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Download, Loader2 } from "lucide-react";
import { extractDataFromExcel } from "@/lib/excelExtractor";
import { generateReportPDF } from "@/lib/generatePDF";
import { convertProcessedEntryToReportData } from "@/lib/dataConverter";
import JSZip from "jszip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ReportsSection } from "@/components/ReportsSection";
import { ExtractedExcelData } from "@/types/reportTypes";

interface FileUploadProps {
    id: string;
    label: string;
    file: File | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FileUpload({ id, label, file, onChange }: FileUploadProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Input
                    id={id}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={onChange}
                />
                <Button
                    variant="outline"
                    className="w-full text-left flex justify-between items-center"
                    onClick={() => document.getElementById(id)?.click()}
                >
                    <span className="truncate">
                        {file ? file.name : "Încarcă document"}
                    </span>
                    <FileUp className="h-4 w-4 flex-shrink-0" />
                </Button>
            </div>
        </div>
    );
}

export default function AutomateReportPage() {
    const [entriesFile, setEntriesFile] = useState<File | null>(null);
    const [salesFile, setSalesFile] = useState<File | null>(null);
    const [companyName, setCompanyName] = useState("");
    const [initialValue, setInitialValue] = useState<number | "">("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");
    const [processedData, setProcessedData] =
        useState<ExtractedExcelData | null>(null);

    const handleProcessFiles = async () => {
        if (!entriesFile && !salesFile) {
            setDialogMessage("Vă rugăm să încărcați cel puțin un fișier.");
            setDialogOpen(true);
            return;
        }

        try {
            setIsGenerating(true);
            const extractedData = await extractDataFromExcel(
                entriesFile,
                salesFile,
                initialValue === "" ? 0 : initialValue
            );
            setProcessedData(extractedData);
        } catch (error) {
            console.error(error);
            setDialogMessage("A apărut o eroare la procesarea fișierelor.");
            setDialogOpen(true);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateReports = async () => {
        if (!entriesFile && !salesFile) {
            alert("Please upload at least one file");

            return;
        }

        try {
            setIsGenerating(true);

            const extractedData = await extractDataFromExcel(
                entriesFile,
                salesFile,
                initialValue === "" ? 0 : initialValue
            );

            // Create a new ZIP file
            const zip = new JSZip();

            // Generate PDF for each processed entry
            for (const entry of extractedData.processedEntries) {
                const reportData = convertProcessedEntryToReportData(
                    entry,
                    companyName
                );
                const pdfBlob = await generateReportPDF(reportData);

                // Add PDF to ZIP with date as filename
                const fileName = `Raport_${entry.date
                    .split(".")
                    .join("-")}.pdf`;
                zip.file(fileName, pdfBlob);
            }

            // Generate and download ZIP file
            const zipBlob = await zip.generateAsync({ type: "blob" });

            if (window.showSaveFilePicker) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: "Rapoarte.zip",
                    types: [
                        {
                            description: "ZIP Archive",
                            accept: { "application/zip": [".zip"] },
                        },
                    ],
                });

                const writableStream = await fileHandle.createWritable();
                await writableStream.write(zipBlob);
                await writableStream.close();

                setDialogMessage("Rapoartele au fost salvate cu succes!");
            } else {
                setDialogMessage(
                    "Funcția de salvare nu este suportată în acest browser."
                );
            }
        } catch (error) {
            console.error(error);
            setDialogMessage("A apărut o eroare la generarea rapoartelor.");
        } finally {
            setIsGenerating(false);
            setDialogOpen(true);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background py-8 px-4">
            <div className="container max-w-3xl mx-auto">
                <Card className="p-4 md:p-6">
                    <CardHeader className="space-y-2 p-0 md:p-2">
                        <CardTitle className="text-2xl md:text-3xl text-center text-primary">
                            Rapoarte Automatizate
                        </CardTitle>
                        <p className="text-center text-muted-foreground text-sm md:text-base">
                            Încărcați documentele pentru a genera rapoarte
                            multiple
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 p-0 md:p-2 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">
                                Numele Companiei
                            </Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Introduceți numele companiei"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="initialValue">Sold Inițial</Label>
                            <Input
                                id="initialValue"
                                type="number"
                                value={initialValue}
                                onChange={(e) =>
                                    setInitialValue(
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value)
                                    )
                                }
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FileUpload
                                id="entriesFile"
                                label="Document Intrări"
                                file={entriesFile}
                                onChange={(e) =>
                                    setEntriesFile(e.target.files?.[0] || null)
                                }
                            />

                            <FileUpload
                                id="salesFile"
                                label="Document Vânzări"
                                file={salesFile}
                                onChange={(e) =>
                                    setSalesFile(e.target.files?.[0] || null)
                                }
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleProcessFiles}
                            disabled={
                                isGenerating ||
                                !companyName ||
                                (!entriesFile && !salesFile)
                            }
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesare în curs...
                                </>
                            ) : (
                                "Procesează Fișiere"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {processedData && (
                <div className="container max-w-7xl mx-auto mt-8">
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">
                                Previzualizare Rapoarte
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ReportsSection
                                data={processedData}
                                companyName={companyName}
                            />
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full"
                        onClick={handleGenerateReports}
                        disabled={isGenerating}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {isGenerating
                            ? "Generare în curs..."
                            : "Generează Rapoarte ZIP"}
                    </Button>
                </div>
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
