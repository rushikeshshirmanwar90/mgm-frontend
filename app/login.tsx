import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { useRouter } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Button, TextField } from "@/components/ui";

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Required", "Please enter both email and password.");
            return;
        }

        setLoading(true);
        try {
            const user = await login(email, password);

            // Pending staff are let in deliberately, so say why the app looks
            // half-empty before they go hunting for the missing Report tab.
            if (user.role === "staff" && !user.isApproved) {
                Alert.alert(
                    "Registration not approved yet",
                    "You're signed in, but the Estate Manager hasn't approved your registration yet. You won't be able to report issues until they do — we'll email you as soon as it's reviewed."
                );
            }

            if (user.role === "admin") router.replace("/(admin)");
            else if (user.role === "manager") router.replace("/(manager)");
            else router.replace("/(staff)");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Invalid credentials";

            // Branch on the structured flag rather than matching words in the
            // message, so rewording the server response can't break this.
            if (error instanceof ApiError && error.payload.isEmailVerified === false) {
                Alert.alert("Email Unverified", message, [
                    {
                        text: "Verify Now",
                        onPress: () =>
                            router.push({ pathname: "/verify-otp", params: { email } }),
                    },
                    { text: "Cancel", style: "cancel" },
                ]);
            } else {
                Alert.alert("Login Failed", message);
            }
        } finally {
            setLoading(false);
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
                    showsVerticalScrollIndicator={false}
                >
                    {/* Brand */}
                    <View style={styles.header}>
                        <View style={styles.logoMark}>
                            <Ionicons name="business" size={28} color="#FFFFFF" />
                        </View>
                        <Text style={styles.title}>MGM Maintenance</Text>
                        <Text style={styles.subtitle}>
                            Campus infrastructure & complaint management
                        </Text>
                    </View>

                    {/* Sign-in form */}
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Welcome back</Text>
                        <Text style={styles.formSubtitle}>
                            Sign in to report and track campus issues.
                        </Text>

                        <TextField
                            label="Email address"
                            icon="mail-outline"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="staff@mgm.edu"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />

                        <TextField
                            label="Password"
                            icon="lock-closed-outline"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            isPassword
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            style={styles.forgotPassBtn}
                            onPress={() => router.push("/forgot-password")}
                            hitSlop={8}
                        >
                            <Text style={styles.forgotPassText}>Forgot password?</Text>
                        </TouchableOpacity>

                        <Button
                            label="Sign In"
                            icon="arrow-forward"
                            iconAfter
                            size="lg"
                            fullWidth
                            loading={loading}
                            onPress={handleLogin}
                            style={styles.signInBtn}
                        />

                        <View style={styles.registerRow}>
                            <Text style={styles.registerText}>Are you a staff member?</Text>
                            <TouchableOpacity
                                onPress={() => router.push("/register")}
                                hitSlop={8}
                            >
                                <Text style={styles.registerLink}> Register here</Text>
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
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: "center",
        marginTop: 5,
    },
    formCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xxl,
        padding: 22,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        marginBottom: 18,
        ...Shadow.md,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    formSubtitle: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 3,
        marginBottom: 20,
    },
    forgotPassBtn: {
        alignSelf: "flex-end",
        marginTop: 4,
        marginBottom: 16,
    },
    forgotPassText: {
        fontSize: 12.5,
        fontWeight: "600",
        color: Colors.primary,
    },
    signInBtn: {
        marginTop: 4,
    },
    registerRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    registerText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    registerLink: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.primary,
    },
});
