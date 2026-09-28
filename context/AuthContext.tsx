import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/lib/types";
import { ApiError, apiRequest, TOKEN_KEY, USER_KEY } from "@/lib/api";

interface RegisterResult {
    email: string;
    message: string;
    requiresApproval?: boolean;
}

interface SendEmailOTPResult {
    email: string;
    message: string;
    /** Seconds until another code may be requested — drives the resend timer. */
    resendInSeconds?: number;
    expiresInSeconds?: number;
}

interface VerifyEmailOTPResult {
    email: string;
    message: string;
    verified: boolean;
    /** Single-use proof of ownership; `register` will not create an account without it. */
    verificationToken: string;
    expiresInSeconds?: number;
}

interface ForgotPasswordResult {
    email: string;
    message: string;
    /**
     * False only when the address is real and the mail genuinely failed to go
     * out. Unknown addresses report true so the client can't use this to work
     * out which emails have accounts.
     */
    emailSent: boolean;
    error?: string;
    resendInSeconds?: number;
    devOtp?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    /** Re-reads the account from the server; returns null if the session ended. */
    refreshUser: () => Promise<User | null>;
    register: (data: Record<string, unknown>) => Promise<RegisterResult>;
    sendEmailOTP: (email: string, name?: string) => Promise<SendEmailOTPResult>;
    verifyEmailOTP: (email: string, otp: string) => Promise<VerifyEmailOTPResult>;
    verifyOTP: (email: string, otp: string) => Promise<Record<string, unknown>>;
    resendOTP: (email: string) => Promise<Record<string, unknown>>;
    forgotPassword: (email: string) => Promise<ForgotPasswordResult>;
    resetPassword: (
        email: string,
        otp: string,
        newPassword: string
    ) => Promise<Record<string, unknown>>;
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

    /**
     * Re-reads the account from the server and updates the cached copy.
     *
     * This picks up a role change or a revoked approval that happened while the
     * (7-day) token was still technically valid. It is also how a staff member
     * whose registration is still pending finds out they've been approved —
     * they can now sign in before approval, so their cached `isApproved` goes
     * stale the moment a manager acts on it.
     */
    const refreshUser = useCallback(async (): Promise<User | null> => {
        try {
            const data = await apiRequest<{ user?: User }>("/auth/me");
            if (data.user) {
                setUser(data.user);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
                return data.user;
            }
        } catch (e) {
            // 401 = token invalid/expired, 403 = access revoked. Either way the
            // session is over. A network blip (status 0) should NOT sign the
            // user out — keep the cached session so the app still opens offline.
            if (e instanceof ApiError && e.status !== 0) {
                await logout();
            }
        }
        return null;
    }, [logout]);

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

                await refreshUser();
            } catch (e) {
                console.error("Error loading auth", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadStoredAuth();
    }, [refreshUser]);

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

    /**
     * Sign-up step 1 — mail a code to the address typed into the register form.
     * No account is created by this call.
     */
    const sendEmailOTP = async (email: string, name?: string) =>
        apiRequest<SendEmailOTPResult>("/auth/email-otp/send", {
            method: "POST",
            body: JSON.stringify({ email, name }),
        });

    /** Sign-up step 2 — trade the mailed code for the token `register` requires. */
    const verifyEmailOTP = async (email: string, otp: string) =>
        apiRequest<VerifyEmailOTPResult>("/auth/email-otp/verify", {
            method: "POST",
            body: JSON.stringify({ email, otp }),
        });

    /**
     * Verifies an account that already exists but was never confirmed — the
     * legacy path, reached from login. New sign-ups use verifyEmailOTP instead.
     */
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

    const forgotPassword = async (email: string) =>
        apiRequest<ForgotPasswordResult>("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
        });

    const resetPassword = async (email: string, otp: string, newPassword: string) =>
        apiRequest("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ email, otp, newPassword }),
        });

    const seedDatabase = async () => apiRequest("/seed", { method: "POST" });

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                refreshUser,
                register,
                sendEmailOTP,
                verifyEmailOTP,
                verifyOTP,
                resendOTP,
                forgotPassword,
                resetPassword,
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
