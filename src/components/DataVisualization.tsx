import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ProcessedEntry, ExtractedExcelData } from "@/types/reportTypes";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

export default function DataVisualization({
    data,
}: {
    data: ExtractedExcelData;
}) {
    // Prepare data for charts
    const chartData = data.processedEntries.map((entry) => ({
        date: entry.date,
        cashSales: entry.sales.reduce((sum, sale) => sum + sale.cashValue, 0),
        cardSales: entry.sales.reduce((sum, sale) => sum + sale.cardValue, 0),
        totalSales: entry.totalSales,
        balance: entry.finalValue,
        entries: entry.totalValue,
    }));

    // Add this new data preparation logic after the existing chartData preparation
    const supplierData = React.useMemo(() => {
        const supplierTotals = new Map<string, number>();

        data.processedEntries.forEach((entry) => {
            entry.entries.forEach((item) => {
                const currentTotal = supplierTotals.get(item.explanation) || 0;
                supplierTotals.set(
                    item.explanation,
                    currentTotal + item.merchandiseValue
                );
            });
        });

        return Array.from(supplierTotals.entries())
            .map(([supplier, total]) => ({
                supplier,
                total,
            }))
            .sort((a, b) => b.total - a.total); // Sort by total value descending
    }, [data]);

    // Calculate the timespan
    const timespan = React.useMemo(() => {
        const dates = data.processedEntries.map(
            (entry) => new Date(entry.date)
        );
        const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        return {
            start: format(startDate, "d MMMM yyyy", { locale: ro }),
            end: format(endDate, "d MMMM yyyy", { locale: ro }),
        };
    }, [data]);

    // Add charts section before the detailed cards
    const ChartsSection = () => (
        <div className="space-y-8 mb-12">
            {/* Daily Sales Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Comparație Vânzări Zilnice (Numerar vs Card)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="cashSales"
                                name="Numerar"
                                fill="#4f46e5"
                            />
                            <Bar
                                dataKey="cardSales"
                                name="Card"
                                fill="#10b981"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Sales Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Tendință Vânzări Totale</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="totalSales"
                                name="Vânzări Totale"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Stock Movement */}
            <Card>
                <CardHeader>
                    <CardTitle>Mișcare Stoc și Intrări</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                name="Sold"
                                stroke="#ef4444"
                                fill="#fee2e2"
                            />
                            <Area
                                type="monotone"
                                dataKey="entries"
                                name="Intrări"
                                stroke="#f59e0b"
                                fill="#fef3c7"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Update the supplier distribution card */}
            <Card>
                <CardHeader>
                    <CardTitle>Distribuție Intrări pe Furnizori</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Perioada: {timespan.start} - {timespan.end}
                    </p>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                                type="category"
                                dataKey="supplier"
                                width={150}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="total"
                                name="Valoare Totală"
                                fill="#6366f1"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-center">Date Procesate</h1>

            <Tabs defaultValue="graphs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="graphs">Grafice</TabsTrigger>
                    <TabsTrigger value="reports">Rapoarte</TabsTrigger>
                </TabsList>

                <TabsContent value="graphs">
                    <ChartsSection />
                </TabsContent>

                <TabsContent value="reports">
                    {data.processedEntries.map(
                        (entry: ProcessedEntry, index: number) => (
                            <Collapsible key={index} className="mb-4">
                                <Card>
                                    <CollapsibleTrigger className="w-full">
                                        <CardHeader className="border-b bg-gray-50 flex flex-row items-center justify-between">
                                            <CardTitle className="text-xl">
                                                Raport pentru {entry.date}
                                            </CardTitle>
                                            <ChevronDown className="h-6 w-6" />
                                        </CardHeader>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                        <CardContent className="p-6 space-y-8">
                                            {/* Balance Summary */}
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-600 mb-1">
                                                        Sold Inițial
                                                    </p>
                                                    <p className="text-2xl font-semibold">
                                                        {entry.initialValue.toFixed(
                                                            2
                                                        )}{" "}
                                                        RON
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-600 mb-1">
                                                        Sold Final
                                                    </p>
                                                    <p className="text-2xl font-semibold">
                                                        {entry.finalValue.toFixed(
                                                            2
                                                        )}{" "}
                                                        RON
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Entries Section */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">
                                                    Intrări
                                                </h3>
                                                {entry.entries.length > 0 ? (
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-gray-50">
                                                                <TableHead>
                                                                    Nr crt
                                                                </TableHead>
                                                                <TableHead>
                                                                    Număr
                                                                    Document
                                                                </TableHead>
                                                                <TableHead>
                                                                    Explicație
                                                                </TableHead>
                                                                <TableHead className="text-right">
                                                                    Valoare
                                                                    Marfă
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {entry.entries.map(
                                                                (item, i) => (
                                                                    <TableRow
                                                                        key={i}
                                                                    >
                                                                        <TableCell>
                                                                            {
                                                                                item[
                                                                                    "Nr crt"
                                                                                ]
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                item.documentNumber
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                item.explanation
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {item.merchandiseValue.toFixed(
                                                                                2
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                                        Nu sunt intrări în
                                                        această zi
                                                    </p>
                                                )}
                                            </div>

                                            {/* Sales Section */}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">
                                                    Vânzări
                                                </h3>
                                                {entry.sales.length > 0 ? (
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-gray-50">
                                                                <TableHead>
                                                                    Nr crt
                                                                </TableHead>
                                                                <TableHead>
                                                                    Număr
                                                                    Document
                                                                </TableHead>
                                                                <TableHead>
                                                                    Explicație
                                                                </TableHead>
                                                                <TableHead className="text-right">
                                                                    Valoare
                                                                    Numerar
                                                                </TableHead>
                                                                <TableHead className="text-right">
                                                                    Valoare Card
                                                                </TableHead>
                                                                <TableHead className="text-right">
                                                                    Valoare
                                                                    Totală
                                                                </TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {entry.sales.map(
                                                                (item, i) => (
                                                                    <TableRow
                                                                        key={i}
                                                                    >
                                                                        <TableCell>
                                                                            {
                                                                                item[
                                                                                    "Nr crt"
                                                                                ]
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                item.documentNumber
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                item.explanation
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {item.cashValue.toFixed(
                                                                                2
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {item.cardValue.toFixed(
                                                                                2
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {item.merchandiseValue.toFixed(
                                                                                2
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                                        Nu sunt vânzări/ieșiri
                                                        în această zi
                                                    </p>
                                                )}
                                            </div>

                                            {/* Totals Summary */}
                                            <div className="grid grid-cols-2 gap-8 mt-6">
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-600 mb-1">
                                                        Total Intrări
                                                    </p>
                                                    <p className="text-2xl font-semibold">
                                                        {entry.totalValue.toFixed(
                                                            2
                                                        )}{" "}
                                                        RON
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-600 mb-1">
                                                        Total Vânzări
                                                    </p>
                                                    <p className="text-2xl font-semibold">
                                                        {entry.totalSales.toFixed(
                                                            2
                                                        )}{" "}
                                                        RON
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
