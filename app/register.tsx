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
import { useRouter } from "expo-router";

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
                res.emailSent ? "OTP Sent 📧" : "Account Created ⚠️",
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
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.title}>Staff Sign Up 📝</Text>
                    <Text style={styles.subtitle}>
                        Register to report maintenance & infrastructure damage in MGM College campus.
                    </Text>

                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Prof. Sharma"
                    />

                    <Text style={styles.label}>Email Address *</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="e.g. sharma@mgm.edu"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password *</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="At least 6 characters"
                        secureTextEntry
                    />

                    <Text style={styles.label}>Department (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={department}
                        onChangeText={setDepartment}
                        placeholder="e.g. Mechanical Dept / Science Dept"
                    />

                    <Text style={styles.label}>Phone Number (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="e.g. 9876543210"
                        keyboardType="phone-pad"
                    />

                    <View style={styles.noticeBox}>
                        <Text style={styles.noticeText}>
                            ℹ️ After email OTP verification, your registration will be reviewed by the Estate Manager before login access is activated.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.btn}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>Register Account</Text>
                        )}
                    </TouchableOpacity>
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
    backBtn: {
        marginBottom: 16,
    },
    backText: {
        fontSize: 14,
        color: "#2563eb",
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 18,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 20,
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
    noticeBox: {
        backgroundColor: "#eff6ff",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    noticeText: {
        fontSize: 12,
        color: "#1d4ed8",
        lineHeight: 16,
    },
    btn: {
        backgroundColor: "#2563eb",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 6,
    },
    btnText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
});
