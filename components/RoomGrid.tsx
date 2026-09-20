import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Room } from "@/lib/types";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface RoomGridProps {
    rooms: Room[];
    selectedRoomId: string | null;
    onSelectRoom: (room: Room | null) => void;
}

const TYPE_ICONS: Record<string, IoniconName> = {
    classroom: "school-outline",
    lab: "flask-outline",
    office: "briefcase-outline",
    library: "library-outline",
    other: "cube-outline",
};

const TYPE_LABELS: Record<string, string> = {
    classroom: "Classrooms",
    lab: "Labs",
    office: "Offices",
    library: "Library",
    other: "Other rooms",
};

interface Section {
    key: string;
    label: string;
    icon: IoniconName;
    rooms: Room[];
}

/**
 * Groups a floor's rooms into labelled sections — washrooms and anything
 * named as a common room pulled into their own category — the way a cinema's
 * seat map separates Recliner from Prime from Classic instead of listing
 * every seat in one flat block.
 */
function groupRooms(rooms: Room[]): Section[] {
    const washrooms = rooms.filter((r) => r.roomType === "washroom");
    const commonRooms = rooms.filter(
        (r) => r.roomType !== "washroom" && /common\s*room/i.test(r.name ?? "")
    );
    const commonRoomIds = new Set(commonRooms.map((r) => r._id));
    const rest = rooms.filter((r) => r.roomType !== "washroom" && !commonRoomIds.has(r._id));

    const byType = new Map<string, Room[]>();
    for (const room of rest) {
        const list = byType.get(room.roomType) ?? [];
        list.push(room);
        byType.set(room.roomType, list);
    }

    const sections: Section[] = [];
    // Classrooms first — the common case — then whatever other types exist.
    for (const type of ["classroom", "lab", "office", "library", "other"]) {
        const list = byType.get(type);
        if (list?.length) {
            sections.push({
                key: type,
                label: TYPE_LABELS[type] ?? type,
                icon: TYPE_ICONS[type] ?? "cube-outline",
                rooms: list,
            });
        }
    }
    if (commonRooms.length) {
        sections.push({
            key: "common",
            label: "Common Room",
            icon: "people-outline",
            rooms: commonRooms,
        });
    }
    if (washrooms.length) {
        sections.push({
            key: "washroom",
            label: "Washroom",
            icon: "water-outline",
            rooms: washrooms,
        });
    }
    return sections;
}

/**
 * Seat-map-style room picker: rooms group into labelled sections, each
 * rendered as a wrapped grid of tappable tiles instead of one long dropdown
 * list — mirrors the "pick your seat in the selected auditorium" pattern for
 * picking a specific class on the selected floor.
 */
export const RoomGrid: React.FC<RoomGridProps> = ({ rooms, selectedRoomId, onSelectRoom }) => {
    const sections = groupRooms(rooms);

    return (
        <View>
            <TouchableOpacity
                style={[styles.floorChip, !selectedRoomId && styles.floorChipActive]}
                onPress={() => onSelectRoom(null)}
                activeOpacity={0.8}
            >
                <Ionicons
                    name="expand-outline"
                    size={15}
                    color={!selectedRoomId ? "#FFFFFF" : Colors.primary}
                />
                <Text
                    style={[styles.floorChipText, !selectedRoomId && styles.floorChipTextActive]}
                >
                    Entire floor / not sure
                </Text>
            </TouchableOpacity>

            {sections.map((section) => (
                <View key={section.key} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name={section.icon} size={13} color={Colors.textSecondary} />
                        <Text style={styles.sectionLabel}>{section.label}</Text>
                    </View>
                    <View style={styles.grid}>
                        {section.rooms.map((room) => {
                            const active = room._id === selectedRoomId;
                            return (
                                <TouchableOpacity
                                    key={room._id}
                                    onPress={() => onSelectRoom(room)}
                                    activeOpacity={0.8}
                                    style={[styles.seat, active && styles.seatActive]}
                                >
                                    <Text
                                        style={[styles.seatText, active && styles.seatTextActive]}
                                        numberOfLines={1}
                                    >
                                        {room.roomNumber}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    floorChip: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        borderColor: Colors.primaryBorder,
        backgroundColor: Colors.surface,
        marginBottom: 16,
    },
    floorChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primaryDark,
    },
    floorChipText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.primary,
    },
    floorChipTextActive: {
        color: "#FFFFFF",
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    seat: {
        minWidth: 52,
        height: 40,
        paddingHorizontal: 8,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    seatActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primaryDark,
    },
    seatText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: Colors.textBody,
    },
    seatTextActive: {
        color: "#FFFFFF",
    },
});
