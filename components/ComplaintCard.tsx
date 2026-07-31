import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Complaint } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface ComplaintCardProps {
    complaint: Complaint;
    onPress?: () => void;
    showCost?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
    complaint,
    onPress,
    showCost = false,
}) => {
    const buildingName = typeof complaint.buildingId === "object" ? complaint.buildingId.name : "Building";
    const floorName = typeof complaint.floorId === "object" ? complaint.floorId.name : "Floor";
    const roomInfo = typeof complaint.roomId === "object" && complaint.roomId ? complaint.roomId.roomNumber : null;
    const raisedByName = typeof complaint.raisedBy === "object" ? complaint.raisedBy.name : "Staff";

    const costDetails = complaint.costDetails;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.header}>
                <StatusBadge status={complaint.status} />
                <Text style={styles.date}>
                    {new Date(complaint.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <Text style={styles.title}>{complaint.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
                {complaint.description}
            </Text>

            <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>📍 Location:</Text>
                <Text style={styles.locationValue}>
                    {buildingName} › {floorName} {roomInfo ? `(${roomInfo})` : complaint.locationType}
                </Text>
            </View>

            {complaint.photos && complaint.photos.length > 0 && (
                <View style={styles.photoRow}>
                    {complaint.photos.slice(0, 3).map((photoUrl, idx) => (
                        <Image key={idx} source={{ uri: photoUrl }} style={styles.thumbnail} />
                    ))}
                    {complaint.photos.length > 3 && (
                        <View style={styles.morePhotos}>
                            <Text style={styles.moreText}>+{complaint.photos.length - 3}</Text>
                        </View>
                    )}
                </View>
            )}

            {showCost && costDetails && costDetails.totalCost > 0 && (
                <View style={styles.costBox}>
                    <Text style={styles.costTitle}>💰 Detailed Repair Cost:</Text>
                    <View style={styles.costGrid}>
                        <Text style={styles.costItem}>Labor: ₹{costDetails.laborCost}</Text>
                        <Text style={styles.costItem}>Material: ₹{costDetails.materialCost}</Text>
                        <Text style={styles.costItem}>Other: ₹{costDetails.otherCost}</Text>
                    </View>
                    <Text style={styles.costTotal}>Total: ₹{costDetails.totalCost}</Text>
                </View>
            )}

            <View style={styles.footer}>
                <Text style={styles.raisedBy}>By: {raisedByName}</Text>
                <Text style={[styles.priority, getPriorityStyle(complaint.priority)]}>
                    {complaint.priority.toUpperCase()} PRIORITY
                </Text>
            </View>
        </TouchableOpacity>
    );
};

function getPriorityStyle(priority: string) {
    switch (priority) {
        case "critical":
            return { color: "#dc2626", fontWeight: "bold" as const };
        case "high":
            return { color: "#ea580c", fontWeight: "600" as const };
        case "medium":
            return { color: "#d97706" };
        default:
            return { color: "#6b7280" };
    }
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 16,
        marginVertical: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#f3f4f6",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
        color: "#9ca3af",
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1f2937",
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: "#4b5563",
        marginBottom: 10,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        padding: 8,
        borderRadius: 8,
        marginBottom: 10,
    },
    locationLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginRight: 6,
    },
    locationValue: {
        fontSize: 13,
        color: "#2563eb",
        fontWeight: "500",
        flex: 1,
    },
    photoRow: {
        flexDirection: "row",
        marginBottom: 10,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 8,
    },
    morePhotos: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
    },
    moreText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#4b5563",
    },
    costBox: {
        backgroundColor: "#f0fdf4",
        borderColor: "#bbf7d0",
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    costTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#15803d",
        marginBottom: 4,
    },
    costGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    costItem: {
        fontSize: 12,
        color: "#166534",
    },
    costTotal: {
        fontSize: 14,
        fontWeight: "800",
        color: "#166534",
        textAlign: "right",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
        paddingTop: 8,
    },
    raisedBy: {
        fontSize: 12,
        color: "#6b7280",
    },
    priority: {
        fontSize: 11,
    },
});
