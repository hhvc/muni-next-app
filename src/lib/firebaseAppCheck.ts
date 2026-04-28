// src/lib/firebaseAppCheck.ts
import {
    initializeAppCheck,
    ReCaptchaV3Provider,
    getToken,
    AppCheck,
} from "firebase/app-check";
import { app } from "../firebase/clientApp";

const RECAPTCHA_SITE_KEY = "6LdTic0sAAAAALk9LHokzfkahKDcFSSP40_9hRtf";

let appCheckInstance: AppCheck | null = null;

/**
 * Inicializa App Check. 
 * Se debe llamar desde un useEffect en el cliente (AppCheckProvider).
 */
export async function initAppCheck(): Promise<AppCheck | null> {
    if (typeof window === "undefined") return null;
    if (appCheckInstance) return appCheckInstance;

    const isEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";

    // ✅ HABILITAR MODO DEBUG EN DESARROLLO
    // Esto permite que el portero (App Check) te deje pasar desde localhost.
    if (process.env.NODE_ENV !== "production" || isEmulator) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        console.log("📱 App Check: Modo Debug activado localmente.");
    }

    try {
        appCheckInstance = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true,
        });

        console.log("✅ App Check inicializado correctamente.");
        return appCheckInstance;
    } catch (error) {
        console.error("❌ Error inicializando App Check:", error);
        return null;
    }
}

/**
 * Obtiene el token actual de App Check. 
 * Útil para adjuntarlo manualmente a peticiones HTTP si fuera necesario.
 */
export async function getAppCheckToken(): Promise<string | null> {
    if (!appCheckInstance) {
        // Intentamos inicializar si no existe
        await initAppCheck();
    }

    if (!appCheckInstance) return null;

    try {
        const tokenResult = await getToken(appCheckInstance, false);
        return tokenResult.token;
    } catch (error) {
        console.error("❌ Error obteniendo token de App Check:", error);
        return null;
    }
}

export { appCheckInstance };