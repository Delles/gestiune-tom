import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Raport Gestiune - Tavimar",
    description: "Sistem de raportare pentru gestiune Tavimar",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ro">
            <body className="font-sans antialiased">{children}</body>
        </html>
    );
}
