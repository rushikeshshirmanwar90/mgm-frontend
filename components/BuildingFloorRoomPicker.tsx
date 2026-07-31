import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Building, BuildingsResponse, Floor, FloorsResponse, Room, RoomsResponse } from "@/lib/types";
import { apiRequest } from "@/lib/api";

interface BuildingFloorRoomPickerProps {
    selectedBuildingId: string | null;
    selectedFloorId: string | null;
    selectedRoomId: string | null;
    onSelectBuilding: (building: Building) => void;
    onSelectFloor: (floor: Floor) => void;
    onSelectRoom: (room: Room | null) => void;
}

export const BuildingFloorRoomPicker: React.FC<BuildingFloorRoomPickerProps> = ({
    selectedBuildingId,
    selectedFloorId,
    selectedRoomId,
    onSelectBuilding,
    onSelectFloor,
    onSelectRoom,
}) => {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);

    const [loadingBuildings, setLoadingBuildings] = useState(false);
    const [loadingFloors, setLoadingFloors] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);

    useEffect(() => {
        fetchBuildings();
    }, []);

    useEffect(() => {
        if (selectedBuildingId) {
            fetchFloors(selectedBuildingId);
        } else {
            setFloors([]);
            setRooms([]);
        }
    }, [selectedBuildingId]);

    useEffect(() => {
        if (selectedFloorId) {
            fetchRooms(selectedFloorId);
        } else {
            setRooms([]);
        }
    }, [selectedFloorId]);

    const fetchBuildings = async () => {
        setLoadingBuildings(true);
        try {
            const res = await apiRequest<BuildingsResponse>("/buildings");
            setBuildings(res.buildings || []);
        } catch (e) {
            console.error("Fetch buildings error", e);
        } finally {
            setLoadingBuildings(false);
        }
    };

    const fetchFloors = async (bId: string) => {
        setLoadingFloors(true);
        try {
            const res = await apiRequest<FloorsResponse>(`/floors?buildingId=${bId}`);
            setFloors(res.floors || []);
        } catch (e) {
            console.error("Fetch floors error", e);
        } finally {
            setLoadingFloors(false);
        }
    };

    const fetchRooms = async (fId: string) => {
        setLoadingRooms(true);
        try {
            const res = await apiRequest<RoomsResponse>(`/rooms?floorId=${fId}`);
            setRooms(res.rooms || []);
        } catch (e) {
            console.error("Fetch rooms error", e);
        } finally {
            setLoadingRooms(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* 1. Select Building */}
            <Text style={styles.sectionTitle}>1. Select Building *</Text>
            {loadingBuildings ? (
                <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {buildings.map((b) => {
                        const isSelected = selectedBuildingId === b._id;
                        return (
                            <TouchableOpacity
                                key={b._id}
                                style={[styles.chip, isSelected && styles.selectedChip]}
                                onPress={() => onSelectBuilding(b)}
                            >
                                <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                                    🏢 {b.name} ({b.code})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* 2. Select Floor */}
            {selectedBuildingId && (
                <>
                    <Text style={styles.sectionTitle}>2. Select Floor *</Text>
                    {loadingFloors ? (
                        <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />
                    ) : floors.length === 0 ? (
                        <Text style={styles.emptyText}>No floors added yet for this building.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                            {floors.map((f) => {
                                const isSelected = selectedFloorId === f._id;
                                return (
                                    <TouchableOpacity
                                        key={f._id}
                                        style={[styles.chip, isSelected && styles.selectedChip]}
                                        onPress={() => onSelectFloor(f)}
                                    >
                                        <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                                            📶 {f.name} (Prefix: {f.prefix})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </>
            )}

            {/* 3. Select Classroom / Washroom / Room */}
            {selectedFloorId && (
                <>
                    <Text style={styles.sectionTitle}>3. Select Classroom / Washroom (Optional)</Text>
                    {loadingRooms ? (
                        <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />
                    ) : rooms.length === 0 ? (
                        <Text style={styles.emptyText}>No specific rooms listed for this floor.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                            <TouchableOpacity
                                style={[styles.chip, !selectedRoomId && styles.selectedChip]}
                                onPress={() => onSelectRoom(null)}
                            >
                                <Text style={[styles.chipText, !selectedRoomId && styles.selectedChipText]}>
                                    Entire Floor / General
                                </Text>
                            </TouchableOpacity>

                            {rooms.map((r) => {
                                const isSelected = selectedRoomId === r._id;
                                const icon = r.roomType === "washroom" ? "🚽" : r.roomType === "lab" ? "🧪" : "🚪";
                                return (
                                    <TouchableOpacity
                                        key={r._id}
                                        style={[styles.chip, isSelected && styles.selectedChip]}
                                        onPress={() => onSelectRoom(r)}
                                    >
                                        <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                                            {icon} {r.roomNumber} - {r.name || r.roomType}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
        marginTop: 10,
        marginBottom: 6,
    },
    chipRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    chip: {
        backgroundColor: "#f3f4f6",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    selectedChip: {
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
    },
    chipText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4b5563",
    },
    selectedChipText: {
        color: "#ffffff",
    },
    emptyText: {
        fontSize: 12,
        color: "#9ca3af",
        fontStyle: "italic",
        marginVertical: 6,
    },
});
