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
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
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

    // Update the supplier data preparation logic
    const supplierData = React.useMemo(() => {
        const supplierTotals = new Map<string, number>();

        data.processedEntries.forEach((entry) => {
            entry.entries.forEach((item) => {
                const currentTotal = supplierTotals.get(item.explanation) || 0;
                supplierTotals.set(
                    item.explanation,
                    currentTotal + (item.purchaseValue || 0)
                );
            });
        });

        return Array.from(supplierTotals.entries())
            .map(([supplier, total]) => ({
                supplier,
                total,
            }))
            .sort((a, b) => b.total - a.total);
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
                            <defs>
                                <linearGradient
                                    id="colorCash"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#4f46e5"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#4f46e5"
                                        stopOpacity={0.4}
                                    />
                                </linearGradient>
                                <linearGradient
                                    id="colorCard"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#10b981"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#10b981"
                                        stopOpacity={0.4}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                            />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: "#6b7280" }}
                                tickFormatter={(value) =>
                                    format(new Date(value), "dd MMM")
                                }
                            />
                            <YAxis tick={{ fill: "#6b7280" }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                                itemStyle={{ color: "#1f2937" }}
                            />
                            <Legend />
                            <Bar
                                dataKey="cashSales"
                                name="Numerar"
                                fill="url(#colorCash)"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="cardSales"
                                name="Card"
                                fill="url(#colorCard)"
                                radius={[4, 4, 0, 0]}
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
                            <defs>
                                <linearGradient
                                    id="colorTotal"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#8b5cf6"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#8b5cf6"
                                        stopOpacity={0.2}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                            />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: "#6b7280" }}
                                tickFormatter={(value) =>
                                    format(new Date(value), "dd MMM")
                                }
                            />
                            <YAxis tick={{ fill: "#6b7280" }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                                itemStyle={{ color: "#1f2937" }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="totalSales"
                                name="Vânzări Totale"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Supplier Distribution */}
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
                            <defs>
                                <linearGradient
                                    id="colorSupplier"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="0"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#6366f1"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#6366f1"
                                        stopOpacity={0.4}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                            />
                            <XAxis type="number" tick={{ fill: "#6b7280" }} />
                            <YAxis
                                type="category"
                                dataKey="supplier"
                                width={150}
                                tick={{ fill: "#6b7280" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                                itemStyle={{ color: "#1f2937" }}
                            />
                            <Legend />
                            <Bar
                                dataKey="total"
                                name="Valoare Totală"
                                fill="url(#colorSupplier)"
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Stock Movement */}
            <Card>
                <CardHeader>
                    <CardTitle>Mișcare Stoc, Intrări și Ieșiri</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient
                                    id="colorBalance"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#3b82f6"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#3b82f6"
                                        stopOpacity={0.2}
                                    />
                                </linearGradient>
                                <linearGradient
                                    id="colorEntries"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#10b981"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#10b981"
                                        stopOpacity={0.2}
                                    />
                                </linearGradient>
                                <linearGradient
                                    id="colorSales"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#f59e0b"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#f59e0b"
                                        stopOpacity={0.2}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: "#6b7280" }}
                                tickFormatter={(value) =>
                                    format(new Date(value), "dd MMM")
                                }
                            />
                            <YAxis tick={{ fill: "#6b7280" }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                }}
                                itemStyle={{ color: "#1f2937" }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                name="Sold"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                            <Area
                                type="monotone"
                                dataKey="entries"
                                name="Intrări"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorEntries)"
                            />
                            <Area
                                type="monotone"
                                dataKey="totalSales"
                                name="Ieșiri"
                                stroke="#f59e0b"
                                fillOpacity={1}
                                fill="url(#colorSales)"
                            />
                        </AreaChart>
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
