import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Button } from "@/components/ui";

/**
 * Standalone verification for accounts that already exist but were never
 * confirmed — reached from login. New sign-ups verify inline on the register
 * screen and never land here.
 */
export default function VerifyOTPScreen() {
    const { verifyOTP, resendOTP } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [focused, setFocused] = useState(false);

    const handleVerify = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert("Invalid Code", "Please enter the 6-digit OTP code sent to your email.");
            return;
        }

        setLoading(true);
        try {
            await verifyOTP(params.email || "", otp);
            Alert.alert(
                "Email Verified",
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
            setOtp("");
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
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="mail-open-outline" size={26} color={Colors.primary} />
                    </View>

                    <Text style={styles.title}>Verify your email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to{"\n"}
                        <Text style={styles.emailText}>{params.email || "your email"}</Text>
                    </Text>

                    <TextInput
                        style={[styles.otpInput, focused && styles.otpInputFocused]}
                        value={otp}
                        onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="000000"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="number-pad"
                        maxLength={6}
                    />

                    <Button
                        label="Verify & continue"
                        icon="checkmark-circle-outline"
                        size="lg"
                        fullWidth
                        loading={loading}
                        onPress={handleVerify}
                        style={styles.verifyBtn}
                    />

                    <Button
                        label="Didn't get a code? Resend"
                        variant="secondary"
                        size="lg"
                        fullWidth
                        loading={resending}
                        disabled={loading}
                        onPress={handleResend}
                    />

                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.replace("/login")}
                        hitSlop={8}
                    >
                        <Text style={styles.backText}>Cancel and return to login</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xxl,
        padding: 26,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.md,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: Radius.xl,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 21,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.4,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
    },
    emailText: {
        fontWeight: "700",
        color: Colors.primary,
    },
    otpInput: {
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.lg,
        width: "100%",
        paddingVertical: 16,
        textAlign: "center",
        fontSize: 26,
        fontWeight: "800",
        letterSpacing: 10,
        color: Colors.textPrimary,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    otpInputFocused: {
        borderColor: Colors.primary,
        backgroundColor: "#F0F9FF",
    },
    verifyBtn: {
        marginBottom: 10,
    },
    backBtn: {
        paddingVertical: 12,
        marginTop: 4,
    },
    backText: {
        fontSize: 12.5,
        color: Colors.textTertiary,
        fontWeight: "500",
    },
});
