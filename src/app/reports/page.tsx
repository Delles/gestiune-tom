"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp } from "lucide-react";
import { extractDataFromExcel } from "@/lib/excelExtractor";
import { ExtractedExcelData } from "@/types/reportTypes";
import DataVisualization from "@/components/DataVisualization";

export default function ViewReportsPage() {
    const [entriesFile, setEntriesFile] = useState<File | null>(null);
    const [salesFile, setSalesFile] = useState<File | null>(null);
    const [initialValue, setInitialValue] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedData, setProcessedData] =
        useState<ExtractedExcelData | null>(null);

    const handleProcessFiles = async () => {
        if (!entriesFile && !salesFile) {
            alert("Please upload at least one file");
            return;
        }

        try {
            setIsProcessing(true);
            const extractedData = await extractDataFromExcel(
                entriesFile,
                salesFile,
                initialValue
            );
            setProcessedData(extractedData);
        } catch (error) {
            console.error("Error processing files:", error);
            alert("Error processing files. Please check the console.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-background py-2 px-4">
            <div className="container max-w-7xl mx-auto">
                <Card className="p-4 md:p-6 mb-6">
                    <CardHeader className="space-y-2 p-0 md:p-2">
                        <CardTitle className="text-2xl md:text-3xl text-center text-primary">
                            Vizualizare Rapoarte
                        </CardTitle>
                        <p className="text-center text-muted-foreground text-sm md:text-base">
                            Încărcați documentele pentru a vizualiza datele
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 p-0 md:p-2 mt-4">
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
                            onClick={handleProcessFiles}
                            disabled={
                                isProcessing || (!entriesFile && !salesFile)
                            }
                        >
                            {isProcessing
                                ? "Procesare în curs..."
                                : "Procesează Fișiere"}
                        </Button>
                    </CardContent>
                </Card>

                {processedData && <DataVisualization data={processedData} />}
            </div>
        </div>
    );
}
