import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/lib/types";
import { ApiError, apiRequest, TOKEN_KEY, USER_KEY } from "@/lib/api";

interface RegisterResult {
    email: string;
    emailSent: boolean;
    otp?: string;
    message: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (data: Record<string, unknown>) => Promise<RegisterResult>;
    verifyOTP: (email: string, otp: string) => Promise<Record<string, unknown>>;
    resendOTP: (email: string) => Promise<Record<string, unknown>>;
    logout: () => Promise<void>;
    seedDatabase: () => Promise<Record<string, unknown>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        setUser(null);
        setToken(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }, []);

    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const [[, storedToken], [, storedUser]] = await AsyncStorage.multiGet([
                    TOKEN_KEY,
                    USER_KEY,
                ]);

                if (!storedToken || !storedUser) return;

                setToken(storedToken);
                setUser(JSON.parse(storedUser));

                // Re-validate against the server. This is what picks up a role
                // change or a revoked approval that happened while the (7-day)
                // token was still technically valid.
                try {
                    const data = await apiRequest("/auth/me");
                    if (data.user) {
                        setUser(data.user as User);
                        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
                    }
                } catch (e) {
                    // 401 = token invalid/expired, 403 = access revoked. Either
                    // way the session is over. A network blip (status 0) should
                    // NOT sign the user out — keep the cached session so the app
                    // still opens offline.
                    if (e instanceof ApiError && e.status !== 0) {
                        await logout();
                    }
                }
            } catch (e) {
                console.error("Error loading auth", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadStoredAuth();
    }, [logout]);

    const login = async (email: string, password: string): Promise<User> => {
        const data = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        if (data.token && data.user) {
            setToken(data.token as string);
            setUser(data.user as User);
            await AsyncStorage.multiSet([
                [TOKEN_KEY, data.token as string],
                [USER_KEY, JSON.stringify(data.user)],
            ]);
        }
        return data.user as User;
    };

    const register = async (formData: Record<string, unknown>) => {
        const data = await apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify(formData),
        });
        return data as unknown as RegisterResult;
    };

    const verifyOTP = async (email: string, otp: string) =>
        apiRequest("/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ email, otp }),
        });

    const resendOTP = async (email: string) =>
        apiRequest("/auth/resend-otp", {
            method: "POST",
            body: JSON.stringify({ email }),
        });

    const seedDatabase = async () => apiRequest("/seed", { method: "POST" });

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                register,
                verifyOTP,
                resendOTP,
                logout,
                seedDatabase,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
