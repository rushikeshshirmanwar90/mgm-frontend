import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Shadow } from "@/constants/theme";
import { Button, TextField } from "./ui";

interface ReasonSheetProps {
    visible: boolean;
    title: string;
    subtitle: string;
    placeholder: string;
    confirmLabel: string;
    confirmIcon?: React.ComponentProps<typeof Ionicons>["name"];
    confirmVariant?: "primary" | "danger";
    busy?: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

/**
 * Bottom sheet that asks for a written reason before an action goes through —
 * putting a complaint on hold, or a Director sending an estimate back. The
 * person on the other end only gets this text, so it is always required.
 */
export const ReasonSheet: React.FC<ReasonSheetProps> = ({
    visible,
    title,
    subtitle,
    placeholder,
    confirmLabel,
    confirmIcon = "checkmark",
    confirmVariant = "primary",
    busy = false,
    onClose,
    onSubmit,
}) => {
    const insets = useSafeAreaInsets();
    const [reason, setReason] = useState("");

    // Start blank each time it opens, so one complaint's reason never carries
    // over to the next.
    useEffect(() => {
        if (visible) setReason("");
    }, [visible]);

    const submit = () => {
        if (!reason.trim()) {
            Alert.alert("Reason required", "Please write a reason before continuing.");
            return;
        }
        onSubmit(reason.trim());
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.overlay}
            >
                <View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }]}>
                    <View style={styles.grabber} />
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>

                    <TextField
                        label="Reason"
                        icon="chatbubble-ellipses-outline"
                        multiline
                        value={reason}
                        onChangeText={setReason}
                        placeholder={placeholder}
                    />

                    <View style={styles.actions}>
                        <Button
                            label="Cancel"
                            variant="ghost"
                            size="lg"
                            onPress={onClose}
                            disabled={busy}
                            style={styles.btn}
                        />
                        <Button
                            label={confirmLabel}
                            icon={confirmIcon}
                            variant={confirmVariant}
                            size="lg"
                            loading={busy}
                            onPress={submit}
                            style={styles.btn}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.55)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        paddingHorizontal: 20,
        ...Shadow.lg,
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        alignSelf: "center",
        marginBottom: 18,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 4,
        marginBottom: 20,
        lineHeight: 18,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
    },
    btn: {
        flex: 1,
    },
});
