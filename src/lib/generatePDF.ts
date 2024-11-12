import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { ReportData } from "@/types/reportTypes";
import { format } from "date-fns";

// Define types for jsPDF with autoTable
interface AutoTableCell {
    content: string | number;
    styles?: {
        fontStyle?: string;
        fillColor?: [number, number, number];
    };
}

interface AutoTableOptions {
    startY: number;
    head: (
        | string
        | {
              content: string;
              colSpan?: number;
              rowSpan?: number;
          }
    )[][];
    body: (string | number | AutoTableCell)[][];
    foot?: (string | number)[][];
    headStyles?: {
        fillColor: [number, number, number];
        textColor: number;
        halign: "left" | "center" | "right";
        font?: string;
        valign?: "top" | "middle" | "bottom";
    };
    alternateRowStyles?: {
        fillColor: [number, number, number];
    };
    footStyles?: {
        fillColor: [number, number, number];
        textColor: number;
        font?: string;
    };
    margin?: {
        top: number;
    };
    styles?: {
        font?: string;
        cellPadding?: number;
        fontSize?: number;
    };
    columnStyles?: {
        [key: number]: {
            cellWidth?: number;
            halign?: "left" | "center" | "right";
        };
    };
    tableWidth?: number;
    didDrawCell?: (data: CellHookData) => void;
    tableLineColor?: [number, number, number];
    tableLineWidth?: number;
}

// Extend jsPDF type to include autoTable
interface JsPDFWithAutoTable extends jsPDF {
    autoTable: (options: AutoTableOptions) => void;
    lastAutoTable: {
        finalY: number;
    };
}

