import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { useRouter } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Banner, Button, ProgressBar, TextField } from "@/components/ui";

/** Where the inline email check has got to. */
type VerifyStep = "idle" | "code-sent" | "verified";

/** Which fields the user has left, so a form isn't red before it's been filled. */
type FieldKey = "name" | "email" | "password" | "confirm" | "phone";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;
const MIN_PASSWORD = 6;

/** Buzz where the platform supports it; never let a missing motor break a flow. */
const buzz = (type: Haptics.NotificationFeedbackType) => {
    Haptics.notificationAsync(type).catch(() => {});
};

/**
 * A rough 0–4 rating. It is deliberately advisory — the server only requires six
 * characters — so the meter nudges towards a better password without blocking.
 */
const scorePassword = (pw: string) => {
    let score = 0;
    if (pw.length >= MIN_PASSWORD) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return Math.min(score, 4);
};

const STRENGTH = [
    { label: "Too short", color: Colors.error },
    { label: "Weak", color: Colors.error },
    { label: "Fair", color: Colors.warning },
    { label: "Good", color: Colors.primary },
    { label: "Strong", color: Colors.success },
];

/** One numbered pip in the two-step rail at the top of the card. */
const Step: React.FC<{ index: number; label: string; state: "done" | "active" | "todo" }> = ({
    index,
    label,
    state,
}) => (
    <View style={styles.step}>
        <View
            style={[
                styles.stepDot,
                state === "active" && styles.stepDotActive,
                state === "done" && styles.stepDotDone,
            ]}
        >
            {state === "done" ? (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            ) : (
                <Text style={[styles.stepNum, state === "active" && styles.stepNumActive]}>
                    {index}
                </Text>
            )}
        </View>
        <Text style={[styles.stepLabel, state !== "todo" && styles.stepLabelOn]}>{label}</Text>
    </View>
);

/** A single rule under the password box, ticked once it is satisfied. */
const Rule: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
    <View style={styles.rule}>
        <Ionicons
            name={ok ? "checkmark-circle" : "ellipse-outline"}
            size={13}
            color={ok ? Colors.success : Colors.textTertiary}
        />
        <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
);

