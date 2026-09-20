import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const TOKEN_KEY = "mgm_token";
export const USER_KEY = "mgm_user";

function resolveBaseUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL;
    if (fromEnv) {
        return `${fromEnv.replace(/\/+$/, "")}/api`;
    }

    const port = process.env.EXPO_PUBLIC_API_PORT || "3000";

    if (Platform.OS !== "web") {
        // e.g. "192.168.1.42:8081" while running `expo start`.
        const hostUri =
            Constants.expoConfig?.hostUri ??
            (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
        const lanHost = hostUri?.split(":")[0];

        if (lanHost && lanHost !== "localhost" && lanHost !== "127.0.0.1") {
            return `http://${lanHost}:${port}/api`;
        }

        if (Platform.OS === "android") {
            return `http://10.0.2.2:${port}/api`;
        }
    }

    return `http://localhost:${port}/api`;
}

export const BASE_URL = resolveBaseUrl();

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
    } catch {
        // A network-level failure is by far the most common setup problem, so
        // name the address we tried rather than surfacing "Network request
        // failed" with no context.
        throw new ApiError(
            `Cannot reach the server at ${BASE_URL}. Check that the backend is running and that EXPO_PUBLIC_API_URL is correct.`,
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

// ---- Cloudinary ----
// Written straight into the source, the same way the real-estate project does it
// (components/functions/image-handling.tsx and the Xsite material/bill-upload
// route there both hardcode this cloud and preset).
//
// Nothing is given away by that. The preset is an UNSIGNED one, which is exactly
// what makes it publishable — the API secret is never used by the app. And these
// were EXPO_PUBLIC_* values before, which Expo inlines into the JS bundle at
// build time regardless, so the .env indirection bought no secrecy at all — only
// a setup step that had never been done (there was no .env here, so photo
// uploads were silently disabled).
const CLOUDINARY_CLOUD_NAME = "dlcq8i2sc";
const CLOUDINARY_UPLOAD_PRESET = "realEstate";

/**
 * Uploads a local image URI to Cloudinary and returns the hosted URL.
 *
 * Targets the cloud and unsigned preset configured at the top of this file.
 */
export async function uploadImageToCloudinary(uri: string): Promise<string> {
    const formData = new FormData();

    if (Platform.OS === "web") {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("file", blob, "photo.jpg");
    } else {
        formData.append("file", {
            uri,
            type: "image/jpeg",
            name: "photo.jpg",
        } as unknown as Blob);
    }

    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
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
