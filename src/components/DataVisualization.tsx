import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/SummaryCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    Area,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Label,
} from "recharts";
import {
    TrendingUp,
    Archive,
    BarChartHorizontalBig,
    CalendarClock,
    Award,
    Trophy,
    Banknote,
    CreditCard,
    Loader2,
} from "lucide-react";

import {
    format,
    parseISO,
    isValid,
    startOfDay,
    endOfDay,
    subDays,
    isBefore,
} from "date-fns";
import { ro } from "date-fns/locale";

export default function DataVisualization({
    data,
    initialStockValue = 0,
}: {
    data: ExtractedExcelData;
    initialStockValue?: number;
}) {
    const [startDate, setStartDate] = React.useState<string | null>(null);
    const [endDate, setEndDate] = React.useState<string | null>(null);
    const [isFiltering, setIsFiltering] = React.useState<boolean>(false);

    const [minDataDate, setMinDataDate] = React.useState<Date | null>(null);
    const [maxDataDate, setMaxDataDate] = React.useState<Date | null>(null);

    // Effect 1: Determine overall min/max dates from the raw data
    React.useEffect(() => {
        if (data && data.processedEntries && data.processedEntries.length > 0) {
            const dates = data.processedEntries
                .map((entry) => parseISO(entry.date))
                .filter(isValid);
            if (dates.length > 0) {
                const minD = new Date(
                    Math.min(...dates.map((d) => d.getTime()))
                );
                const maxD = new Date(
                    Math.max(...dates.map((d) => d.getTime()))
                );
                setMinDataDate(startOfDay(minD));
                setMaxDataDate(endOfDay(maxD));
            } else {
                setMinDataDate(null);
                setMaxDataDate(null);
            }
        } else {
            setMinDataDate(null);
            setMaxDataDate(null);
        }
    }, [data]); // Dependency: data (as it contains processedEntries and is the prop)

    // Effect 2: Set initial date filter based on determined range, if not already set
    React.useEffect(() => {
        if (minDataDate && maxDataDate && !startDate && !endDate) {
            setIsFiltering(true);
            setStartDate(format(minDataDate, "yyyy-MM-dd"));
            setEndDate(format(maxDataDate, "yyyy-MM-dd"));
        }
    }, [minDataDate, maxDataDate, startDate, endDate]); // Dependencies cover all reads for this specific logic

    const minDataDateString = React.useMemo(
        () => (minDataDate ? format(minDataDate, "yyyy-MM-dd") : undefined),
        [minDataDate]
    );
    const maxDataDateString = React.useMemo(
        () => (maxDataDate ? format(maxDataDate, "yyyy-MM-dd") : undefined),
        [maxDataDate]
    );

    const handleSetDateRange = (
        type: "last7" | "last14" | "last30" | "allTime"
    ) => {
        if (!minDataDate || !maxDataDate) return;

        let newStartDate: Date;
        let newEndDate: Date = maxDataDate;

        switch (type) {
            case "allTime":
                newStartDate = minDataDate;
                newEndDate = maxDataDate;
                break;
            case "last7":
                newStartDate = subDays(maxDataDate, 6);
                if (isBefore(newStartDate, minDataDate))
                    newStartDate = minDataDate;
                break;
            case "last14":
                newStartDate = subDays(maxDataDate, 13);
                if (isBefore(newStartDate, minDataDate))
                    newStartDate = minDataDate;
                break;
            case "last30":
                newStartDate = subDays(maxDataDate, 29);
                if (isBefore(newStartDate, minDataDate))
                    newStartDate = minDataDate;
                break;
            default:
                return;
        }
        setIsFiltering(true);
        setStartDate(format(startOfDay(newStartDate), "yyyy-MM-dd"));
        setEndDate(format(endOfDay(newEndDate), "yyyy-MM-dd"));
    };

    const handleClearFilters = () => {
        setIsFiltering(true);
        if (minDataDate && maxDataDate) {
            setStartDate(format(minDataDate, "yyyy-MM-dd"));
            setEndDate(format(maxDataDate, "yyyy-MM-dd"));
        } else {
            setStartDate(null);
            setEndDate(null);
        }
    };

    const filteredProcessedEntries = React.useMemo(() => {
        if (!data || !data.processedEntries) return [];
        let entries = data.processedEntries;

        const sDate = startDate ? startOfDay(parseISO(startDate)) : null;
        const eDate = endDate ? endOfDay(parseISO(endDate)) : null;

        if (sDate && isValid(sDate)) {
            entries = entries.filter((entry) => {
                const entryDate = parseISO(entry.date);
                return isValid(entryDate) && entryDate >= sDate;
            });
        }
        if (eDate && isValid(eDate)) {
            entries = entries.filter((entry) => {
                const entryDate = parseISO(entry.date);
                return isValid(entryDate) && entryDate <= eDate;
            });
        }
        return entries;
    }, [data, startDate, endDate]);

    React.useEffect(() => {
        setIsFiltering(false);
    }, [filteredProcessedEntries]);

    const overallSummary = React.useMemo(() => {
        if (filteredProcessedEntries.length === 0) {
            return {
                totalSales: 0,
                totalEntries: 0,
                netStockChange: 0,
                averageDailySales: 0,
                totalCashSales: 0,
                totalCardSales: 0,
                busiestSalesDay: { date: "N/A", amount: 0 },
                largestEntryDay: { date: "N/A", amount: 0 },
            };
        }

        const totalSales = filteredProcessedEntries.reduce(
            (acc, entry) => acc + entry.totalSales,
            0
        );
        const totalEntries = filteredProcessedEntries.reduce(
            (acc, entry) => acc + entry.totalValue,
            0
        );
        const totalCashSales = filteredProcessedEntries.reduce(
            (acc, entry) =>
                acc +
                entry.sales.reduce((s, sale) => s + (sale.cashValue || 0), 0),
            0
        );
        const totalCardSales = filteredProcessedEntries.reduce(
            (acc, entry) =>
                acc +
                entry.sales.reduce((s, sale) => s + (sale.cardValue || 0), 0),
            0
        );

        const daysWithSales = filteredProcessedEntries.filter(
            (entry) => entry.totalSales > 0
        );
        const averageDailySales =
            daysWithSales.length > 0 ? totalSales / daysWithSales.length : 0;

        let busiestSalesDay = { date: "N/A", amount: 0 };
        if (daysWithSales.length > 0) {
            busiestSalesDay = daysWithSales.reduce(
                (max, entry) => {
                    if (entry.totalSales > max.amount) {
                        return {
                            date: format(parseISO(entry.date), "dd MMM yyyy", {
                                locale: ro,
                            }),
                            amount: entry.totalSales,
                        };
                    }
                    return max;
                },
                { date: "N/A", amount: 0 }
            );
        }

        let largestEntryDay = { date: "N/A", amount: 0 };
        const entriesWithValue = filteredProcessedEntries.filter(
            (entry) => entry.totalValue > 0
        );
        if (entriesWithValue.length > 0) {
            largestEntryDay = entriesWithValue.reduce(
                (max, entry) => {
                    if (entry.totalValue > max.amount) {
                        return {
                            date: format(parseISO(entry.date), "dd MMM yyyy", {
                                locale: ro,
                            }),
                            amount: entry.totalValue,
                        };
                    }
                    return max;
                },
                { date: "N/A", amount: 0 }
            );
        }

        return {
            totalSales,
            totalEntries,
            netStockChange: totalEntries - totalSales,
            averageDailySales,
            totalCashSales,
            totalCardSales,
            busiestSalesDay,
            largestEntryDay,
        };
    }, [filteredProcessedEntries]);

    // Calculate the effective starting stock for the current filtered period
    const startingStockForFilter = React.useMemo(() => {
        if (!startDate) return initialStockValue; // No filter start date, use overall initial

        const filterStartDate = startOfDay(parseISO(startDate));
        if (!isValid(filterStartDate)) return initialStockValue;

        let balanceUpToFilterStart = initialStockValue;
        // Iterate over original, unfiltered data up to the day *before* the filter's startDate
        for (const entry of data.processedEntries) {
            const entryDate = startOfDay(parseISO(entry.date));
            if (!isValid(entryDate)) continue;

            if (isBefore(entryDate, filterStartDate)) {
                balanceUpToFilterStart += entry.totalValue - entry.totalSales;
            } else {
                break; // Stop once we reach or pass the filter's start date
            }
        }
        return balanceUpToFilterStart;
    }, [data.processedEntries, startDate, initialStockValue]);

    // Prepare data for charts - uses filteredProcessedEntries
    const chartData = React.useMemo(() => {
        let currentBalance = startingStockForFilter; // Use the calculated starting stock for the filter
        const avgSales = overallSummary.averageDailySales; // Define it once

        return filteredProcessedEntries.map((entry) => {
            const dayBalance =
                currentBalance + entry.totalValue - entry.totalSales;
            currentBalance = dayBalance;

            return {
                date: entry.date,
                cashSales: entry.sales.reduce(
                    (sum, sale) => sum + (sale.cashValue || 0),
                    0
                ),
                cardSales: entry.sales.reduce(
                    (sum, sale) => sum + (sale.cardValue || 0),
                    0
                ),
                totalSales: entry.totalSales,
                balance: dayBalance,
                entries: entry.totalValue,
                averageSales: avgSales, // Correctly add averageSales here
            };
        });
    }, [
        filteredProcessedEntries,
        startingStockForFilter,
        overallSummary.averageDailySales,
    ]);

    const yAxisDomainForStockChart = React.useMemo(() => {
        if (!chartData || chartData.length === 0) {
            return undefined; // Recharts default auto-domain
        }

        const balances = chartData.map((d) => d.balance);
        const minBalance = Math.min(...balances);
        const maxBalance = Math.max(...balances);

        if (minBalance === maxBalance) {
            const padding = Math.max(Math.abs(minBalance * 0.1), 10); // Ensure at least 10 units or 10% padding
            return [minBalance - padding, maxBalance + padding];
        }

        const range = maxBalance - minBalance;
        const padding = range * 0.1; // 10% of the current range

        // Ensure min/max are not identical after padding if range was tiny
        // And provide a slightly larger default padding if the calculated padding is too small (e.g. < 1)
        const effectivePadding = Math.max(padding, 1);

        // It's generally better to let Recharts handle the exact tick values based on the domain.
        // So, we just provide a slightly padded min and max.
        return [minBalance - effectivePadding, maxBalance + effectivePadding];
    }, [chartData]);

    const TOP_N_SUPPLIERS = 6;

    const supplierData = React.useMemo(() => {
        const supplierTotals = new Map<string, number>();
        filteredProcessedEntries.forEach((entry) => {
            entry.entries.forEach((item) => {
                const currentTotal = supplierTotals.get(item.explanation) || 0;
                supplierTotals.set(
                    item.explanation,
                    currentTotal + (item.purchaseValue || 0)
                );
            });
        });

        const sortedSuppliers = Array.from(supplierTotals.entries())
            .map(([supplier, total]) => ({ supplier, total }))
            .sort((a, b) => b.total - a.total);

        if (sortedSuppliers.length > TOP_N_SUPPLIERS) {
            const topSuppliers = sortedSuppliers.slice(0, TOP_N_SUPPLIERS - 1);
            const otherTotal = sortedSuppliers
                .slice(TOP_N_SUPPLIERS - 1)
                .reduce((acc, curr) => acc + curr.total, 0);
            return [
                ...topSuppliers,
                { supplier: "Alții", total: otherTotal },
            ].sort((a, b) => b.total - a.total);
        }
        return sortedSuppliers;
    }, [filteredProcessedEntries]);

    const timespan = React.useMemo(() => {
        const sDate = startDate ? parseISO(startDate) : null;
        const eDate = endDate ? parseISO(endDate) : null;

        if (sDate && isValid(sDate) && eDate && isValid(eDate)) {
            return {
                start: format(sDate, "d MMMM yyyy", { locale: ro }),
                end: format(eDate, "d MMMM yyyy", { locale: ro }),
            };
        }
        if (minDataDate && maxDataDate) {
            // Fallback to overall data range if specific filter not fully set
            return {
                start: format(minDataDate, "d MMMM yyyy", { locale: ro }),
                end: format(maxDataDate, "d MMMM yyyy", { locale: ro }),
            };
        }
        return { start: "N/A", end: "N/A" };
    }, [startDate, endDate, minDataDate, maxDataDate]); // Updated dependencies

    const salesCompositionData = React.useMemo(() => {
        if (
            !overallSummary ||
            (overallSummary.totalCashSales === 0 &&
                overallSummary.totalCardSales === 0)
        ) {
            return [];
        }
        return [
            { name: "Numerar", value: overallSummary.totalCashSales },
            { name: "Card", value: overallSummary.totalCardSales },
        ];
    }, [overallSummary]);

    const COLORS = ["#4f46e5", "#10b981"];

    const cumulativeChartData = React.useMemo(() => {
        if (filteredProcessedEntries.length === 0) return [];
        let cumulativeSales = 0;
        let cumulativeEntries = 0;
        return filteredProcessedEntries.map((entry) => {
            cumulativeSales += entry.totalSales;
            cumulativeEntries += entry.totalValue;
            return {
                date: entry.date,
                cumulativeSales,
                cumulativeEntries,
            };
        });
    }, [filteredProcessedEntries]);

    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg">
            <div className="space-y-2 mb-6">
                <h1 className="text-4xl font-bold text-center text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    Vizualizare Date
                </h1>
                <p className="text-center text-gray-600 text-lg flex items-center justify-center">
                    Perioada afișată:
                    <span className="font-semibold mx-1">
                        {timespan.start}
                    </span>{" "}
                    - <span className="font-semibold mx-1">{timespan.end}</span>
                    {isFiltering && (
                        <Loader2 className="ml-2 h-5 w-5 animate-spin text-primary" />
                    )}
                </p>
            </div>

            {/* Date Filter Section */}
            <Card className="mb-8 p-4 bg-slate-100 shadow">
                <CardHeader className="p-2 pb-3">
                    <CardTitle className="text-xl">
                        Filtrează după Perioadă
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full sm:w-auto">
                            <label
                                htmlFor="startDate"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Dată Început
                            </label>
                            <Input
                                type="date"
                                id="startDate"
                                value={startDate || ""}
                                onChange={(e) => {
                                    setIsFiltering(true);
                                    setStartDate(e.target.value);
                                }}
                                className="w-full"
                                min={minDataDateString}
                                max={endDate || maxDataDateString}
                            />
                        </div>
                        <div className="flex-1 w-full sm:w-auto">
                            <label
                                htmlFor="endDate"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Dată Sfârșit
                            </label>
                            <Input
                                type="date"
                                id="endDate"
                                value={endDate || ""}
                                onChange={(e) => {
                                    setIsFiltering(true);
                                    setEndDate(e.target.value);
                                }}
                                className="w-full"
                                min={startDate || minDataDateString}
                                max={maxDataDateString}
                            />
                        </div>
                        <Button
                            onClick={handleClearFilters}
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            Perioada Completă
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 mt-3">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetDateRange("last7")}
                        >
                            Ultimele 7 Zile
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetDateRange("last14")}
                        >
                            Ultimele 14 Zile
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetDateRange("last30")}
                        >
                            Ultimele 30 Zile
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetDateRange("allTime")}
                        >
                            Toată Perioada
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Overall Summary Section */}
            {overallSummary && (
                <div className="mb-8 p-6 bg-slate-50 rounded-xl shadow-inner">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                        Rezumat General Perioadă
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        <SummaryCard
                            label="Total Vânzări"
                            value={overallSummary.totalSales}
                            description="Suma totală a vânzărilor în perioada selectată."
                            icon={<TrendingUp size={20} />}
                        />
                        <SummaryCard
                            label="Total Intrări"
                            value={overallSummary.totalEntries}
                            description="Valoarea totală a intrărilor (NIR) în perioada selectată."
                            icon={<Archive size={20} />}
                        />
                        <SummaryCard
                            label="Modificare Netă Stoc"
                            value={overallSummary.netStockChange}
                            description="Diferența dintre total intrări și total vânzări."
                            trend={
                                overallSummary.netStockChange > 0
                                    ? "positive"
                                    : overallSummary.netStockChange < 0
                                    ? "negative"
                                    : "neutral"
                            }
                            icon={<BarChartHorizontalBig size={20} />}
                        />
                        <SummaryCard
                            label="Vânzări Medii Zilnice"
                            value={overallSummary.averageDailySales}
                            description="Media vânzărilor pe zilele cu activitate."
                            icon={<CalendarClock size={20} />}
                        />
                        <SummaryCard
                            label="Ziua cu cele mai Mari Vânzări"
                            value={overallSummary.busiestSalesDay.amount}
                            description={
                                overallSummary.busiestSalesDay.date !== "N/A"
                                    ? `Data: ${overallSummary.busiestSalesDay.date}`
                                    : "N/A"
                            }
                            icon={<Award size={20} />}
                        />
                        <SummaryCard
                            label="Cea mai Mare Intrare (Valoare)"
                            value={overallSummary.largestEntryDay.amount}
                            description={
                                overallSummary.largestEntryDay.date !== "N/A"
                                    ? `Data: ${overallSummary.largestEntryDay.date}`
                                    : "N/A"
                            }
                            icon={<Trophy size={20} />}
                        />
                        <SummaryCard
                            label="Total Numerar"
                            value={overallSummary.totalCashSales}
                            description={
                                overallSummary.totalSales > 0
                                    ? `Reprezintă ${(
                                          (overallSummary.totalCashSales /
                                              overallSummary.totalSales) *
                                          100
                                      ).toFixed(2)}% din vânzări`
                                    : "Nu sunt vânzări"
                            }
                            icon={<Banknote size={20} />}
                        />
                        <SummaryCard
                            label="Total Card"
                            value={overallSummary.totalCardSales}
                            description={
                                overallSummary.totalSales > 0
                                    ? `Reprezintă ${(
                                          (overallSummary.totalCardSales /
                                              overallSummary.totalSales) *
                                          100
                                      ).toFixed(2)}% din vânzări`
                                    : "Nu sunt vânzări"
                            }
                            icon={<CreditCard size={20} />}
                        />
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Comparison */}
                {chartData.length > 0 ? (
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
                                    <YAxis
                                        tick={{ fill: "#6b7280" }}
                                        label={{
                                            value: "Valoare (RON)",
                                            angle: -90,
                                            position: "insideLeft",
                                            fill: "#6b7280",
                                            style: { textAnchor: "middle" },
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#ffffff",
                                            borderRadius: "8px",
                                            border: "1px solid #e5e7eb",
                                        }}
                                        itemStyle={{ color: "#1f2937" }}
                                        formatter={(
                                            value: number,
                                            name: string
                                        ) => [
                                            `${value.toLocaleString("ro-RO", {
                                                style: "currency",
                                                currency: "RON",
                                            })}`,
                                            name === "cashSales"
                                                ? "Numerar"
                                                : "Card",
                                        ]}
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
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Comparație Vânzări Zilnice (Numerar vs Card)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[100px] flex items-center justify-center">
                            <p className="text-gray-500">
                                Nu sunt date disponibile pentru comparația
                                vânzărilor zilnice.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Sales Composition Pie Chart */}
                {overallSummary &&
                (overallSummary.totalCashSales > 0 ||
                    overallSummary.totalCardSales > 0) ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Compoziție Vânzări (Numerar vs Card)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={salesCompositionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                        label={({
                                            cx,
                                            cy,
                                            midAngle,
                                            innerRadius,
                                            outerRadius,
                                            percent,
                                        }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius =
                                                innerRadius +
                                                (outerRadius - innerRadius) *
                                                    0.5;
                                            const x =
                                                cx +
                                                radius *
                                                    Math.cos(
                                                        -midAngle * RADIAN
                                                    );
                                            const y =
                                                cy +
                                                radius *
                                                    Math.sin(
                                                        -midAngle * RADIAN
                                                    );
                                            return (
                                                <text
                                                    x={x}
                                                    y={y}
                                                    fill="white"
                                                    textAnchor={
                                                        x > cx ? "start" : "end"
                                                    }
                                                    dominantBaseline="central"
                                                >
                                                    {`${(percent * 100).toFixed(
                                                        0
                                                    )}%`}
                                                </text>
                                            );
                                        }}
                                    >
                                        {salesCompositionData.map(
                                            (entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        COLORS[
                                                            index %
                                                                COLORS.length
                                                        ]
                                                    }
                                                />
                                            )
                                        )}
                                    </Pie>
                                    <Tooltip
                                        formatter={(
                                            value: number,
                                            name: string
                                        ) => [
                                            `${value.toLocaleString("ro-RO", {
                                                style: "currency",
                                                currency: "RON",
                                            })}`,
                                            name,
                                        ]}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Compoziție Vânzări (Numerar vs Card)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[100px] flex items-center justify-center">
                            <p className="text-gray-500">
                                Nu sunt date disponibile pentru compoziția
                                vânzărilor.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Sales Trend */}
                {chartData.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Tendință Vânzări Totale</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={chartData}
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e0e0e0"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(tick) =>
                                            format(new Date(tick), "dd MMM")
                                        }
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    >
                                        <Label
                                            value="Dată"
                                            offset={0}
                                            position="insideBottom"
                                        />
                                    </XAxis>
                                    <YAxis
                                        tickFormatter={(value) =>
                                            `${value.toLocaleString("ro-RO", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })}`
                                        }
                                    >
                                        <Label
                                            value="Valoare (RON)"
                                            angle={-90}
                                            position="insideLeft"
                                            style={{ textAnchor: "middle" }}
                                        />
                                    </YAxis>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                "rgba(255, 255, 255, 0.8)",
                                            backdropFilter: "blur(2px)",
                                        }}
                                        labelFormatter={(label) =>
                                            format(
                                                new Date(label),
                                                "eeee, dd MMMM yyyy",
                                                { locale: ro }
                                            )
                                        }
                                        formatter={(
                                            value: number,
                                            name: string
                                        ) => {
                                            let displayName = "";
                                            if (name === "totalSales") {
                                                displayName = "Vânzări Zilnice";
                                            } else if (
                                                name === "averageSales"
                                            ) {
                                                displayName =
                                                    "Medie Vânzări Zilnice (zile cu vânzări)";
                                            }
                                            return [
                                                `${value.toLocaleString(
                                                    "ro-RO",
                                                    {
                                                        style: "currency",
                                                        currency: "RON",
                                                    }
                                                )}`,
                                                displayName,
                                            ];
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: "20px" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="totalSales"
                                        name="Vânzări Zilnice"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        activeDot={{ r: 8 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="averageSales"
                                        name="Medie Vânzări Zilnice (zile cu vânzări)"
                                        stroke="#ef4444"
                                        strokeDasharray="5 5"
                                        strokeWidth={1.5}
                                        dot={false}
                                        activeDot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Tendință Vânzări Totale</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[100px] flex items-center justify-center">
                            <p className="text-gray-500">
                                Nu sunt date disponibile pentru tendința
                                vânzărilor.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Supplier Distribution */}
                {supplierData.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Distribuție Intrări pe Furnizori
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Perioada: {timespan.start} - {timespan.end} (Top{" "}
                                {TOP_N_SUPPLIERS} furnizori)
                            </p>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={supplierData}
                                    layout="vertical"
                                    margin={{ left: 20, right: 30 }}
                                >
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
                                        label={{
                                            value: "Valoare Totală (RON)",
                                            position: "insideBottom",
                                            dy: 10,
                                            fill: "#6b7280",
                                            style: { textAnchor: "middle" },
                                        }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="supplier"
                                        width={150}
                                        tick={{ fill: "#6b7280" }}
                                        label={{
                                            value: "Furnizor",
                                            angle: -90,
                                            position: "insideLeft",
                                            dx: -10,
                                            fill: "#6b7280",
                                            style: { textAnchor: "middle" },
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#ffffff",
                                            borderRadius: "8px",
                                            border: "1px solid #e5e7eb",
                                            boxShadow:
                                                "0 2px 4px rgba(0,0,0,0.1)",
                                        }}
                                        itemStyle={{ color: "#1f2937" }}
                                        formatter={(value: number) => [
                                            `${value.toLocaleString("ro-RO", {
                                                style: "currency",
                                                currency: "RON",
                                            })}`,
                                            "Valoare Totală",
                                        ]}
                                    />
                                    <Legend
                                        formatter={() => "Valoare Totală"}
                                    />
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
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Distribuție Intrări pe Furnizori
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[100px] flex items-center justify-center">
                            <p className="text-gray-500">
                                Nu sunt date disponibile pentru distribuția pe
                                furnizori.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Evoluție Stoc, Intrări și Ieșiri - Simplified to Stock Evolution only */}
                {chartData.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Evoluție Sold Stoc</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Afișează soldul stocului la sfârșitul fiecărei
                                zile din perioada selectată.
                            </p>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{
                                        top: 5,
                                        right: 20,
                                        left: 30,
                                        bottom: 5,
                                    }}
                                >
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
                                                stopOpacity={0.7}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0.1}
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
                                    <YAxis
                                        orientation="left"
                                        tick={{ fill: "#6b7280" }}
                                        tickFormatter={(value: number) =>
                                            value.toLocaleString("ro-RO", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })
                                        }
                                        domain={yAxisDomainForStockChart}
                                        allowDataOverflow={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#ffffff",
                                            borderRadius: "8px",
                                            border: "1px solid #e5e7eb",
                                        }}
                                        itemStyle={{ color: "#1f2937" }}
                                        formatter={(
                                            value: number,
                                            name: string
                                        ) => {
                                            if (name === "balance") {
                                                return [
                                                    `${value.toLocaleString(
                                                        "ro-RO",
                                                        {
                                                            style: "currency",
                                                            currency: "RON",
                                                        }
                                                    )}`,
                                                    "Sold Stoc",
                                                ];
                                            }
                                            return [value, name]; // Fallback, though only balance should appear
                                        }}
                                    />
                                    <Legend
                                        formatter={(value) =>
                                            value === "balance"
                                                ? "Sold Stoc"
                                                : value
                                        }
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        name="balance"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorBalance)"
                                        activeDot={{ r: 6 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Evoluție Sold Stoc</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[100px] flex items-center justify-center">
                            <p className="text-gray-500">
                                Nu sunt date disponibile pentru evoluția
                                stocului.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Cumulative Sales/Entries Trend Chart */}
                {cumulativeChartData.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Tendință Cumulativă: Vânzări și Intrări
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Evoluția totalurilor cumulate pentru vânzări și
                                intrări de-a lungul perioadei.
                            </p>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={cumulativeChartData}>
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
                                        formatter={(
                                            value: number,
                                            name: string
                                        ) => [
                                            `${value.toLocaleString("ro-RO", {
                                                style: "currency",
                                                currency: "RON",
                                            })}`,
                                            name === "cumulativeSales"
                                                ? "Vânzări Cumulate"
                                                : "Intrări Cumulate",
                                        ]}
                                    />
                                    <Legend
                                        formatter={(value) =>
                                            value === "cumulativeSales"
                                                ? "Vânzări Cumulate"
                                                : "Intrări Cumulate"
                                        }
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulativeSales"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulativeEntries"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Tendință Cumulativă: Vânzări și Intrări
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[100px] flex items-center justify-center">
                            <p className="text-gray-500">
                                Nu sunt date disponibile pentru tendințele
                                cumulative.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
