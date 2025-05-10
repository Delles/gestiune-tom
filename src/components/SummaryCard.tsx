import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SummaryCardProps {
    label: string;
    value: number;
    icon?: React.ReactNode;
    trend?: "positive" | "negative" | "neutral";
    description?: string;
}

export function SummaryCard({
    label,
    value,
    icon,
    trend = "neutral",
    description,
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
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                    {icon && (
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            {icon}
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-600">
                            {label}
                        </p>
                        {getTrendIcon() && (
                            <div className="mt-1">{getTrendIcon()}</div>
                        )}
                    </div>
                </div>
            </div>
            <div>
                <p className="text-2xl mt-1 font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1">
                    {value.toLocaleString("ro-RO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-sm font-medium text-gray-500">
                        RON
                    </span>
                </p>
                {description && (
                    <p className="text-xs text-gray-500 mt-1 pt-1 border-t border-gray-100">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
