import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ExtractedExcelData } from "@/types/reportTypes";
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

import { format } from "date-fns";
import { ro } from "date-fns/locale";

export default function DataVisualization({
    data,
}: {
    data: ExtractedExcelData;
    companyName: string;
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

    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold text-center text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    Vizualizare Date
                </h1>
            </div>

            {/* Charts Section */}
            <div className="space-y-8">
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
                                <XAxis
                                    type="number"
                                    tick={{ fill: "#6b7280" }}
                                />
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
        </div>
    );
}
