import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { Complaint, CostResponse } from "@/lib/types";
import { Colors, Radius, Shadow, inr } from "@/constants/theme";
import { Button, IconChip, TextField } from "./ui";

interface CostModalProps {
    visible: boolean;
    complaintId: string;
    initialLaborCost?: number;
    initialMaterialCost?: number;
    initialOtherCost?: number;
    initialNotes?: string;
    onClose: () => void;
    onSuccess: (updatedComplaint: Complaint) => void;
}

export const CostModal: React.FC<CostModalProps> = ({
    visible,
    complaintId,
    initialLaborCost = 0,
    initialMaterialCost = 0,
    initialOtherCost = 0,
    initialNotes = "",
    onClose,
    onSuccess,
}) => {
    const [laborCost, setLaborCost] = useState(initialLaborCost.toString());
    const [materialCost, setMaterialCost] = useState(initialMaterialCost.toString());
    const [otherCost, setOtherCost] = useState(initialOtherCost.toString());
    const [notes, setNotes] = useState(initialNotes);
    const [loading, setLoading] = useState(false);
    // The sheet sits flush against the bottom edge, so its buttons would fall
    // under the Android gesture bar without this.
    const insets = useSafeAreaInsets();

    // Re-seed the fields whenever the modal is opened for a (possibly different)
    // complaint. useState alone only captures the first render's props, so
    // without this the form would show the previously-edited complaint's figures
    // if this component ever stays mounted between openings.
    useEffect(() => {
        if (!visible) return;
        setLaborCost(initialLaborCost.toString());
        setMaterialCost(initialMaterialCost.toString());
        setOtherCost(initialOtherCost.toString());
        setNotes(initialNotes);
    }, [visible, complaintId, initialLaborCost, initialMaterialCost, initialOtherCost, initialNotes]);

    const parsed = {
        laborCost: parseFloat(laborCost) || 0,
        materialCost: parseFloat(materialCost) || 0,
        otherCost: parseFloat(otherCost) || 0,
    };
    const total = parsed.laborCost + parsed.materialCost + parsed.otherCost;

    const negative =
        parsed.laborCost < 0 || parsed.materialCost < 0 || parsed.otherCost < 0;

    const handleSave = async () => {
        if (negative) {
            Alert.alert("Invalid Cost", "Costs cannot be negative.");
            return;
        }

        setLoading(true);
        try {
            const data = await apiRequest<CostResponse>(`/complaints/${complaintId}/cost`, {
                method: "POST",
                body: JSON.stringify({ ...parsed, notes }),
            });

            Alert.alert("Success", "Cost breakdown saved successfully!");
            onSuccess(data.complaint);
            onClose();
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to save cost details"
            );
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
                        <IconChip name="cash-outline" color={Colors.money} size={38} />
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Repair Cost</Text>
                            <Text style={styles.subtitle}>
                                Break the spend down by labor, materials and other expenses.
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
                        {/* Each field is wrapped so the two share the row evenly;
                            TextField itself sizes to its content. */}
                        <View style={styles.costRow}>
                            <View style={styles.costCol}>
                                <TextField
                                    label="Labor"
                                    icon="hammer-outline"
                                    keyboardType="numeric"
                                    value={laborCost}
                                    onChangeText={setLaborCost}
                                    placeholder="0"
                                />
                            </View>
                            <View style={styles.costCol}>
                                <TextField
                                    label="Material"
                                    icon="cube-outline"
                                    keyboardType="numeric"
                                    value={materialCost}
                                    onChangeText={setMaterialCost}
                                    placeholder="0"
                                />
                            </View>
                        </View>

                        <TextField
                            label="Other expenses"
                            icon="receipt-outline"
                            keyboardType="numeric"
                            value={otherCost}
                            onChangeText={setOtherCost}
                            placeholder="0"
                        />

                        <TextField
                            label="Notes"
                            hint="optional"
                            icon="document-text-outline"
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="e.g. Purchased 2 switches, 1 LED tube light"
                        />

                        <View style={styles.totalBox}>
                            <View>
                                <Text style={styles.totalLabel}>Grand Total</Text>
                                <Text style={styles.totalHint}>Labor + material + other</Text>
                            </View>
                            <Text style={styles.totalValue}>{inr(total)}</Text>
                        </View>

                        {negative && (
                            <View style={styles.warning}>
                                <Ionicons name="alert-circle" size={15} color={Colors.errorDark} />
                                <Text style={styles.warningText}>Costs cannot be negative.</Text>
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
                            label="Save Cost"
                            icon="checkmark"
                            size="lg"
                            onPress={handleSave}
                            loading={loading}
                            disabled={negative}
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
        paddingBottom: 22,
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
    costRow: {
        flexDirection: "row",
        gap: 10,
    },
    costCol: {
        flex: 1,
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
        marginTop: 2,
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    totalHint: {
        fontSize: 11,
        color: Colors.primary,
        marginTop: 2,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.6,
    },
    warning: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    warningText: {
        color: Colors.errorDark,
        fontSize: 12,
        fontWeight: "600",
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