const formatNumber = (value: number): string => {
    return value.toLocaleString("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Add this interface for cell hooks
interface CellHookData {
    doc: jsPDF;
    cell: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    section: "head" | "body" | "foot";
}

// Add table border drawing function
const drawTableBorders = (data: CellHookData) => {
    const doc = data.doc as jsPDF;
    const cell = data.cell;

    if (data.section === "head" || data.section === "body") {
        doc.setDrawColor(200);
        doc.line(cell.x, cell.y, cell.x + cell.width, cell.y); // Top
        doc.line(
            cell.x,
            cell.y + cell.height,
            cell.x + cell.width,
            cell.y + cell.height
        ); // Bottom
        doc.line(cell.x, cell.y, cell.x, cell.y + cell.height); // Left
        doc.line(
            cell.x + cell.width,
            cell.y,
            cell.x + cell.width,
            cell.y + cell.height
        ); // Right
    }
};

// Add tableWidth constant at the top of the file
const tableWidth = 170;

export const generateReportPDF = async (data: ReportData): Promise<Blob> => {
    // Cast doc as JsPDFWithAutoTable to get proper typing
    const doc = new jsPDF({
        putOnlyUsedFonts: true,
        orientation: "portrait",
    }) as JsPDFWithAutoTable;

    await doc.addFont(
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf",
        "Roboto",
        "normal"
    );
    doc.setFont("Roboto");

    // Title
    doc.setFontSize(18);
    doc.text("Raport de Gestiune Zilnic", 105, 20, { align: "center" });

    // Header information
    doc.setFontSize(10);
    doc.text(`Data: ${format(data.date, "dd.MM.yyyy")}`, 20, 40);
    doc.text(`Unitatea: ${data.companyName}`, 20, 45);

    // Previous balance section with lighter gray
    const previousBalanceY = 65;
    doc.setFillColor(230, 230, 230);
    doc.rect(15, previousBalanceY - 5, 170, 10, "F");
    doc.setFontSize(12);
    doc.text("Sold Precedent:", 20, previousBalanceY);
    doc.text(
        `${formatNumber(data.previousBalance)} RON`,
        180,
        previousBalanceY,
        { align: "right" }
    );

    let currentY = previousBalanceY + 15;

    // Calculate totals
    const entriesTotal = data.entries.reduce(
        (sum, entry) => sum + entry.merchandiseValue,
        0
    );
    const salesTotal = {
        total: data.sales.reduce((sum, sale) => sum + sale.merchandiseValue, 0),
        cash: data.sales.reduce((sum, sale) => sum + sale.cashValue, 0),
        card: data.sales.reduce((sum, sale) => sum + sale.cardValue, 0),
    };

    // Update common styles
    const commonStyles = {
        headStyles: {
            fillColor: [80, 80, 80] as [number, number, number],
            textColor: 255,
            font: "Roboto",
            halign: "center" as const,
            valign: "middle" as const,
        },
        bodyStyles: {
            font: "Roboto",
            textColor: [0, 0, 0] as [number, number, number],
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240] as [number, number, number],
        },
        tableLineColor: [150, 150, 150] as [number, number, number],
        tableLineWidth: 0.1,
        styles: {
            cellPadding: 2,
            fontSize: 8,
        },
    };

    // Entries table
    doc.setFontSize(12);
    doc.text("Intrări", 20, currentY);
    currentY += 5;

    // Update entries table structure
    doc.autoTable({
        startY: currentY,
        head: [["Nr.", "Document", "Explicații", "Valoare Mărfuri"]],
        body:
            data.entries.length > 0
                ? [
                      ...data.entries.map((entry, index) => [
                          index + 1,
                          entry.documentNumber,
                          entry.explanation,
                          formatNumber(entry.merchandiseValue),
                      ]),
                      ["", "Total", "", formatNumber(entriesTotal)],
                  ]
                : [["", "", "Nu există intrări", ""]],
        ...commonStyles,
        columnStyles: {
            0: { cellWidth: tableWidth * 0.05 },
            1: { cellWidth: tableWidth * 0.15 },
            2: { cellWidth: tableWidth * 0.5 },
            3: { cellWidth: tableWidth * 0.3, halign: "right" },
        },
        didDrawCell: drawTableBorders,
        tableWidth: 170,
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // Sales table
    doc.text("Vânzări + Ieșiri", 20, currentY);
    currentY += 5;

    // Update sales table structure
    doc.autoTable({
        startY: currentY,
        head: [
            [
                { content: "Nr.", rowSpan: 2 },
                { content: "Document", rowSpan: 2 },
                { content: "Explicații", rowSpan: 2 },
                { content: "Valoare Mărfuri", colSpan: 3 },
            ],
            ["Numerar", "Card", "Total"],
        ],
        body:
            data.sales.length > 0
                ? [
                      ...data.sales.map((sale, index) => [
                          index + 1,
                          sale.documentNumber,
                          sale.explanation,
                          formatNumber(sale.cashValue),
                          formatNumber(sale.cardValue),
                          formatNumber(sale.cashValue + sale.cardValue),
                      ]),
                      [
                          "",
                          "Total",
                          "",
                          formatNumber(salesTotal.cash),
                          formatNumber(salesTotal.card),
                          formatNumber(salesTotal.total),
                      ],
                  ]
                : [["", "", "Nu există vânzări sau ieșiri", "", "", ""]],
        ...commonStyles,
        columnStyles: {
            0: { cellWidth: tableWidth * 0.05 },
            1: { cellWidth: tableWidth * 0.15 },
            2: { cellWidth: tableWidth * 0.5 },
            3: { cellWidth: tableWidth * 0.1, halign: "right" },
            4: { cellWidth: tableWidth * 0.1, halign: "right" },
            5: { cellWidth: tableWidth * 0.1, halign: "right" },
        },
        didDrawCell: drawTableBorders,
        tableWidth: 170,
    });

    // Add Financial Summary section
    currentY = doc.lastAutoTable.finalY + 15;
    doc.text("Sumar Financiar", 20, currentY);
    currentY += 5;

    const finalBalance = data.previousBalance + entriesTotal - salesTotal.total;

    // Update Financial Summary table
    doc.autoTable({
        startY: currentY,
        head: [["Descriere", "Valoare (RON)"]],
        body: [
            ["Sold Precedent", formatNumber(data.previousBalance)],
            ["Total Intrări", formatNumber(entriesTotal)],
            ["Total Vânzări + Ieșiri", formatNumber(salesTotal.total)],
            [
                "Sold Final",
                {
                    content: formatNumber(finalBalance),
                    styles: {
                        fillColor: [200, 200, 200], // Light gray for final balance
                        fontStyle: "bold",
                    },
                },
            ],
        ],
        ...commonStyles,
    });

    // Add verification line
    currentY = doc.lastAutoTable.finalY + 30;
    doc.text("Verificat:_______________", 180, currentY, {
        align: "right",
    });

    // Return the PDF as a Blob
    return doc.output("blob");
};
