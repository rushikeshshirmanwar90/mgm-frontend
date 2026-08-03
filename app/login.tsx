import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
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

type DemoRole = "staff" | "manager" | "admin";

const DEMO_ROLES: {
    role: DemoRole;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
    { role: "staff", label: "Staff", icon: "person-outline" },
    { role: "manager", label: "Manager", icon: "briefcase-outline" },
    { role: "admin", label: "Admin", icon: "shield-checkmark-outline" },
];

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

    const handleSeedAndFill = async (role: DemoRole) => {
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
            Alert.alert(
                "Database Seeded",
                `Pre-filled ${role.toUpperCase()} credentials! Click Sign In.`
            );
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

                    {/* Demo credentials */}
                    <View style={styles.demoCard}>
                        <View style={styles.demoHeader}>
                            <Ionicons name="flash" size={14} color={Colors.warningDark} />
                            <Text style={styles.demoTitle}>Quick demo access</Text>
                        </View>
                        <Text style={styles.demoSubtitle}>
                            Seeds sample buildings, floors, rooms and users, then fills the form.
                        </Text>

                        {seeding ? (
                            <ActivityIndicator color={Colors.primary} style={styles.demoSpinner} />
                        ) : (
                            <View style={styles.demoBtnRow}>
                                {DEMO_ROLES.map(({ role, label, icon }) => (
                                    <TouchableOpacity
                                        key={role}
                                        style={styles.demoBtn}
                                        onPress={() => handleSeedAndFill(role)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name={icon} size={16} color={Colors.primary} />
                                        <Text style={styles.demoBtnText}>{label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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
    demoCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: "dashed",
    },
    demoHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    demoTitle: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    demoSubtitle: {
        fontSize: 11.5,
        color: Colors.textTertiary,
        marginTop: 4,
        marginBottom: 12,
        lineHeight: 16,
    },
    demoSpinner: {
        marginVertical: 10,
    },
    demoBtnRow: {
        flexDirection: "row",
        gap: 8,
    },
    demoBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    demoBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.primaryDark,
    },
});
