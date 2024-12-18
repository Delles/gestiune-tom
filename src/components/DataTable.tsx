import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export interface Column<T> {
    header: string;
    accessor: keyof T;
    align?: "left" | "right";
    formatter?: (value: T[keyof T]) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
}

export function DataTable<T extends object>({
    columns,
    data,
}: DataTableProps<T>) {
    return (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                        {columns.map((column, index) => (
                            <TableHead
                                key={index}
                                className={`
                                    py-4 font-medium text-gray-700
                                    ${
                                        column.align === "right"
                                            ? "text-right"
                                            : ""
                                    }
                                `}
                            >
                                {column.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item, rowIndex) => (
                        <TableRow
                            key={rowIndex}
                            className="hover:bg-gray-50 transition-colors duration-150"
                        >
                            {columns.map((column, cellIndex) => {
                                const value = item[column.accessor];
                                const formattedValue = column.formatter
                                    ? column.formatter(value)
                                    : typeof value === "number"
                                    ? value.toFixed(2)
                                    : String(value);

                                return (
                                    <TableCell
                                        key={cellIndex}
                                        className={`
                                            py-3
                                            ${
                                                column.align === "right"
                                                    ? "text-right"
                                                    : ""
                                            }
                                        `}
                                    >
                                        {formattedValue}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
