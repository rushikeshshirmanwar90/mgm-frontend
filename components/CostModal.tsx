import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from "react-native";
import { apiRequest } from "@/lib/api";
import { Complaint, CostResponse } from "@/lib/types";

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
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>💰 Add / Update Repair Cost</Text>
                    <Text style={styles.subtitle}>
                        Enter detailed cost breakdown for labor, materials, and other expenses.
                    </Text>

                    <Text style={styles.label}>Labor Cost (₹)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={laborCost}
                        onChangeText={setLaborCost}
                        placeholder="e.g. 500"
                    />

                    <Text style={styles.label}>Material Cost (₹)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={materialCost}
                        onChangeText={setMaterialCost}
                        placeholder="e.g. 1200"
                    />

                    <Text style={styles.label}>Other Cost (₹)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={otherCost}
                        onChangeText={setOtherCost}
                        placeholder="e.g. 150"
                    />

                    <Text style={styles.label}>Notes / Item Details</Text>
                    <TextInput
                        style={[styles.input, { height: 60 }]}
                        multiline
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="e.g. Purchased 2 switches, 1 LED tube light"
                    />

                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Grand Total Cost:</Text>
                        <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
                    </View>

                    {negative && (
                        <Text style={styles.warningText}>Costs cannot be negative.</Text>
                    )}

                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.cancelBtn]}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.saveBtn, negative && styles.disabledBtn]}
                            onPress={handleSave}
                            disabled={loading || negative}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveText}>Save Cost</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    container: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        elevation: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 4,
    },
    input: {
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        marginBottom: 12,
    },
    totalBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#eff6ff",
        padding: 12,
        borderRadius: 8,
        marginVertical: 12,
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1d4ed8",
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1d4ed8",
    },
    btnRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
    },
    cancelBtn: {
        backgroundColor: "#f3f4f6",
    },
    cancelText: {
        color: "#4b5563",
        fontWeight: "600",
    },
    saveBtn: {
        backgroundColor: "#2563eb",
    },
    disabledBtn: {
        opacity: 0.5,
    },
    warningText: {
        color: "#b91c1c",
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 10,
    },
    saveText: {
        color: "#ffffff",
        fontWeight: "700",
    },
});
