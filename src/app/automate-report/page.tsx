"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Download } from "lucide-react";
import { extractDataFromExcel } from "@/lib/excelExtractor";
import { generateReportPDF } from "@/lib/generatePDF";
import { convertProcessedEntryToReportData } from "@/lib/dataConverter";
import JSZip from "jszip";

export default function AutomateReportPage() {
    const [entriesFile, setEntriesFile] = useState<File | null>(null);
    const [salesFile, setSalesFile] = useState<File | null>(null);
    const [companyName, setCompanyName] = useState("");
    const [initialValue, setInitialValue] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateReports = async () => {
        if (!entriesFile && !salesFile) {
            alert("Please upload at least one file");
            return;
        }

        try {
            setIsGenerating(true);
            console.log("Starting data extraction with files:", {
                entriesFile: entriesFile?.name,
                salesFile: salesFile?.name,
                initialValue,
            });

            const extractedData = await extractDataFromExcel(
                entriesFile,
                salesFile,
                initialValue
            );

            console.log("Extracted data:", {
                entriesCount: extractedData.entries.length,
                salesCount: extractedData.sales.length,
                processedEntriesCount: extractedData.processedEntries.length,
            });

            // Create a new ZIP file
            const zip = new JSZip();
            console.log("Processing entries for PDF generation...");

            // Generate PDF for each processed entry
            for (const entry of extractedData.processedEntries) {
                console.log("Processing entry for date:", entry.date, {
                    entriesCount: entry.entries.length,
                    salesCount: entry.sales.length,
                    initialValue: entry.initialValue,
                    finalValue: entry.finalValue,
                });

                const reportData = convertProcessedEntryToReportData(
                    entry,
                    companyName
                );
                const pdfBlob = await generateReportPDF(reportData);

                // Add PDF to ZIP with date as filename
                const fileName = `Raport_${entry.date
                    .split(".")
                    .join("-")}.pdf`;
                console.log("Adding to zip:", fileName, "Size:", pdfBlob.size);
                zip.file(fileName, pdfBlob);
            }

            // Generate and download ZIP file
            console.log("Generating final ZIP file...");
            const zipBlob = await zip.generateAsync({ type: "blob" });
            console.log("ZIP file generated, size:", zipBlob.size);

            const downloadUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = "Rapoarte.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            console.log("Download initiated");
        } catch (error) {
            console.error("Error generating reports:", error);
            alert("Error generating reports. Please check the console.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center bg-background py-2 px-4">
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
                                    setInitialValue(Number(e.target.value))
                                }
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="entriesFile">
                                    Document Intrări
                                </Label>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() =>
                                        document
                                            .getElementById("entriesFile")
                                            ?.click()
                                    }
                                >
                                    <FileUp className="mr-2 h-4 w-4" />
                                    {entriesFile
                                        ? entriesFile.name
                                        : "Încarcă document"}
                                </Button>
                                <Input
                                    id="entriesFile"
                                    type="file"
                                    className="hidden"
                                    accept=".xlsx,.xls"
                                    onChange={(e) =>
                                        setEntriesFile(
                                            e.target.files?.[0] || null
                                        )
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="salesFile">
                                    Document Vânzări
                                </Label>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() =>
                                        document
                                            .getElementById("salesFile")
                                            ?.click()
                                    }
                                >
                                    <FileUp className="mr-2 h-4 w-4" />
                                    {salesFile
                                        ? salesFile.name
                                        : "Încarcă document"}
                                </Button>
                                <Input
                                    id="salesFile"
                                    type="file"
                                    className="hidden"
                                    accept=".xlsx,.xls"
                                    onChange={(e) =>
                                        setSalesFile(
                                            e.target.files?.[0] || null
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleGenerateReports}
                            disabled={
                                isGenerating ||
                                (!entriesFile && !salesFile) ||
                                !companyName
                            }
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {isGenerating
                                ? "Generare în curs..."
                                : "Generează Rapoarte"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
