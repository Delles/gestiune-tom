"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    formatDateKey,
    getRomanianPublicHolidayMap,
} from "@/lib/romanianHolidays";

type CondicaSettings = {
    companyName: string;
    headquarters: string;
    orc: string;
    cui: string;
    employeeName: string;
    month: string;
    startNumber: number;
    arrivalTime: string;
    departureTime: string;
    saturdayArrivalTime: string;
    saturdayDepartureTime: string;
    includeSaturdays: boolean;
    responsibleName: string;
};

type CondicaRow = {
    number: number;
    date: Date;
    dateLabel: string;
    isSaturday: boolean;
};

const storageKey = "condica-settings";

const getCurrentMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
    )}`;
};

const defaultSettings: CondicaSettings = {
    companyName: "",
    headquarters: "",
    orc: "",
    cui: "",
    employeeName: "",
    month: getCurrentMonthValue(),
    startNumber: 1,
    arrivalTime: "08:00",
    departureTime: "16:00",
    saturdayArrivalTime: "08:00",
    saturdayDepartureTime: "16:00",
    includeSaturdays: false,
    responsibleName: "",
};

const getMonthParts = (monthValue: string) => {
    const [year, month] = monthValue.split("-").map(Number);
    return { year, month };
};

const getMonthLabel = (monthValue: string) => {
    const { year, month } = getMonthParts(monthValue);
    return new Date(year, month - 1, 1).toLocaleDateString("ro-RO", {
        month: "long",
        year: "numeric",
    });
};

const getWorkingRows = (settings: CondicaSettings): CondicaRow[] => {
    const { year, month } = getMonthParts(settings.month);
    const daysInMonth = new Date(year, month, 0).getDate();
    const holidays = getRomanianPublicHolidayMap(year);
    const rows: CondicaRow[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day, 12);
        const dayOfWeek = date.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const isHoliday = holidays.has(formatDateKey(date));

        if (isSunday || (!settings.includeSaturdays && isSaturday) || isHoliday) {
            continue;
        }

        rows.push({
            number: settings.startNumber + rows.length,
            date,
            dateLabel: date.toLocaleDateString("ro-RO", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }),
            isSaturday,
        });
    }

    return rows;
};

const getPrintMetrics = (rowCount: number) => {
    if (rowCount >= 26) {
        return {
            padding: "6mm",
            headerLineHeight: "4.3mm",
            headerFontSize: "9pt",
            titleFontSize: "14pt",
            monthFontSize: "9pt",
            tableFontSize: "8.4pt",
            tableHeaderPadding: "1.3mm",
            rowHeight: "6.1mm",
            footerMargin: "3mm",
            footerFontSize: "9.5pt",
        };
    }

    if (rowCount >= 23) {
        return {
            padding: "7mm",
            headerLineHeight: "4.8mm",
            headerFontSize: "9.5pt",
            titleFontSize: "15pt",
            monthFontSize: "9.5pt",
            tableFontSize: "9pt",
            tableHeaderPadding: "1.6mm",
            rowHeight: "6.8mm",
            footerMargin: "4mm",
            footerFontSize: "10pt",
        };
    }

    return {
        padding: "9mm",
        headerLineHeight: "5.4mm",
        headerFontSize: "10pt",
        titleFontSize: "16pt",
        monthFontSize: "10pt",
        tableFontSize: "9.5pt",
        tableHeaderPadding: "2mm",
        rowHeight: "7.8mm",
        footerMargin: "5mm",
        footerFontSize: "11pt",
    };
};

export default function CondicaPage() {
    const [settings, setSettings] = useState<CondicaSettings>(defaultSettings);

    useEffect(() => {
        const savedSettings = window.localStorage.getItem(storageKey);

        if (!savedSettings) {
            return;
        }

        try {
            setSettings({
                ...defaultSettings,
                ...JSON.parse(savedSettings),
            });
        } catch {
            window.localStorage.removeItem(storageKey);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(storageKey, JSON.stringify(settings));
    }, [settings]);

    const rows = useMemo(() => getWorkingRows(settings), [settings]);
    const skippedHolidays = useMemo(() => {
        const { year, month } = getMonthParts(settings.month);
        const holidays = getRomanianPublicHolidayMap(year);

        return Array.from(holidays, ([date, name]) => ({ date, name }))
            .filter((holiday) => Number(holiday.date.split("-")[1]) === month)
            .map((holiday) => ({
                ...holiday,
                dateLabel: new Date(`${holiday.date}T12:00:00`).toLocaleDateString(
                    "ro-RO",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    }
                ),
            }));
    }, [settings.month]);

    const updateSetting = <Key extends keyof CondicaSettings>(
        key: Key,
        value: CondicaSettings[Key]
    ) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            [key]: value,
        }));
    };

    const toggleSaturdays = () => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            includeSaturdays: !currentSettings.includeSaturdays,
            saturdayArrivalTime: currentSettings.includeSaturdays
                ? currentSettings.saturdayArrivalTime
                : currentSettings.arrivalTime,
            saturdayDepartureTime: currentSettings.includeSaturdays
                ? currentSettings.saturdayDepartureTime
                : currentSettings.departureTime,
        }));
    };

    return (
        <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 print:hidden">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-primary">
                            Condica
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Completeaza datele, verifica zilele generate si
                            printeaza formularul pentru semnatura.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4" />
                                Acasa
                            </Link>
                        </Button>
                        <Button type="button" onClick={() => window.print()}>
                            <Printer className="h-4 w-4" />
                            Printeaza
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Date pentru completare
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">
                                        Societatea
                                    </Label>
                                    <Input
                                        id="companyName"
                                        value={settings.companyName}
                                        onChange={(event) =>
                                            updateSetting(
                                                "companyName",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="headquarters">Sediu</Label>
                                    <Input
                                        id="headquarters"
                                        value={settings.headquarters}
                                        onChange={(event) =>
                                            updateSetting(
                                                "headquarters",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="orc">Nr. ORC</Label>
                                    <Input
                                        id="orc"
                                        value={settings.orc}
                                        onChange={(event) =>
                                            updateSetting(
                                                "orc",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cui">
                                        Cod unic de inregistrare
                                    </Label>
                                    <Input
                                        id="cui"
                                        value={settings.cui}
                                        onChange={(event) =>
                                            updateSetting(
                                                "cui",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employeeName">
                                        Nume si prenume salariat
                                    </Label>
                                    <Input
                                        id="employeeName"
                                        value={settings.employeeName}
                                        onChange={(event) =>
                                            updateSetting(
                                                "employeeName",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="responsibleName">
                                        Administrator / HR
                                    </Label>
                                    <Input
                                        id="responsibleName"
                                        value={settings.responsibleName}
                                        onChange={(event) =>
                                            updateSetting(
                                                "responsibleName",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="month">Luna</Label>
                                    <Input
                                        id="month"
                                        type="month"
                                        value={settings.month}
                                        onChange={(event) =>
                                            updateSetting(
                                                "month",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="startNumber">Nr. crt.</Label>
                                    <Input
                                        id="startNumber"
                                        min={1}
                                        type="number"
                                        value={settings.startNumber}
                                        onChange={(event) =>
                                            updateSetting(
                                                "startNumber",
                                                Math.max(
                                                    1,
                                                    Number(event.target.value)
                                                )
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="arrivalTime">
                                        Ora venire
                                    </Label>
                                    <Input
                                        id="arrivalTime"
                                        type="time"
                                        value={settings.arrivalTime}
                                        onChange={(event) =>
                                            updateSetting(
                                                "arrivalTime",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="departureTime">
                                        Ora plecare
                                    </Label>
                                    <Input
                                        id="departureTime"
                                        type="time"
                                        value={settings.departureTime}
                                        onChange={(event) =>
                                            updateSetting(
                                                "departureTime",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={toggleSaturdays}
                                className="flex w-full items-center justify-between rounded-md border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                                aria-pressed={settings.includeSaturdays}
                            >
                                <span className="flex items-center gap-2">
                                    <CalendarPlus className="h-4 w-4" />
                                    Adauga si sambetele
                                </span>
                                <span className="font-medium">
                                    {settings.includeSaturdays ? "Da" : "Nu"}
                                </span>
                            </button>

                            {settings.includeSaturdays && (
                                <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
                                    <div className="col-span-2 text-sm font-medium">
                                        Program sambata
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="saturdayArrivalTime">
                                            Ora venire
                                        </Label>
                                        <Input
                                            id="saturdayArrivalTime"
                                            type="time"
                                            value={settings.saturdayArrivalTime}
                                            onChange={(event) =>
                                                updateSetting(
                                                    "saturdayArrivalTime",
                                                    event.target.value
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="saturdayDepartureTime">
                                            Ora plecare
                                        </Label>
                                        <Input
                                            id="saturdayDepartureTime"
                                            type="time"
                                            value={
                                                settings.saturdayDepartureTime
                                            }
                                            onChange={(event) =>
                                                updateSetting(
                                                    "saturdayDepartureTime",
                                                    event.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="rounded-md border bg-muted/40 p-3 text-sm">
                                <div className="font-medium">
                                    {rows.length} zile in condica pentru{" "}
                                    {getMonthLabel(settings.month)}
                                </div>
                                <p className="mt-1 text-muted-foreground">
                                    Duminicile si sarbatorile legale din
                                    Romania sunt excluse automat.
                                </p>
                                {skippedHolidays.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {skippedHolidays.map((holiday) => (
                                            <div
                                                key={holiday.date}
                                                className="flex justify-between gap-3 text-xs"
                                            >
                                                <span>{holiday.name}</span>
                                                <span>{holiday.dateLabel}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Previzualizare
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-auto rounded-md border bg-white p-4">
                                <CondicaPrint
                                    rows={rows}
                                    settings={settings}
                                    monthLabel={getMonthLabel(settings.month)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="hidden print:block">
                <CondicaPrint
                    rows={rows}
                    settings={settings}
                    monthLabel={getMonthLabel(settings.month)}
                />
            </div>

            <style jsx global>{`
                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                @media print {
                    html,
                    body {
                        height: 297mm;
                        width: 210mm;
                    }

                    body {
                        background: white;
                    }

                    .condica-print {
                        box-sizing: border-box;
                        height: 297mm;
                        overflow: hidden;
                        padding: var(--condica-print-padding);
                    }

                    .condica-company-lines {
                        font-size: var(--condica-header-font-size);
                        line-height: var(--condica-header-line-height);
                    }

                    .condica-title {
                        font-size: var(--condica-title-font-size);
                        line-height: 1.05;
                    }

                    .condica-month {
                        font-size: var(--condica-month-font-size);
                        line-height: 1.1;
                    }

                    .condica-table {
                        font-size: var(--condica-table-font-size);
                    }

                    .condica-table th {
                        padding-bottom: var(--condica-table-header-padding);
                        padding-top: var(--condica-table-header-padding);
                    }

                    .condica-table th,
                    .condica-table td {
                        line-height: 1.05;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .condica-table tbody tr {
                        height: var(--condica-row-height);
                    }

                    .condica-footer {
                        font-size: var(--condica-footer-font-size);
                        margin-top: var(--condica-footer-margin);
                    }
                }
            `}</style>
        </div>
    );
}

function CondicaPrint({
    rows,
    settings,
    monthLabel,
}: {
    rows: CondicaRow[];
    settings: CondicaSettings;
    monthLabel: string;
}) {
    const printMetrics = getPrintMetrics(rows.length);
    const printStyle = {
        "--condica-print-padding": printMetrics.padding,
        "--condica-header-line-height": printMetrics.headerLineHeight,
        "--condica-header-font-size": printMetrics.headerFontSize,
        "--condica-title-font-size": printMetrics.titleFontSize,
        "--condica-month-font-size": printMetrics.monthFontSize,
        "--condica-table-font-size": printMetrics.tableFontSize,
        "--condica-table-header-padding": printMetrics.tableHeaderPadding,
        "--condica-row-height": printMetrics.rowHeight,
        "--condica-footer-margin": printMetrics.footerMargin,
        "--condica-footer-font-size": printMetrics.footerFontSize,
    } as CSSProperties;

    return (
        <section
            className="condica-print mx-auto min-w-[760px] max-w-[820px] bg-white p-4 text-black print:min-w-0 print:max-w-none"
            style={printStyle}
        >
            <div className="condica-company-lines mb-2 max-w-[500px] text-sm leading-6">
                <PrintableLine label="Societatea" value={settings.companyName} />
                <PrintableLine label="Sediu" value={settings.headquarters} />
                <PrintableLine label="Nr. ORC" value={settings.orc} />
                <PrintableLine
                    label="Cod unic de inregistrare"
                    value={settings.cui}
                />
            </div>

            <h2 className="condica-title mb-1 text-center text-xl font-bold uppercase">
                Condica de prezenta zilnica
            </h2>
            <p className="condica-month mb-2 text-center text-sm font-medium capitalize">
                {monthLabel}
            </p>

            <table className="condica-table w-full border-collapse text-center text-sm">
                <thead>
                    <tr>
                        <th className="w-[44px] border-2 border-black px-1 py-2" rowSpan={2}>
                            Nr.
                            <br />
                            Crt.
                        </th>
                        <th className="w-[92px] border-2 border-black px-1 py-2" rowSpan={2}>
                            Data
                        </th>
                        <th className="border-2 border-black px-2 py-2" rowSpan={2}>
                            Nume si prenume
                            <br />
                            salariat
                        </th>
                        <th className="border-2 border-black px-2 py-2" colSpan={4}>
                            Semnatura salariat
                        </th>
                    </tr>
                    <tr>
                        <th className="w-[132px] border-2 border-black px-1 py-2">
                            La venire
                        </th>
                        <th className="w-[58px] border-2 border-black px-1 py-2">
                            Ora
                        </th>
                        <th className="w-[132px] border-2 border-black px-1 py-2">
                            La plecare
                        </th>
                        <th className="w-[58px] border-2 border-black px-1 py-2">
                            Ora
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={`${row.number}-${row.dateLabel}`}
                            className="h-9"
                        >
                            <td className="border-2 border-black px-1">
                                {row.number}
                            </td>
                            <td className="border-2 border-black px-1">
                                {row.dateLabel}
                            </td>
                            <td className="border-2 border-black px-2 text-left">
                                {settings.employeeName}
                            </td>
                            <td className="border-2 border-black" />
                            <td className="border-2 border-black px-1">
                                {row.isSaturday
                                    ? settings.saturdayArrivalTime
                                    : settings.arrivalTime}
                            </td>
                            <td className="border-2 border-black" />
                            <td className="border-2 border-black px-1">
                                {row.isSaturday
                                    ? settings.saturdayDepartureTime
                                    : settings.departureTime}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr className="h-12">
                            <td className="border-2 border-black px-2" colSpan={7}>
                                Nu exista zile lucratoare pentru luna selectata.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="condica-footer mt-5 flex items-end gap-3 text-sm font-bold">
                <span>Administrator/Responsabil Resurse Umane,</span>
                <span className="min-w-[220px] border-b border-dotted border-black px-2 text-center font-normal">
                    {settings.responsibleName}
                </span>
            </div>
        </section>
    );
}

function PrintableLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex">
            <span className="font-bold">{label}:</span>
            <span className="ml-1 flex-1 border-b border-dotted border-black px-1">
                {value}
            </span>
        </div>
    );
}
