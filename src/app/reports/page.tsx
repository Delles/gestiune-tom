"use client";

import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractDataFromExcel } from "@/lib/excelExtractor";
import { ExtractedExcelData } from "@/types/reportTypes";
import DataVisualization from "@/components/DataVisualization";

export default function ViewReportsPage() {
    const [companyName, setCompanyName] = useState("");
    const [initialValue, setInitialValue] = useState<number | "">("");
    const [entriesFile, setEntriesFile] = useState<File | null>(null);
    const [salesFile, setSalesFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processedData, setProcessedData] =
        useState<ExtractedExcelData | null>(null);

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFile: (file: File | null) => void
    ) => {
        const file = e.target.files?.[0] || null;
        setFile(file);
        setError(null);
    };

    const handleProcessFiles = async () => {
        if (!entriesFile && !salesFile) {
            setError("Please upload at least one file");
            return;
        }

        setError(null);
        setIsProcessing(true);

        try {
            const extractedData = await extractDataFromExcel(
                entriesFile,
                salesFile,
                Number(initialValue)
            );
            setProcessedData(extractedData);
        } catch (error) {
            console.error("Error processing files:", error);
            setError(
                "An error occurred while processing the files. Please try again."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const isFormValid =
        companyName.trim() !== "" &&
        (entriesFile !== null || salesFile !== null) &&
        initialValue !== "";

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="container max-w-7xl mx-auto">
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-2xl md:text-3xl text-center text-primary">
                            Vizualizare Rapoarte
                        </CardTitle>
                        <CardDescription className="text-center">
                            Încărcați documentele pentru a vizualiza datele
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                                    handleFileChange(e, setEntriesFile)
                                }
                            />
                            <FileUpload
                                id="salesFile"
                                label="Document Vânzări"
                                file={salesFile}
                                onChange={(e) =>
                                    handleFileChange(e, setSalesFile)
                                }
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleProcessFiles}
                            disabled={isProcessing || !isFormValid}
                        >
                            {isProcessing ? (
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

                {processedData && (
                    <DataVisualization
                        data={processedData}
                        initialStockValue={Number(initialValue) || 0}
                    />
                )}
            </div>
        </div>
    );
}

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