export default function RegisterScreen() {
    const { register, sendEmailOTP, verifyEmailOTP } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [department, setDepartment] = useState("");
    const [phone, setPhone] = useState("");

    // Email verification happens here on the form, before the account exists.
    // `verificationToken` is what the server issues once the code checks out;
    // without it the register call is refused.
    const [step, setStep] = useState<VerifyStep>("idle");
    const [otp, setOtp] = useState("");
    const [otpFocused, setOtpFocused] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    /** The address a code was actually mailed to — not necessarily what's typed. */
    const [challengedEmail, setChallengedEmail] = useState("");
    const [verificationToken, setVerificationToken] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [loading, setLoading] = useState(false);

    // Validation is shown per field rather than in a modal, so the box being
    // complained about stays on screen next to the complaint.
    const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    /** Whole-form failure — a server rejection, or "something above needs fixing". */
    const [formError, setFormError] = useState<string | null>(null);
    /** Set on success; swaps the form out for a confirmation panel. */
    const [done, setDone] = useState<string | null>(null);

    const scrollRef = useRef<ScrollView>(null);
    const nameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const otpRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);
    const departmentRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    /** The last code auto-submitted, so a failed one isn't retried on every render. */
    const autoTried = useRef("");

    const normalizedEmail = email.trim().toLowerCase();
    const isVerified = step === "verified" && !!verificationToken;
    const digits = phone.replace(/\D/g, "");
    const strength = scorePassword(password);

    // Resend countdown. Depending on `cooldown` itself makes each tick schedule
    // the next one, which stops cleanly at zero without an interval to clear.
    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    const errors = useMemo(() => {
        const e: Partial<Record<FieldKey, string>> = {};

        if (!name.trim()) e.name = "Please enter your full name.";
        else if (name.trim().length < 2) e.name = "That looks too short to be a name.";

        if (!email.trim()) e.email = "Please enter your email address.";
        else if (!EMAIL_PATTERN.test(normalizedEmail))
            e.email = "Enter a valid address, e.g. sharma@mgm.edu";

        if (!password) e.password = "Please choose a password.";
        else if (password.length < MIN_PASSWORD)
            e.password = `Use at least ${MIN_PASSWORD} characters.`;

        if (!confirm) e.confirm = "Please re-enter your password.";
        else if (confirm !== password) e.confirm = "Both passwords must match.";

        if (digits && digits.length !== 10) e.phone = "Enter a 10-digit mobile number.";

        return e;
    }, [name, email, normalizedEmail, password, confirm, digits]);

    /** Errors stay quiet until the field has been visited or the form submitted. */
    const errorFor = (key: FieldKey) => (touched[key] || submitted ? errors[key] : undefined);
    const markTouched = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

    const resetVerification = () => {
        setStep("idle");
        setOtp("");
        setOtpError(null);
        setChallengedEmail("");
        setVerificationToken(null);
        setCooldown(0);
        autoTried.current = "";
    };

    /**
     * Editing the address invalidates anything earned for the old one. Typing
     * the same address back in is not a change, so a stray keystroke that gets
     * corrected doesn't cost the user their verified state.
     */
    const handleEmailChange = (value: string) => {
        setEmail(value);
        setFormError(null);
        if (step === "idle") return;
        if (value.trim().toLowerCase() === challengedEmail) return;
        resetVerification();
    };

    const handleSendCode = async () => {
        markTouched("email");
        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            emailRef.current?.focus();
            return;
        }

        setSending(true);
        setFormError(null);
        try {
            const res = await sendEmailOTP(normalizedEmail, name.trim());
            setChallengedEmail(normalizedEmail);
            setStep("code-sent");
            setOtp("");
            setOtpError(null);
            setVerificationToken(null);
            autoTried.current = "";
            setCooldown(res.resendInSeconds ?? RESEND_SECONDS);
            buzz(Haptics.NotificationFeedbackType.Success);
            // Focus lands on the code boxes so the keyboard is already up when
            // the user switches back from their mail app.
            setTimeout(() => otpRef.current?.focus(), 350);
        } catch (error) {
            // A 429 tells us exactly how long is left, so honour the server's
            // clock rather than restarting our own.
            if (error instanceof ApiError && typeof error.payload.retryAfter === "number") {
                setCooldown(error.payload.retryAfter);
            }
            buzz(Haptics.NotificationFeedbackType.Error);
            setFormError(
                error instanceof Error
                    ? error.message
                    : "We couldn't send the verification code. Please try again."
            );
        } finally {
            setSending(false);
        }
    };

    const handleVerifyCode = async (code: string = otp) => {
        if (code.length !== OTP_LENGTH || verifying) return;

        setVerifying(true);
        setOtpError(null);
        try {
            const res = await verifyEmailOTP(challengedEmail, code);
            setVerificationToken(res.verificationToken);
            setStep("verified");
            setCooldown(0);
            buzz(Haptics.NotificationFeedbackType.Success);
            // The address is settled; send them straight on to the part that
            // still needs typing.
            setTimeout(() => passwordRef.current?.focus(), 250);
        } catch (error) {
            buzz(Haptics.NotificationFeedbackType.Error);
            setOtpError(
                error instanceof Error ? error.message : "That code was not accepted."
            );
        } finally {
            setVerifying(false);
        }
    };

    /** Strips anything non-numeric so a pasted code with stray spaces still lands. */
    const handleOtpChange = (text: string) => {
        const next = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
        setOtp(next);
        if (otpError) setOtpError(null);

        // A complete code needs no extra tap. Each distinct code is tried once,
        // so a rejected one waits for the user rather than looping.
        if (next.length === OTP_LENGTH && next !== autoTried.current) {
            autoTried.current = next;
            handleVerifyCode(next);
        }
    };

    const handleRegister = async () => {
        setSubmitted(true);
        setFormError(null);

        // Point at the first thing that needs attention instead of listing
        // everything — focusing it also scrolls it into view.
        const firstBad = (["name", "email", "password", "confirm", "phone"] as FieldKey[]).find(
            (k) => errors[k]
        );
        if (firstBad) {
            const refs: Record<FieldKey, React.RefObject<TextInput | null>> = {
                name: nameRef,
                email: emailRef,
                password: passwordRef,
                confirm: confirmRef,
                phone: phoneRef,
            };
            buzz(Haptics.NotificationFeedbackType.Warning);
            refs[firstBad].current?.focus();
            setFormError("Some details need fixing before we can create your account.");
            return;
        }

        if (!isVerified) {
            buzz(Haptics.NotificationFeedbackType.Warning);
            setFormError("Please verify your email address first — step 1 above.");
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
        }

        setLoading(true);
        try {
            // No `role` is sent: sign-up always creates a pending staff account,
            // and the server ignores any role supplied here. The account is
            // created already email-verified, on the strength of the token.
            const res = await register({
                name: name.trim(),
                email: challengedEmail,
                password,
                department: department.trim(),
                phone: digits,
                verificationToken,
            });

            buzz(Haptics.NotificationFeedbackType.Success);
            setDone(
                res.message ||
                    "Your email is verified and your registration has been sent to the Estate Manager for approval."
            );
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        } catch (error) {
            // The token can expire while the rest of the form is being filled in.
            // Drop back to the unverified state so the user can request a new code.
            if (error instanceof ApiError && error.payload.verificationRequired) {
                resetVerification();
                scrollRef.current?.scrollTo({ y: 0, animated: true });
            }
            buzz(Haptics.NotificationFeedbackType.Error);
            setFormError(
                error instanceof Error ? error.message : "Failed to create your account."
            );
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <SafeAreaView style={styles.safe}>
                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.card}>
                        <View style={[styles.iconWrap, styles.iconWrapDone]}>
                            <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
                        </View>

                        <Text style={styles.title}>Registration submitted</Text>
                        <Text style={styles.subtitle}>{done}</Text>

                        <Banner
                            tone="info"
                            title="What happens next"
                            message={`We've confirmed ${challengedEmail}. The Estate Manager reviews new staff registrations, and you'll get an email as soon as yours is approved.`}
                        />

                        <Button
                            label="Back to login"
                            icon="arrow-forward"
                            iconAfter
                            size="lg"
                            fullWidth
                            onPress={() => router.replace("/login")}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.flex}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        hitSlop={8}
                        accessibilityRole="button"
                    >
                        <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                        <Text style={styles.backText}>Back to login</Text>
                    </TouchableOpacity>

                    <View style={styles.card}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="person-add" size={22} color={Colors.primary} />
                        </View>

                        <Text style={styles.title}>Staff sign up</Text>
                        <Text style={styles.subtitle}>
                            Register to report maintenance and infrastructure damage across the
                            MGM College campus. It takes about a minute.
                        </Text>

                        {/* Two-step rail — the form gates on email verification, so
                            say so up front rather than at the disabled button. */}
                        <View style={styles.steps}>
                            <Step
                                index={1}
                                label="Verify email"
                                state={isVerified ? "done" : "active"}
                            />
                            <View style={styles.stepLine} />
                            <Step
                                index={2}
                                label="Your details"
                                state={isVerified ? "active" : "todo"}
                            />
                        </View>

                        <Text style={styles.sectionTitle}>1 · Verify your email</Text>

                        <TextField
                            ref={nameRef}
                            label="Full name"
                            icon="person-outline"
                            value={name}
                            onChangeText={setName}
                            onBlur={() => markTouched("name")}
                            placeholder="e.g. Prof. Sharma"
                            autoComplete="name"
                            textContentType="name"
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            error={errorFor("name")}
                            success={!errors.name && !!name.trim()}
                        />

                        {/* The address gets the full width — squeezing it beside a
                            button truncated the one value the user must proofread
                            before a code is sent to it. The action stacks under it. */}
                        <TextField
                            ref={emailRef}
                            label="Email address"
                            icon={isVerified ? "shield-checkmark-outline" : "mail-outline"}
                            value={email}
                            onChangeText={handleEmailChange}
                            onBlur={() => markTouched("email")}
                            placeholder="sharma@mgm.edu"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            textContentType="emailAddress"
                            returnKeyType="send"
                            onSubmitEditing={() => {
                                if (step === "idle") handleSendCode();
                            }}
                            // Locked once a code is on its way, so a stray keystroke
                            // can't silently void it. Changing it is an explicit
                            // choice via the link below.
                            editable={step === "idle"}
                            error={errorFor("email")}
                            success={isVerified}
                            help={
                                step === "idle" && !errorFor("email")
                                    ? "We'll email a 6-digit code to confirm it's you."
                                    : undefined
                            }
                            // Only while the code is in flight — once verified the
                            // field keeps its green confirmed fill.
                            containerStyle={step === "code-sent" ? styles.emailLocked : undefined}
                        />

                        {step === "idle" ? (
                            <Button
                                label={
                                    cooldown > 0
                                        ? `Resend in ${cooldown}s`
                                        : "Send verification code"
                                }
                                icon="mail-outline"
                                variant="secondary"
                                size="lg"
                                fullWidth
                                loading={sending}
                                disabled={cooldown > 0 || !normalizedEmail}
                                onPress={handleSendCode}
                                style={styles.sendBtn}
                            />
                        ) : (
                            <TouchableOpacity
                                style={styles.changeEmailBtn}
                                onPress={resetVerification}
                                hitSlop={8}
                                accessibilityRole="button"
                            >
                                <Ionicons name="pencil" size={12} color={Colors.primary} />
                                <Text style={styles.changeEmailText}>Use a different email</Text>
                            </TouchableOpacity>
                        )}

                        {step === "code-sent" && (
                            <View style={styles.otpBox}>
                                <Text style={styles.otpTitle}>Enter the 6-digit code</Text>
                                <Text style={styles.otpHint}>
                                    Sent to{" "}
                                    <Text style={styles.otpEmail}>{challengedEmail}</Text>. It
                                    expires in 15 minutes.
                                </Text>

                                {/* Six boxes over one hidden input: it looks like a
                                    code field, but still takes an autofilled or
                                    pasted code in a single go. */}
                                <Pressable
                                    style={styles.otpCells}
                                    onPress={() => otpRef.current?.focus()}
                                    accessibilityRole="button"
                                    accessibilityLabel="Verification code, 6 digits"
                                >
                                    {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                                        const char = otp[i] ?? "";
                                        const isCaret =
                                            otpFocused &&
                                            (i === otp.length ||
                                                (otp.length === OTP_LENGTH &&
                                                    i === OTP_LENGTH - 1));
                                        return (
                                            <View
                                                key={i}
                                                style={[
                                                    styles.otpCell,
                                                    !!char && styles.otpCellFilled,
                                                    isCaret && styles.otpCellActive,
                                                    !!otpError && styles.otpCellError,
                                                ]}
                                            >
                                                <Text style={styles.otpChar}>{char}</Text>
                                            </View>
                                        );
                                    })}

                                    <TextInput
                                        ref={otpRef}
                                        style={styles.otpInput}
                                        value={otp}
                                        onChangeText={handleOtpChange}
                                        onFocus={() => setOtpFocused(true)}
                                        onBlur={() => setOtpFocused(false)}
                                        keyboardType="number-pad"
                                        maxLength={OTP_LENGTH}
                                        autoComplete="one-time-code"
                                        textContentType="oneTimeCode"
                                        caretHidden
                                        autoFocus
                                    />
                                </Pressable>

                                {otpError ? (
                                    <View style={styles.otpErrorRow}>
                                        <Ionicons
                                            name="alert-circle"
                                            size={13}
                                            color={Colors.errorDark}
                                        />
                                        <Text style={styles.otpErrorText}>{otpError}</Text>
                                    </View>
                                ) : null}

                                <Button
                                    label={verifying ? "Verifying" : "Verify email"}
                                    icon="checkmark-circle-outline"
                                    fullWidth
                                    loading={verifying}
                                    disabled={otp.length !== OTP_LENGTH}
                                    onPress={() => handleVerifyCode()}
                                />

                                <View style={styles.resendRow}>
                                    <Text style={styles.otpFoot}>
                                        {cooldown > 0
                                            ? `Didn't get it? You can ask for a new code in ${cooldown}s.`
                                            : "Didn't get it? Check your spam folder."}
                                    </Text>
                                    {cooldown === 0 && (
                                        <TouchableOpacity
                                            onPress={handleSendCode}
                                            disabled={sending}
                                            hitSlop={8}
                                            accessibilityRole="button"
                                        >
                                            <Text style={styles.resendLink}>
                                                {sending ? "Sending…" : "Resend code"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        {isVerified && (
                            <Banner
                                tone="success"
                                title="Email verified"
                                message={`${challengedEmail} is confirmed. Just your account details left.`}
                            />
                        )}

                        <Text style={styles.sectionTitle}>2 · Your account details</Text>

                        <TextField
                            ref={passwordRef}
                            label="Password"
                            icon="lock-closed-outline"
                            value={password}
                            onChangeText={setPassword}
                            onBlur={() => markTouched("password")}
                            placeholder={`At least ${MIN_PASSWORD} characters`}
                            isPassword
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="newPassword"
                            returnKeyType="next"
                            onSubmitEditing={() => confirmRef.current?.focus()}
                            error={errorFor("password")}
                        />

                        {password.length > 0 && (
                            <View style={styles.strength}>
                                <View style={styles.strengthHead}>
                                    <Text style={styles.strengthLabel}>Password strength</Text>
                                    <Text
                                        style={[
                                            styles.strengthValue,
                                            { color: STRENGTH[strength].color },
                                        ]}
                                    >
                                        {STRENGTH[strength].label}
                                    </Text>
                                </View>
                                <ProgressBar
                                    percent={((strength + 1) / 5) * 100}
                                    color={STRENGTH[strength].color}
                                    height={5}
                                />
                                <View style={styles.rules}>
                                    <Rule
                                        ok={password.length >= MIN_PASSWORD}
                                        text={`${MIN_PASSWORD}+ characters`}
                                    />
                                    <Rule ok={/\d/.test(password)} text="A number" />
                                    <Rule
                                        ok={/[a-z]/.test(password) && /[A-Z]/.test(password)}
                                        text="Upper & lower case"
                                    />
                                </View>
                            </View>
                        )}

                        <TextField
                            ref={confirmRef}
                            label="Confirm password"
                            icon="lock-closed-outline"
                            value={confirm}
                            onChangeText={setConfirm}
                            onBlur={() => markTouched("confirm")}
                            placeholder="Re-enter your password"
                            isPassword
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="newPassword"
                            returnKeyType="next"
                            onSubmitEditing={() => departmentRef.current?.focus()}
                            error={errorFor("confirm")}
                            success={!!confirm && confirm === password}
                        />

                        <TextField
                            ref={departmentRef}
                            label="Department"
                            hint="optional"
                            icon="school-outline"
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="e.g. Mechanical Dept"
                            returnKeyType="next"
                            onSubmitEditing={() => phoneRef.current?.focus()}
                            help="Helps the Estate Manager route your reports."
                        />

                        <TextField
                            ref={phoneRef}
                            label="Phone number"
                            hint="optional"
                            icon="call-outline"
                            value={phone}
                            // Digits only, so the number reaches the server in the
                            // one shape the rest of the app expects.
                            onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                            onBlur={() => markTouched("phone")}
                            placeholder="9876543210"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                            maxLength={10}
                            returnKeyType="done"
                            onSubmitEditing={handleRegister}
                            error={errorFor("phone")}
                            success={digits.length === 10}
                            help="So maintenance staff can reach you about a report."
                        />

                        <Banner
                            tone="info"
                            title="Approval required"
                            message="Once your account is created, the Estate Manager reviews your registration before login access is activated."
                        />

                        {formError && (
                            <Banner tone="error" title="Can't continue yet" message={formError} />
                        )}

                        {/* Kept enabled on purpose: a tap that explains what's
                            missing beats a dead button with no reason attached. */}
                        <Button
                            label="Create account"
                            icon="arrow-forward"
                            iconAfter
                            size="lg"
                            fullWidth
                            loading={loading}
                            onPress={handleRegister}
                        />

                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already registered?</Text>
                            <TouchableOpacity
                                onPress={() => router.replace("/login")}
                                hitSlop={8}
                                accessibilityRole="button"
                            >
                                <Text style={styles.loginLink}> Sign in</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        marginBottom: 16,
    },
    backText: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: "700",
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xxl,
        padding: 22,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.md,
    },
    iconWrap: {
        width: 46,
        height: 46,
        borderRadius: Radius.lg,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    iconWrapDone: {
        backgroundColor: Colors.successLight,
    },
    title: {
        fontSize: 21,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.4,
    },
    subtitle: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 5,
        marginBottom: 18,
        lineHeight: 18,
    },
    steps: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: 18,
    },
    step: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },
    stepDot: {
        width: 21,
        height: 21,
        borderRadius: Radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.borderLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    stepDotActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primaryBorder,
    },
    stepDotDone: {
        backgroundColor: Colors.successDark,
        borderColor: Colors.successDark,
    },
    stepNum: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.textTertiary,
    },
    stepNumActive: {
        color: Colors.primaryDark,
    },
    stepLabel: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.textTertiary,
    },
    stepLabelOn: {
        color: Colors.textPrimary,
    },
    stepLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    // A settled address reads as a record rather than something still being
    // typed, so it drops the editable fill.
    emailLocked: {
        backgroundColor: Colors.surfaceMuted,
    },
    sendBtn: {
        marginTop: 2,
        marginBottom: 16,
    },
    changeEmailBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-end",
        marginTop: 2,
        marginBottom: 16,
    },
    changeEmailText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: Colors.primary,
    },
    otpBox: {
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.lg,
        padding: 14,
        marginBottom: 16,
    },
    otpTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.primaryDark,
    },
    otpHint: {
        fontSize: 11.5,
        color: Colors.primaryDark,
        opacity: 0.85,
        marginTop: 3,
        lineHeight: 16,
    },
    otpEmail: {
        fontWeight: "700",
    },
    otpCells: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 7,
        marginTop: 12,
        marginBottom: 12,
    },
    otpCell: {
        flex: 1,
        height: 52,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.primaryBorder,
        alignItems: "center",
        justifyContent: "center",
    },
    otpCellFilled: {
        borderColor: Colors.primary,
    },
    otpCellActive: {
        borderColor: Colors.primaryDark,
        backgroundColor: Colors.primaryLight,
    },
    otpCellError: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorLight,
    },
    otpChar: {
        fontSize: 21,
        fontWeight: "800",
        color: Colors.textPrimary,
    },
    // Invisible, but stretched across the boxes so a tap anywhere on the row
    // opens the keyboard and autofill still has a real input to target.
    otpInput: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0,
        color: "transparent",
        fontSize: 21,
        textAlign: "center",
    },
    otpErrorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 10,
    },
    otpErrorText: {
        flex: 1,
        fontSize: 11.5,
        fontWeight: "600",
        color: Colors.errorDark,
        lineHeight: 15,
    },
    resendRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
        marginTop: 10,
    },
    otpFoot: {
        fontSize: 11,
        color: Colors.primaryDark,
        opacity: 0.8,
        textAlign: "center",
    },
    resendLink: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.primaryDark,
        textDecorationLine: "underline",
    },
    strength: {
        marginTop: -4,
        marginBottom: 16,
    },
    strengthHead: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    strengthLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
    },
    strengthValue: {
        fontSize: 11,
        fontWeight: "800",
    },
    rules: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 8,
    },
    rule: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ruleText: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    ruleTextOk: {
        color: Colors.successDark,
        fontWeight: "600",
    },
    loginRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    loginText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    loginLink: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.primary,
    },
});
