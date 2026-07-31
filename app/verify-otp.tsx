import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function VerifyOTPScreen() {
    const { verifyOTP, resendOTP } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string; devOtp?: string }>();

    const [otp, setOtp] = useState(params.devOtp || "");
    const [devOtp, setDevOtp] = useState(params.devOtp);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const handleVerify = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert("Invalid Code", "Please enter the 6-digit OTP code sent to your email.");
            return;
        }

        setLoading(true);
        try {
            await verifyOTP(params.email || "", otp);
            Alert.alert(
                "Email Verified! ✅",
                "Your email address has been verified successfully. Your registration has been sent to the Estate Manager for final approval.",
                [
                    {
                        text: "Back to Login",
                        onPress: () => router.replace("/login"),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                "Verification Failed",
                error instanceof Error ? error.message : "Invalid OTP code"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const res = await resendOTP(params.email || "");
            // In development the backend echoes the code back so the flow can be
            // tested without a configured SMTP server.
            if (typeof res.otp === "string") {
                setDevOtp(res.otp);
                setOtp(res.otp);
            }
            Alert.alert("Code Sent", (res.message as string) || "A new code is on its way.");
        } catch (error) {
            Alert.alert(
                "Could Not Resend",
                error instanceof Error ? error.message : "Please try again in a moment."
            );
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.icon}>✉️</Text>
                <Text style={styles.title}>Verify Email OTP</Text>
                <Text style={styles.subtitle}>
                    We sent a 6-digit verification code to:{"\n"}
                    <Text style={styles.emailText}>{params.email || "your email"}</Text>
                </Text>

                {devOtp && (
                    <View style={styles.devBox}>
                        <Text style={styles.devText}>⚡ Dev Mode Auto OTP: {devOtp}</Text>
                    </View>
                )}

                <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                />

                <TouchableOpacity
                    style={styles.btn}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.btnText}>Verify & Complete Registration</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResend}
                    disabled={resending || loading}
                >
                    {resending ? (
                        <ActivityIndicator color="#2563eb" />
                    ) : (
                        <Text style={styles.resendText}>Didn&apos;t get a code? Resend</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/login")}>
                    <Text style={styles.backText}>Cancel and return to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 24,
        justifyContent: "center",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
    },
    emailText: {
        fontWeight: "700",
        color: "#2563eb",
    },
    devBox: {
        backgroundColor: "#fef3c7",
        padding: 8,
        borderRadius: 8,
        marginBottom: 16,
        width: "100%",
        alignItems: "center",
    },
    devText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#d97706",
    },
    otpInput: {
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        width: "100%",
        paddingVertical: 16,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    btn: {
        backgroundColor: "#2563eb",
        borderRadius: 12,
        paddingVertical: 14,
        width: "100%",
        alignItems: "center",
        marginBottom: 12,
    },
    btnText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
    resendBtn: {
        paddingVertical: 10,
        width: "100%",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#bfdbfe",
        backgroundColor: "#eff6ff",
        marginBottom: 8,
    },
    resendText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563eb",
    },
    backBtn: {
        paddingVertical: 8,
    },
    backText: {
        fontSize: 13,
        color: "#64748b",
    },
});
