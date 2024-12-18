import React from "react";
import { ProcessedEntry } from "@/types/reportTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/SummaryCard";
import { DataTable } from "@/components/DataTable";
import { Column } from "@/components/DataTable";
import { EntryItem, SaleItem } from "@/types/reportTypes";

interface ReportCardProps {
    entry: ProcessedEntry;
    onGenerateReport: (
        entry: ProcessedEntry,
        action: "save" | "preview"
    ) => Promise<void>;
}

// Update column definitions with proper typing
const entriesColumns: Column<EntryItem>[] = [
    { header: "Nr crt", accessor: "Nr crt" },
    { header: "Număr Document", accessor: "documentNumber" },
    { header: "Explicație", accessor: "explanation" },
    {
        header: "Valoare Marfă",
        accessor: "merchandiseValue",
        align: "right",
    },
];

const salesColumns: Column<SaleItem>[] = [
    { header: "Nr crt", accessor: "Nr crt" },
    { header: "Număr Document", accessor: "documentNumber" },
    { header: "Explicație", accessor: "explanation" },
    {
        header: "Valoare Numerar",
        accessor: "cashValue",
        align: "right",
    },
    {
        header: "Valoare Card",
        accessor: "cardValue",
        align: "right",
    },
    {
        header: "Valoare Totală",
        accessor: "merchandiseValue",
        align: "right",
    },
];

export function ReportCard({ entry, onGenerateReport }: ReportCardProps) {
    return (
        <Collapsible className="mb-6">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CollapsibleTrigger className="w-full">
                    <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-medium">
                            Raport pentru {entry.date}
                        </CardTitle>
                        <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 ease-in-out transform group-data-[state=open]:rotate-180" />
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-6 space-y-8">
                        {/* Balance Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SummaryCard
                                label="Sold Inițial"
                                value={entry.initialValue}
                                trend="neutral"
                            />
                            <SummaryCard
                                label="Sold Final"
                                value={entry.finalValue}
                                trend={
                                    entry.finalValue >= entry.initialValue
                                        ? "positive"
                                        : "negative"
                                }
                            />
                        </div>

                        {/* Entries Section */}
                        <section>
                            <h3 className="text-lg font-semibold mb-4">
                                Intrări
                            </h3>
                            {entry.entries.length > 0 ? (
                                <DataTable
                                    columns={entriesColumns}
                                    data={entry.entries}
                                />
                            ) : (
                                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                    Nu sunt intrări în această zi
                                </p>
                            )}
                        </section>

                        {/* Sales Section */}
                        <section>
                            <h3 className="text-lg font-semibold mb-4">
                                Vânzări
                            </h3>
                            {entry.sales.length > 0 ? (
                                <DataTable
                                    columns={salesColumns}
                                    data={entry.sales}
                                />
                            ) : (
                                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                    Nu sunt vânzări/ieșiri în această zi
                                </p>
                            )}
                        </section>

                        {/* Totals Summary */}
                        <div className="grid grid-cols-2 gap-8 mt-6">
                            <SummaryCard
                                label="Total Intrări"
                                value={entry.totalValue}
                            />
                            <SummaryCard
                                label="Total Vânzări"
                                value={entry.totalSales}
                            />
                        </div>

                        {/* Updated Report Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                            <Button
                                onClick={() => onGenerateReport(entry, "save")}
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                            >
                                Salvează Raportul
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    onGenerateReport(entry, "preview")
                                }
                                className="w-full sm:w-auto border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Previzualizare PDF
                            </Button>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
