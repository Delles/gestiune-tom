"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ListTodo, Zap } from "lucide-react";

const buttons = [
    {
        icon: PlusCircle,
        text: "Raport Nou",
        color: "default",
        route: "/new-report",
    },
    {
        icon: ListTodo,
        text: "Vezi Rapoarte",
        color: "secondary",
        route: "/reports",
    },
    {
        icon: Zap,
        text: "Raport Automatizat",
        color: "destructive",
        route: "/automate-report",
    },
] as const;

export default function HomePage() {
    return (
        <div className="min-h-screen flex items-center bg-background py-2 px-4">
            <div className="container max-w-3xl mx-auto">
                <Card className="p-4 md:p-6">
                    <CardHeader className="space-y-2 p-0 md:p-2">
                        <CardTitle className="text-2xl md:text-3xl text-center text-primary">
                            Panou de Control
                        </CardTitle>
                        <p className="text-center text-muted-foreground text-sm md:text-base">
                            Raport Zilnic de Gestiune. Selectați o opțiune
                            pentru a începe.
                        </p>
                    </CardHeader>
                    <CardContent className="p-0 md:p-2 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {buttons.map((item, index) => (
                                <Button
                                    key={index}
                                    variant={item.color}
                                    asChild
                                    className="h-auto py-3 flex flex-col items-center hover:scale-102 transition-transform"
                                >
                                    <Link href={item.route}>
                                        <item.icon className="h-5 w-5 mb-1.5" />
                                        <span className="text-sm">
                                            {item.text}
                                        </span>
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
