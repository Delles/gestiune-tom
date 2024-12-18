import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SummaryCardProps {
    label: string;
    value: number;
    trend?: "positive" | "negative" | "neutral";
}

export function SummaryCard({
    label,
    value,
    trend = "neutral",
}: SummaryCardProps) {
    const getTrendIcon = () => {
        switch (trend) {
            case "positive":
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case "negative":
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Minus className="h-4 w-4 text-gray-400" />;
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-gray-600">{label}</p>
                {getTrendIcon()}
            </div>
            <p className="text-2xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {value.toFixed(2)} RON
            </p>
        </div>
    );
}
