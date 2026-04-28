// src\components\AppCheckProvider.tsx

"use client";

import { useEffect } from "react";
import { initAppCheck } from "@/lib/firebaseAppCheck";

export default function AppCheckProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        initAppCheck();
    }, []);

    return <>{children}</>;
}