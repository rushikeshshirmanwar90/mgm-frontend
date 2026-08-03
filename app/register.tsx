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
import { useRouter } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Banner, Button, TextField } from "@/components/ui";

export default function RegisterScreen() {
    const { register } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [department, setDepartment] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert("Required", "Please fill in all required fields (Name, Email, Password).");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Password Too Short", "Please choose a password of at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            // No `role` is sent: sign-up always creates a pending staff account,
            // and the server ignores any role supplied here.
            const res = await register({ name, email, password, department, phone });

            Alert.alert(
                res.emailSent ? "OTP Sent" : "Account Created",
                res.message ||
                    "Registration initiated! Please enter the OTP sent to your email to verify.",
                [
                    {
                        text: "Verify Email",
                        onPress: () =>
                            router.push({
                                pathname: "/verify-otp",
                                params: { email, devOtp: res.otp },
                            }),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                "Registration Error",
                error instanceof Error ? error.message : "Failed to register account."
            );
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
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        hitSlop={8}
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
                            MGM College campus.
                        </Text>

                        <TextField
                            label="Full name"
                            icon="person-outline"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Prof. Sharma"
                        />

                        <TextField
                            label="Email address"
                            icon="mail-outline"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="sharma@mgm.edu"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TextField
                            label="Password"
                            icon="lock-closed-outline"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="At least 6 characters"
                            isPassword
                            autoCapitalize="none"
                        />

                        <TextField
                            label="Department"
                            hint="optional"
                            icon="school-outline"
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="e.g. Mechanical Dept"
                        />

                        <TextField
                            label="Phone number"
                            hint="optional"
                            icon="call-outline"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="9876543210"
                            keyboardType="phone-pad"
                        />

                        <Banner
                            tone="info"
                            title="Approval required"
                            message="After email verification, the Estate Manager reviews your registration before login access is activated."
                        />

                        <Button
                            label="Create account"
                            icon="arrow-forward"
                            iconAfter
                            size="lg"
                            fullWidth
                            loading={loading}
                            onPress={handleRegister}
                        />
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
        marginBottom: 22,
        lineHeight: 18,
    },
});
