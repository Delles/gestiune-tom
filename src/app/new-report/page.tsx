"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Entry, SaleEntry, ReportData } from "@/types/reportTypes";
import { generateReportPDF } from "@/lib/generatePDF";
import { format } from "date-fns";

export default function DailyManagementReport() {
    const router = useRouter();
    const [date, setDate] = useState<Date>(new Date());
    const [companyName, setCompanyName] = useState("");
    const [entries, setEntries] = useState<Entry[]>([]);
    const [sales, setSales] = useState<SaleEntry[]>([]);
    const [previousBalance, setPreviousBalance] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");

    const addEntry = (type: "entries" | "sales") => {
        if (type === "entries") {
            setEntries([
                ...entries,
                {
                    id: Date.now(),
                    documentNumber: "",
                    explanation: "",
                    merchandiseValue: 0,
                },
            ]);
        } else {
            setSales([
                ...sales,
                {
                    id: Date.now(),
                    documentNumber: "",
                    explanation: "",
                    merchandiseValue: 0,
                    cashValue: 0,
                    cardValue: 0,
                },
            ]);
        }
    };

    const updateEntry = (
        id: number,
        field: keyof Entry | keyof SaleEntry,
        value: string | number,
        type: "entries" | "sales"
    ) => {
        if (type === "entries") {
            setEntries(
                entries.map((entry) =>
                    entry.id === id ? { ...entry, [field]: value } : entry
                )
            );
        } else {
            setSales(
                sales.map((sale) => {
                    if (sale.id === id) {
                        const updatedSale = { ...sale, [field]: value };
                        if (field === "cashValue" || field === "cardValue") {
                            updatedSale.merchandiseValue =
                                updatedSale.cashValue + updatedSale.cardValue;
                        } else if (field === "merchandiseValue") {
                            const diff = Number(value) - sale.merchandiseValue;
                            updatedSale.cashValue += diff / 2;
                            updatedSale.cardValue += diff / 2;
                        }
                        return updatedSale;
                    }
                    return sale;
                })
            );
        }
    };

    const removeEntry = (id: number, type: "entries" | "sales") => {
        if (type === "entries") {
            setEntries(entries.filter((entry) => entry.id !== id));
        } else {
            setSales(sales.filter((sale) => sale.id !== id));
        }
    };

    const calculateTotal = (items: Entry[] | SaleEntry[]) => {
        return items.reduce((sum, item) => sum + item.merchandiseValue, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const reportData: ReportData = {
                date,
                companyName,
                previousBalance,
                entries,
                sales,
            };

            const pdfBlob = await generateReportPDF(reportData);

            if (window.showSaveFilePicker) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `raport_${format(date, "dd_MM_yyyy")}.pdf`,
                    types: [
                        {
                            description: "PDF Document",
                            accept: { "application/pdf": [".pdf"] },
                        },
                    ],
                });

                const writableStream = await fileHandle.createWritable();
                await writableStream.write(pdfBlob);
                await writableStream.close();

                setDialogMessage("Raportul a fost salvat cu succes!");
                setDialogOpen(true);
            } else {
                setDialogMessage(
                    "Funcția de salvare nu este suportată în acest browser."
                );
                setDialogOpen(true);
            }
        } catch (error) {
            console.error("Error generating PDF:", error);
            setDialogMessage("A apărut o eroare la generarea raportului.");
            setDialogOpen(true);
        }
    };

    const handlePreview = async () => {
        try {
            const reportData: ReportData = {
                date,
                companyName,
                previousBalance,
                entries,
                sales,
            };

            const pdfBlob = await generateReportPDF(reportData);

            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, "_blank");

            setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
        } catch (error) {
            console.error("Error generating PDF preview:", error);
            setDialogMessage("A apărut o eroare la generarea previzualizării.");
            setDialogOpen(true);
        }
    };

    return (
        <div className="container py-2 sm:py-6">
            <Card className="max-w-[calc(100vw-2rem)] sm:max-w-7xl mx-auto">
                <CardHeader className="px-2 sm:px-6">
                    <CardTitle className="text-xl sm:text-2xl text-center">
                        Raport de Gestiune Zilnic
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Data</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date.toISOString().split("T")[0]}
                                    onChange={(e) =>
                                        setDate(new Date(e.target.value))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Unitatea</Label>
                                <Input
                                    id="company"
                                    value={companyName}
                                    onChange={(e) =>
                                        setCompanyName(e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">
                                    Intrări
                                </h3>
                                <div className="mb-4">
                                    <Label htmlFor="previousBalance">
                                        Sold Precedent
                                    </Label>
                                    <Input
                                        id="previousBalance"
                                        type="number"
                                        value={previousBalance}
                                        onChange={(e) =>
                                            setPreviousBalance(
                                                Number(e.target.value)
                                            )
                                        }
                                        className="w-[200px]"
                                    />
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="hidden sm:table-header-group">
                                            <TableRow>
                                                <TableHead className="w-[60px]">
                                                    Nr.
                                                </TableHead>
                                                <TableHead>Document</TableHead>
                                                <TableHead>
                                                    Explicații
                                                </TableHead>
                                                <TableHead>Valoare</TableHead>
                                                <TableHead className="w-[60px]">
                                                    Acțiuni
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((entry, index) => (
                                                <React.Fragment key={entry.id}>
                                                    <TableRow className="hidden sm:table-row">
                                                        <TableCell className="font-medium">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={
                                                                    entry.documentNumber
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        entry.id,
                                                                        "documentNumber",
                                                                        e.target
                                                                            .value,
                                                                        "entries"
                                                                    )
                                                                }
                                                                className="w-full"
                                                                placeholder="Document"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Input
                                                                value={
                                                                    entry.explanation
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        entry.id,
                                                                        "explanation",
                                                                        e.target
                                                                            .value,
                                                                        "entries"
                                                                    )
                                                                }
                                                                className="w-full"
                                                                placeholder="Explicații"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Input
                                                                type="number"
                                                                value={
                                                                    entry.merchandiseValue
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        entry.id,
                                                                        "merchandiseValue",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ),
                                                                        "entries"
                                                                    )
                                                                }
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    removeEntry(
                                                                        entry.id,
                                                                        "entries"
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow className="sm:hidden">
                                                        <TableCell colSpan={4}>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Document
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            entry.documentNumber
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updateEntry(
                                                                                entry.id,
                                                                                "documentNumber",
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                                "entries"
                                                                            )
                                                                        }
                                                                        className="w-full"
                                                                        placeholder="Document"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Explicații
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            entry.explanation
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updateEntry(
                                                                                entry.id,
                                                                                "explanation",
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                                "entries"
                                                                            )
                                                                        }
                                                                        className="w-full"
                                                                        placeholder="Explicații"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Valoare
                                                                    </Label>
                                                                    <div className="flex gap-2">
                                                                        <Input
                                                                            type="number"
                                                                            value={
                                                                                entry.merchandiseValue
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                updateEntry(
                                                                                    entry.id,
                                                                                    "merchandiseValue",
                                                                                    Number(
                                                                                        e
                                                                                            .target
                                                                                            .value
                                                                                    ),
                                                                                    "entries"
                                                                                )
                                                                            }
                                                                            className="w-full"
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                removeEntry(
                                                                                    entry.id,
                                                                                    "entries"
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => addEntry("entries")}
                                    className="mt-4"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adaugă intrare
                                </Button>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">
                                    Vânzări + Ieșiri
                                </h3>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="hidden sm:table-header-group">
                                            <TableRow>
                                                <TableHead className="w-[60px]">
                                                    Nr.
                                                </TableHead>
                                                <TableHead>Document</TableHead>
                                                <TableHead>
                                                    Explicații
                                                </TableHead>
                                                <TableHead>Valoare</TableHead>
                                                <TableHead>Numerar</TableHead>
                                                <TableHead>Card</TableHead>
                                                <TableHead className="w-[60px]">
                                                    Acțiuni
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sales.map((sale, index) => (
                                                <React.Fragment key={sale.id}>
                                                    <TableRow className="hidden sm:table-row">
                                                        <TableCell className="font-medium">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={
                                                                    sale.documentNumber
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        sale.id,
                                                                        "documentNumber",
                                                                        e.target
                                                                            .value,
                                                                        "sales"
                                                                    )
                                                                }
                                                                className="w-full"
                                                                placeholder="Document"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Input
                                                                value={
                                                                    sale.explanation
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        sale.id,
                                                                        "explanation",
                                                                        e.target
                                                                            .value,
                                                                        "sales"
                                                                    )
                                                                }
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Input
                                                                type="number"
                                                                value={
                                                                    sale.merchandiseValue
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        sale.id,
                                                                        "merchandiseValue",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ),
                                                                        "sales"
                                                                    )
                                                                }
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Input
                                                                type="number"
                                                                value={
                                                                    sale.cashValue
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        sale.id,
                                                                        "cashValue",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ),
                                                                        "sales"
                                                                    )
                                                                }
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Input
                                                                type="number"
                                                                value={
                                                                    sale.cardValue
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        sale.id,
                                                                        "cardValue",
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ),
                                                                        "sales"
                                                                    )
                                                                }
                                                                className="w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    removeEntry(
                                                                        sale.id,
                                                                        "sales"
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow className="sm:hidden">
                                                        <TableCell colSpan={6}>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Document
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            sale.documentNumber
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updateEntry(
                                                                                sale.id,
                                                                                "documentNumber",
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                                "sales"
                                                                            )
                                                                        }
                                                                        className="w-full"
                                                                        placeholder="Document"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Explicații
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            sale.explanation
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updateEntry(
                                                                                sale.id,
                                                                                "explanation",
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                                "sales"
                                                                            )
                                                                        }
                                                                        className="w-full"
                                                                        placeholder="Explicații"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Valoare
                                                                    </Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={
                                                                            sale.merchandiseValue
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updateEntry(
                                                                                sale.id,
                                                                                "merchandiseValue",
                                                                                Number(
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                ),
                                                                                "sales"
                                                                            )
                                                                        }
                                                                        className="w-full"
                                                                        placeholder="Valoare"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Numerar
                                                                    </Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={
                                                                            sale.cashValue
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            updateEntry(
                                                                                sale.id,
                                                                                "cashValue",
                                                                                Number(
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                ),
                                                                                "sales"
                                                                            )
                                                                        }
                                                                        className="w-full"
                                                                        placeholder="Numerar"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="mb-2 block">
                                                                        Card
                                                                    </Label>
                                                                    <div className="flex gap-2">
                                                                        <Input
                                                                            type="number"
                                                                            value={
                                                                                sale.cardValue
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                updateEntry(
                                                                                    sale.id,
                                                                                    "cardValue",
                                                                                    Number(
                                                                                        e
                                                                                            .target
                                                                                            .value
                                                                                    ),
                                                                                    "sales"
                                                                                )
                                                                            }
                                                                            className="w-full"
                                                                            placeholder="Card"
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                removeEntry(
                                                                                    sale.id,
                                                                                    "sales"
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => addEntry("sales")}
                                    className="mt-4"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adaugă vânzare/ieșire
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-muted-foreground">
                                            Total Intrări + Sold
                                        </p>
                                        <h3 className="text-2xl font-bold">
                                            {(
                                                previousBalance +
                                                calculateTotal(entries)
                                            ).toFixed(2)}{" "}
                                            RON
                                        </h3>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-muted-foreground">
                                            Total Vânzări + Ieșiri
                                        </p>
                                        <h3 className="text-2xl font-bold">
                                            {calculateTotal(sales).toFixed(2)}{" "}
                                            RON
                                        </h3>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-muted-foreground">
                                            Sold Final
                                        </p>
                                        <h3 className="text-2xl font-bold">
                                            {(
                                                previousBalance +
                                                calculateTotal(entries) -
                                                calculateTotal(sales)
                                            ).toFixed(2)}{" "}
                                            RON
                                        </h3>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    type="submit"
                                    className="w-full sm:w-auto"
                                >
                                    Salvează Raportul
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handlePreview}
                                    className="w-full sm:w-auto"
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Previzualizare PDF
                                </Button>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/")}
                                className="w-full sm:w-auto"
                            >
                                Închide Raportul
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Notificare</DialogTitle>
                        <DialogDescription>{dialogMessage}</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
}
