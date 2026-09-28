import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { useRouter } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Banner, Button, TextField } from "@/components/ui";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

/** How long a transient success/error notice stays on screen. */
const NOTICE_MS = 4000;

type Step = "request" | "reset" | "done";
type Notice = { tone: "success" | "error"; title: string; message?: string };

export default function ForgotPasswordScreen() {
    const { forgotPassword, resetPassword } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState<Step>("request");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    /** The address a code was actually mailed to — not necessarily what's typed. */
    const [sentTo, setSentTo] = useState("");
    const [cooldown, setCooldown] = useState(0);

    /**
     * Feedback is rendered in the card rather than through Alert.alert.
     * A modal on every send/resend interrupts a flow whose whole point is
     * copying a code across from a mail app, and on a wrong code it hides the
     * box the user needs to correct behind an OK button.
     */
    const [notice, setNotice] = useState<Notice | null>(null);

    const [sending, setSending] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [otpFocused, setOtpFocused] = useState(false);

    const confirmRef = useRef<TextInput>(null);

    const normalizedEmail = email.trim().toLowerCase();

    // Resend countdown. Depending on `cooldown` itself makes each tick schedule
    // the next, which stops cleanly at zero with no interval to tear down.
    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    // Notices clear themselves so a stale "code sent" doesn't sit under a
    // later failure. Keyed on the object identity, so a repeat of the same
    // message still restarts the clock.
    useEffect(() => {
        if (!notice) return;
        const id = setTimeout(() => setNotice(null), NOTICE_MS);
        return () => clearTimeout(id);
    }, [notice]);

    /**
     * Requests a code. Used both for the initial send and for "Resend", so a
     * new code is genuinely issued rather than the screen just flipping back a
     * step with a stale one still in the box.
     */
    const requestCode = async (advance: boolean) => {
        Keyboard.dismiss();

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            setNotice({
                tone: "error",
                title: "Invalid email",
                message: "Please enter a valid email address.",
            });
            return;
        }

        setSending(true);
        try {
            const res = await forgotPassword(normalizedEmail);

            // The server tells us honestly when a real address failed to
            // receive the mail. Staying put beats sending them to a code screen
            // to wait for something that was never delivered.
            if (res.emailSent === false) {
                setNotice({
                    tone: "error",
                    title: "Could not send code",
                    message:
                        res.error ||
                        "We could not send the reset email just now. Please check the address and try again.",
                });
                return;
            }

            setSentTo(normalizedEmail);
            setOtp(res.devOtp || "");
            setCooldown(res.resendInSeconds ?? RESEND_SECONDS);
            if (advance) setStep("reset");

            setNotice({
                tone: "success",
                title: res.devOtp ? "Code generated" : "Code sent",
                message: res.devOtp
                    ? `Verification code: ${res.devOtp}`
                    : (res.message || `If an account exists for ${normalizedEmail}, a code is on its way.`),
            });
        } catch (error) {
            // A 429 knows exactly how long is left; honour the server's clock
            // rather than restarting our own.
            if (error instanceof ApiError && typeof error.payload.retryAfter === "number") {
                setCooldown(error.payload.retryAfter);
                if (advance) setStep("reset");
            }
            setNotice({
                tone: "error",
                title: "Request failed",
                message:
                    error instanceof Error ? error.message : "Could not send the reset code.",
            });
        } finally {
            setSending(false);
        }
    };

    const handleResetPassword = async () => {
        Keyboard.dismiss();

        if (otp.length !== 6) {
            setNotice({
                tone: "error",
                title: "Invalid code",
                message: "Please enter the 6-digit code sent to your email.",
            });
            return;
        }
        if (newPassword.length < 6) {
            setNotice({
                tone: "error",
                title: "Password too short",
                message: "Your new password must be at least 6 characters.",
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            setNotice({
                tone: "error",
                title: "Passwords don't match",
                message: "Please re-enter the two passwords.",
            });
            return;
        }

        setResetting(true);
        try {
            await resetPassword(sentTo, otp, newPassword);
            setNotice(null);
            setStep("done");
        } catch (error) {
            // Out of attempts, or the code expired — a fresh one is the only way
            // forward, so clear the dead code out of the box.
            if (error instanceof ApiError && error.payload.attemptsRemaining === 0) {
                setOtp("");
            }
            setNotice({
                tone: "error",
                title: "Reset failed",
                message:
                    error instanceof Error ? error.message : "Could not reset your password.",
            });
        } finally {
            setResetting(false);
        }
    };

    /** Back to step one with the code and passwords dropped. */
    const changeEmail = () => {
        setStep("request");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setNotice(null);
    };

    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const canReset =
        otp.length === 6 && newPassword.length >= 6 && passwordsMatch && !sending;

    const HEADINGS: Record<Step, { welcome: string; title: string; description: string }> = {
        request: {
            welcome: "Forgot Password",
            title: "Enter your email",
            description:
                "We'll send a 6-digit reset code to your registered email address.",
        },
        reset: {
            welcome: "Verification",
            title: "Set a new password",
            description:
                "Enter the code we emailed you, then choose a new password.",
        },
        done: {
            welcome: "All Done",
            title: "Password updated",
            description:
                "Your password has been reset. Sign in with your new password to continue.",
        },
    };

    const heading = HEADINGS[step];

    const renderStep = () => {
        switch (step) {
            case "request":
                return (
                    <>
                        <TextField
                            label="Email address"
                            icon="mail-outline"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="staff@mgm.edu"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            returnKeyType="send"
                            onSubmitEditing={() => requestCode(true)}
                        />

                        <Button
                            label="Send reset code"
                            icon="paper-plane-outline"
                            size="lg"
                            fullWidth
                            loading={sending}
                            disabled={!normalizedEmail}
                            onPress={() => requestCode(true)}
                            style={styles.submitBtn}
                        />
                    </>
                );

            case "reset":
                return (
                    <>
                        {/* The address in play, with an escape hatch — a typo on
                            step one is otherwise only recoverable by going back. */}
                        <View style={styles.emailChip}>
                            <MaterialIcons name="email" size={16} color={Colors.primaryDark} />
                            <Text style={styles.emailChipText} numberOfLines={1}>
                                {sentTo}
                            </Text>
                            <TouchableOpacity
                                onPress={changeEmail}
                                style={styles.changeBtn}
                                hitSlop={8}
                            >
                                <Text style={styles.changeText}>Change</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Verification code</Text>
                        <TextInput
                            style={[styles.otpInput, otpFocused && styles.otpInputFocused]}
                            value={otp}
                            // Strip non-digits so a pasted code with stray
                            // spaces still lands cleanly.
                            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                            onFocus={() => setOtpFocused(true)}
                            onBlur={() => setOtpFocused(false)}
                            placeholder="000000"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoComplete="one-time-code"
                            textContentType="oneTimeCode"
                        />
                        <Text style={styles.otpHint}>
                            Expires in 15 minutes and can only be used once. Check your spam
                            folder if it hasn&apos;t arrived.
                        </Text>

                        <TextField
                            label="New password"
                            icon="lock-closed-outline"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="At least 6 characters"
                            isPassword
                            autoCapitalize="none"
                            textContentType="newPassword"
                            returnKeyType="next"
                            submitBehavior="submit"
                            onSubmitEditing={() => confirmRef.current?.focus()}
                        />

                        <TextField
                            ref={confirmRef}
                            label="Confirm new password"
                            icon="checkmark-done-outline"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Re-enter the password"
                            isPassword
                            autoCapitalize="none"
                            textContentType="newPassword"
                            returnKeyType="done"
                            onSubmitEditing={handleResetPassword}
                        />

                        {/* Says so while they type, rather than after they've
                            submitted and waited on a round-trip. */}
                        {confirmPassword.length > 0 && !passwordsMatch && (
                            <Text style={styles.mismatch}>Passwords don&apos;t match yet.</Text>
                        )}

                        <Button
                            label="Set new password"
                            icon="checkmark-circle-outline"
                            size="lg"
                            fullWidth
                            loading={resetting}
                            disabled={!canReset}
                            onPress={handleResetPassword}
                            style={styles.submitBtn}
                        />

                        <Button
                            label={
                                cooldown > 0
                                    ? `Resend code in ${cooldown}s`
                                    : "Didn't get a code? Resend"
                            }
                            variant="secondary"
                            fullWidth
                            loading={sending}
                            disabled={cooldown > 0 || resetting}
                            onPress={() => requestCode(false)}
                        />
                    </>
                );

            case "done":
                return (
                    <>
                        <Banner
                            tone="success"
                            icon="shield-checkmark-outline"
                            title={`Password reset for ${sentTo}`}
                            message="Any other devices signed into this account have been signed out."
                        />

                        <Button
                            label="Go to Sign In"
                            icon="arrow-forward"
                            iconAfter
                            size="lg"
                            fullWidth
                            onPress={() => router.replace("/login")}
                            style={styles.submitBtn}
                        />
                    </>
                );
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Same brand block as the sign-in screen, so the two read
                        as one flow rather than two unrelated screens. */}
                    <View style={styles.header}>
                        <View style={styles.logoMark}>
                            <Ionicons
                                name={step === "done" ? "checkmark-done" : "key"}
                                size={26}
                                color="#FFFFFF"
                            />
                        </View>
                        <Text style={styles.brandTitle}>MGM Maintenance</Text>
                        <Text style={styles.brandSubtitle}>Account recovery</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.welcomeText}>{heading.welcome}</Text>
                        <Text style={styles.stepTitle}>{heading.title}</Text>
                        <Text style={styles.stepDescription}>{heading.description}</Text>

                        {notice && (
                            <Banner
                                tone={notice.tone}
                                title={notice.title}
                                message={notice.message}
                            />
                        )}

                        {renderStep()}
                    </View>

                    {step !== "done" && (
                        <View style={styles.backRow}>
                            <Text style={styles.backText}>Remembered it?</Text>
                            <TouchableOpacity
                                onPress={() => router.replace("/login")}
                                hitSlop={8}
                            >
                                <Text style={styles.backLink}> Return to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    flex: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 24,
        justifyContent: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 28,
    },
    logoMark: {
        width: 62,
        height: 62,
        borderRadius: Radius.xl,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        ...Shadow.lg,
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        textAlign: "center",
    },
    brandSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: "center",
        marginTop: 5,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xxl,
        padding: 22,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.md,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.4,
        textAlign: "center",
        marginBottom: 14,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    stepDescription: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 3,
        marginBottom: 20,
        lineHeight: 18,
    },
    emailChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        borderRadius: Radius.sm,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 18,
    },
    emailChipText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
        color: Colors.primaryDark,
    },
    changeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        backgroundColor: Colors.primary,
        borderRadius: Radius.sm,
    },
    changeText: {
        color: "#FFFFFF",
        fontSize: 11.5,
        fontWeight: "700",
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 7,
    },
    otpInput: {
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.md,
        width: "100%",
        paddingVertical: 14,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 8,
        color: Colors.textPrimary,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    otpInputFocused: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    otpHint: {
        fontSize: 11.5,
        color: Colors.textTertiary,
        lineHeight: 16,
        marginTop: 8,
        marginBottom: 16,
    },
    mismatch: {
        fontSize: 11.5,
        color: Colors.errorDark,
        fontWeight: "600",
        marginTop: -6,
        marginBottom: 10,
    },
    submitBtn: {
        marginTop: 6,
        marginBottom: 12,
    },
    backRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
    },
    backText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    backLink: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.primary,
    },
});
