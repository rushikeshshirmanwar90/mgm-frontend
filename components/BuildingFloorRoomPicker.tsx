import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    Building,
    BuildingsResponse,
    Floor,
    FloorsResponse,
    Room,
    RoomsResponse,
} from "@/lib/types";
import { apiRequest } from "@/lib/api";
import { Colors, Radius } from "@/constants/theme";
import { ChipGroup } from "./ui/Chip";

interface BuildingFloorRoomPickerProps {
    selectedBuildingId: string | null;
    selectedFloorId: string | null;
    selectedRoomId: string | null;
    onSelectBuilding: (building: Building) => void;
    onSelectFloor: (floor: Floor) => void;
    onSelectRoom: (room: Room | null) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const ROOM_ICONS: Record<string, IoniconName> = {
    washroom: "water-outline",
    lab: "flask-outline",
    office: "briefcase-outline",
    library: "library-outline",
    classroom: "school-outline",
};

/** Numbered step header: index bubble, title, and a done tick once chosen. */
const Step: React.FC<{
    index: number;
    title: string;
    optional?: boolean;
    done: boolean;
}> = ({ index, title, optional, done }) => (
    <View style={styles.stepRow}>
        <View style={[styles.stepBubble, done && styles.stepBubbleDone]}>
            {done ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            ) : (
                <Text style={styles.stepNumber}>{index}</Text>
            )}
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        {optional && <Text style={styles.stepOptional}>optional</Text>}
    </View>
);

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

    const spinner = <ActivityIndicator color={Colors.primary} style={styles.spinner} />;

    return (
        <View>
            {/* 1. Building */}
            <Step index={1} title="Building" done={!!selectedBuildingId} />
            {loadingBuildings ? (
                spinner
            ) : buildings.length === 0 ? (
                <Text style={styles.emptyText}>No buildings configured yet.</Text>
            ) : (
                <ChipGroup
                    options={buildings.map((b) => ({
                        key: b._id,
                        label: `${b.name} · ${b.code}`,
                        icon: "business-outline" as IoniconName,
                    }))}
                    value={selectedBuildingId ?? ""}
                    onChange={(id) => {
                        const building = buildings.find((b) => b._id === id);
                        if (building) onSelectBuilding(building);
                    }}
                    style={styles.chipRow}
                />
            )}

            {/* 2. Floor */}
            {selectedBuildingId && (
                <>
                    <Step index={2} title="Floor" done={!!selectedFloorId} />
                    {loadingFloors ? (
                        spinner
                    ) : floors.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No floors added yet for this building.
                        </Text>
                    ) : (
                        <ChipGroup
                            options={floors.map((f) => ({
                                key: f._id,
                                label: `${f.name} · ${f.prefix}`,
                                icon: "layers-outline" as IoniconName,
                            }))}
                            value={selectedFloorId ?? ""}
                            onChange={(id) => {
                                const floor = floors.find((f) => f._id === id);
                                if (floor) onSelectFloor(floor);
                            }}
                            style={styles.chipRow}
                        />
                    )}
                </>
            )}

            {/* 3. Room */}
            {selectedFloorId && (
                <>
                    <Step index={3} title="Room" optional done={!!selectedRoomId} />
                    {loadingRooms ? (
                        spinner
                    ) : rooms.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No specific rooms listed for this floor.
                        </Text>
                    ) : (
                        <ChipGroup
                            options={[
                                {
                                    key: "__general__",
                                    label: "Entire floor",
                                    icon: "expand-outline" as IoniconName,
                                },
                                ...rooms.map((r) => ({
                                    key: r._id,
                                    label: `${r.roomNumber} · ${r.name || r.roomType}`,
                                    icon: ROOM_ICONS[r.roomType] ?? ("cube-outline" as IoniconName),
                                })),
                            ]}
                            value={selectedRoomId ?? "__general__"}
                            onChange={(id) => {
                                if (id === "__general__") {
                                    onSelectRoom(null);
                                    return;
                                }
                                const room = rooms.find((r) => r._id === id);
                                if (room) onSelectRoom(room);
                            }}
                            style={styles.chipRow}
                        />
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 16,
        marginBottom: 10,
    },
    stepBubble: {
        width: 20,
        height: 20,
        borderRadius: Radius.full,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    stepBubbleDone: {
        backgroundColor: Colors.primary,
    },
    stepNumber: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.primaryDark,
    },
    stepTitle: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    stepOptional: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    chipRow: {
        marginBottom: 2,
    },
    spinner: {
        alignSelf: "flex-start",
        marginVertical: 8,
    },
    emptyText: {
        fontSize: 12.5,
        color: Colors.textTertiary,
        fontStyle: "italic",
        marginBottom: 4,
    },
});
