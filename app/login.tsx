import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { useRouter } from "expo-router";

export default function LoginScreen() {
    const { login, seedDatabase } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Required", "Please enter both email and password.");
            return;
        }

        setLoading(true);
        try {
            const user = await login(email, password);
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

    const handleSeedAndFill = async (role: "admin" | "manager" | "staff") => {
        setSeeding(true);
        try {
            await seedDatabase();
            if (role === "admin") {
                setEmail("admin@mgm.edu");
                setPassword("admin123");
            } else if (role === "manager") {
                setEmail("manager@mgm.edu");
                setPassword("manager123");
            } else {
                setEmail("staff@mgm.edu");
                setPassword("staff123");
            }
            Alert.alert("Database Seeded", `Pre-filled ${role.toUpperCase()} credentials! Click Sign In.`);
        } catch (e) {
            Alert.alert(
                "Could Not Seed",
                e instanceof Error
                    ? e.message
                    : "Seeding failed. Is the backend running in development mode?"
            );
        } finally {
            setSeeding(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.logo}>🏫</Text>
                    <Text style={styles.title}>MGM Maintenance Portal</Text>
                    <Text style={styles.subtitle}>
                        College Infrastructure & Complaint Management System
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Sign In</Text>

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="e.g. staff@mgm.edu"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.loginBtn}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginBtnText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.registerRow}>
                        <Text style={styles.registerText}>Are you a staff member?</Text>
                        <TouchableOpacity onPress={() => router.push("/register")}>
                            <Text style={styles.registerLink}> Register Here</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Seed & Demo Fill Box */}
                <View style={styles.demoCard}>
                    <Text style={styles.demoTitle}>⚡ Quick Demo Credentials (Click to Fill)</Text>
                    <Text style={styles.demoSubtitle}>
                        Auto-seeds database with sample building, floors, rooms & users
                    </Text>

                    {seeding ? (
                        <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />
                    ) : (
                        <View style={styles.demoBtnRow}>
                            <TouchableOpacity
                                style={[styles.demoBtn, { backgroundColor: "#dbeafe" }]}
                                onPress={() => handleSeedAndFill("staff")}
                            >
                                <Text style={[styles.demoBtnText, { color: "#1d4ed8" }]}>👤 Staff Demo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.demoBtn, { backgroundColor: "#fef3c7" }]}
                                onPress={() => handleSeedAndFill("manager")}
                            >
                                <Text style={[styles.demoBtnText, { color: "#b45309" }]}>👔 Manager Demo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.demoBtn, { backgroundColor: "#fce7f3" }]}
                                onPress={() => handleSeedAndFill("admin")}
                            >
                                <Text style={[styles.demoBtnText, { color: "#be185d" }]}>👑 Admin Demo</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#f8fafc",
        padding: 24,
        justifyContent: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 28,
    },
    logo: {
        fontSize: 48,
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#0f172a",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        textAlign: "center",
        marginTop: 4,
    },
    formCard: {
        backgroundColor: "#ffffff",
        borderRadius: 18,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#f1f5f9",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    loginBtn: {
        backgroundColor: "#2563eb",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    loginBtnText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    registerRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 16,
    },
    registerText: {
        fontSize: 14,
        color: "#64748b",
    },
    registerLink: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563eb",
    },
    demoCard: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderStyle: "dashed",
    },
    demoTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#334155",
        marginBottom: 2,
    },
    demoSubtitle: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 12,
    },
    demoBtnRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    demoBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    demoBtnText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
