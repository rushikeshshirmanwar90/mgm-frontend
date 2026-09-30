import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export const TOKEN_KEY = "mgm_token";
export const USER_KEY = "mgm_user";

// ─── API Config ───────────────────────────────────────────────────────────────
// Set USE_LOCAL to true  → uses your local backend (localhost:3000)
// Set USE_LOCAL to false → uses the deployed production API
const USE_LOCAL = false;

const LOCAL_API_URL = "http://0.0.0.0:3000/api";
const DEPLOYED_API_URL = "https://mgm-backend-six.vercel.app/api"; // 🔁 replace with your real deployed URL

export const BASE_URL = USE_LOCAL ? LOCAL_API_URL : DEPLOYED_API_URL;
// ──────────────────────────────────────────────────────────────────────────────

export async function getAuthToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

/** Thrown for any non-2xx response, carrying the HTTP status for callers. */
export class ApiError extends Error {
    status: number;
    payload: Record<string, unknown>;

    constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
    }
}

/**
 * Calls the backend and returns the parsed JSON body.
 *
 * Pass the expected shape as `T` (see the `*Response` types in lib/types) so
 * callers get real field checking instead of poking at an untyped object.
 */
export async function apiRequest<T = Record<string, unknown>>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[MGM API Error] Failed to fetch ${BASE_URL}${endpoint}:`, msg);
        throw new ApiError(
            `Cannot reach the server at ${BASE_URL}${endpoint}. Check that mgm-backend is running ("npm run dev") and that EXPO_PUBLIC_API_URL is reachable.`,
            0
        );
    }

    // Errors from a proxy or a crash may not be JSON at all.
    let data: Record<string, unknown> = {};
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text.slice(0, 200) };
        }
    }

    if (!response.ok) {
        throw new ApiError(
            (data.error as string) || `Request failed (HTTP ${response.status})`,
            response.status,
            data
        );
    }

    return data as T;
}


const CLOUDINARY_CLOUD_NAME = "dlcq8i2sc";
const CLOUDINARY_UPLOAD_PRESET = "realEstate";

/** Converts any image URI (file://, content://, blob:) to a base64 Data URI */
async function uriToDataUri(uri: string): Promise<string> {
    if (uri.startsWith("data:")) return uri;
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

    // On native mobile (Android/iOS), read directly from local file:// or content:// via FileSystem
    if (Platform.OS !== "web") {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const ext = uri.split(".").pop()?.toLowerCase();
            const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            return `data:${mime};base64,${base64}`;
        } catch (fsErr) {
            console.warn("[MGM API] FileSystem read failed, attempting fetch fallback:", fsErr);
        }
    }

    // On Web or fallback
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("FileReader failed to convert image to Data URI"));
            }
        };
        reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
        reader.readAsDataURL(blob);
    });
}

/**
 * Uploads an image (Data URI or local file URI) to Cloudinary and returns the hosted URL.
 *
 * Uses JSON body with Base64 Data URI to prevent React Native / Expo
 * "Unsupported FormDataPart implementation" errors across all native platforms and web.
 */
export async function uploadImageToCloudinary(imageInput: string): Promise<string> {
    if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
        return imageInput;
    }

    const dataUri = await uriToDataUri(imageInput);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                file: dataUri,
                upload_preset: CLOUDINARY_UPLOAD_PRESET,
            }),
        }
    );

    if (!res.ok) {
        let message = "Cloudinary upload failed";
        try {
            const errData = await res.json();
            message = errData?.error?.message || message;
        } catch {
            // Keep the generic message.
        }
        throw new Error(message);
    }

    const data = await res.json();
    return data.secure_url;
}