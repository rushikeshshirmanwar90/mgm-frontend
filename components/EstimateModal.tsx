import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Complaint } from "@/lib/types";
import { COMPLAINT_CATEGORIES, runAction } from "@/lib/workflow";
import { Colors, Radius, Shadow, inr } from "@/constants/theme";
import { Button, IconChip, Select, TextField } from "./ui";

interface EstimateModalProps {
    visible: boolean;
    complaint: Complaint;
    onClose: () => void;
    onSuccess: (updated: Complaint) => void;
}

/**
 * The Estate Manager's first step on a new complaint: what kind of work it is
 * and roughly what it will cost. Submitting sends it to the Director.
 */
export const EstimateModal: React.FC<EstimateModalProps> = ({
    visible,
    complaint,
    onClose,
    onSuccess,
}) => {
    const insets = useSafeAreaInsets();
    const [category, setCategory] = useState<string | null>(null);
    const [categoryOther, setCategoryOther] = useState("");
    const [budget, setBudget] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    // Re-seed from the complaint each time it opens, so revising a sent-back
    // estimate starts from what was submitted before.
    useEffect(() => {
        if (!visible) return;
        setCategory(complaint.category ?? null);
        setCategoryOther(complaint.categoryOther ?? "");
        setBudget(complaint.estimatedBudget ? String(complaint.estimatedBudget) : "");
        setNotes(complaint.estimateNotes ?? "");
    }, [visible, complaint]);

    const amount = parseFloat(budget);
    const isOther = category === "other";
    const valid =
        !!category &&
        (!isOther || !!categoryOther.trim()) &&
        Number.isFinite(amount) &&
        amount > 0;

    const submit = async () => {
        if (!category) {
            Alert.alert("Category required", "Pick the category this complaint falls under.");
            return;
        }
        if (isOther && !categoryOther.trim()) {
            Alert.alert("Category required", "Type what category this complaint falls under.");
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            Alert.alert("Budget required", "Enter an estimated budget greater than zero.");
            return;
        }

        setLoading(true);
        try {
            const updated = await runAction(complaint._id, "estimate", {
                category,
                categoryOther: isOther ? categoryOther.trim() : undefined,
                estimatedBudget: amount,
                estimateNotes: notes.trim(),
            });
            onSuccess(updated);
            onClose();
            Alert.alert("Sent for approval", "The Director has been asked to approve this estimate.");
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not save the estimate.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.overlay}
            >
                <View style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
                    <View style={styles.grabber} />

                    <View style={styles.header}>
                        <IconChip name="calculator-outline" color={Colors.primary} size={38} />
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Estimated budget</Text>
                            <Text style={styles.subtitle}>
                                Categorise the work and estimate its cost. The Director
                                approves it before work can start.
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={10} disabled={loading}>
                            <Ionicons name="close" size={22} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Select
                            label="Category"
                            icon="pricetag-outline"
                            placeholder="Select a category"
                            options={COMPLAINT_CATEGORIES}
                            value={category}
                            onChange={setCategory}
                            containerStyle={styles.select}
                        />

                        {isOther && (
                            <TextField
                                label="Specify the category"
                                icon="create-outline"
                                value={categoryOther}
                                onChangeText={setCategoryOther}
                                placeholder="e.g. Lift maintenance"
                                autoFocus
                            />
                        )}

                        <TextField
                            label="Estimated budget (₹)"
                            icon="cash-outline"
                            keyboardType="numeric"
                            value={budget}
                            onChangeText={setBudget}
                            placeholder="e.g. 4500"
                        />

                        <TextField
                            label="Notes for the Director"
                            hint="optional"
                            icon="document-text-outline"
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="e.g. Replace 2 ceiling fan motors and rewire the switchboard."
                        />

                        {Number.isFinite(amount) && amount > 0 && (
                            <View style={styles.totalBox}>
                                <Text style={styles.totalLabel}>Sent for approval</Text>
                                <Text style={styles.totalValue}>{inr(amount)}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.actions}>
                        <Button
                            label="Cancel"
                            variant="ghost"
                            size="lg"
                            onPress={onClose}
                            disabled={loading}
                            style={styles.actionBtn}
                        />
                        <Button
                            label="Send to Director"
                            icon="send"
                            size="lg"
                            onPress={submit}
                            loading={loading}
                            disabled={!valid}
                            style={styles.actionBtn}
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
        maxHeight: "92%",
        ...Shadow.lg,
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        alignSelf: "center",
        marginBottom: 14,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
        lineHeight: 16,
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    select: {
        marginBottom: 14,
    },
    totalBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        borderRadius: Radius.lg,
        padding: 16,
        marginBottom: 12,
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.6,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    actionBtn: {
        flex: 1,
    },
});
