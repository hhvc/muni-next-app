"use client";

import { useAuth } from "@/components/AuthProvider";
import { QR_ADMIN_ROLES } from "@/lib/attendanceRoles";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRPage() {
    const { userRoles } = useAuth();

    const [allowed, setAllowed] = useState(false);
    const [qr, setQr] = useState("");

    useEffect(() => {
        if (!userRoles) return;

        const ok = userRoles.some((r) =>
            QR_ADMIN_ROLES.includes(r)
        );

        setAllowed(ok);
    }, [userRoles]);

    useEffect(() => {
        if (!allowed) return;

        const generateQR = async () => {
            const token = generateMinuteToken();
            const dataUrl = await QRCode.toDataURL(token);
            setQr(dataUrl);
        };

        generateQR();

        const interval = setInterval(generateQR, 60000);

        return () => clearInterval(interval);
    }, [allowed]);

    function generateMinuteToken() {
        const now = new Date();

        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");

        return `CHECKIN|central|${yyyy}${mm}${dd}${hh}${min}`;
    }

    if (!allowed) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger">
                    Sin permisos.
                </div>
            </div>
        );
    }

    return (
        <div className="container text-center py-5">
            <h2>QR Presentismo</h2>

            {qr && <img src={qr} width="320" alt="QR" />}

            <p className="mt-3">Se renueva cada minuto</p>
        </div>
    );
}