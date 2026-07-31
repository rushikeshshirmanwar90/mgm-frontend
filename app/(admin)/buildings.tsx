import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    RefreshControl,
} from "react-native";
import { apiRequest } from "@/lib/api";
import {
    Building,
    BuildingResponse,
    BuildingsResponse,
    Floor,
    FloorResponse,
    FloorsResponse,
    Room,
    RoomsResponse,
} from "@/lib/types";

type RoomType = "classroom" | "washroom" | "lab" | "office";

/** Mirrors the backend's default prefix per floor number. */
function defaultPrefixFor(floorNumber: number): string {
    switch (floorNumber) {
        case 0:
            return "G";
        case 1:
            return "F";
        case 2:
            return "S";
        case 3:
            return "T";
        default:
            return `${floorNumber}F`;
    }
}

function defaultNameFor(floorNumber: number): string {
    switch (floorNumber) {
        case 0:
            return "Ground Floor";
        case 1:
            return "First Floor";
        case 2:
            return "Second Floor";
        case 3:
            return "Third Floor";
        default:
            return `Floor ${floorNumber}`;
    }
}

const ROOM_ICONS: Record<string, string> = {
    washroom: "🚽",
    lab: "🧪",
    office: "🗄️",
    library: "📚",
    classroom: "🏫",
};

export default function ManageBuildingsScreen() {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);

    // Building modal — doubles as create and edit.
    const [buildingModalOpen, setBuildingModalOpen] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [bName, setBName] = useState("");
    const [bCode, setBCode] = useState("");

    // Floor modal — doubles as create and edit.
    const [floorModalOpen, setFloorModalOpen] = useState(false);
    const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
    const [fName, setFName] = useState("");
    const [fNum, setFNum] = useState("0");
    const [fPrefix, setFPrefix] = useState("G");

    // Room modals.
    const [roomModalOpen, setRoomModalOpen] = useState(false);
    const [rType, setRType] = useState<RoomType>("classroom");
    const [rCount, setRCount] = useState("3");

    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [erNumber, setErNumber] = useState("");
    const [erName, setErName] = useState("");

    const loadBuildings = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<BuildingsResponse>("/buildings");
            const list = data.buildings || [];
            setBuildings(list);

            // Keep the current selection if it still exists, otherwise fall back
            // to the first building.
            setSelectedBuilding((current) => {
                if (current) {
                    const stillThere = list.find((b) => b._id === current._id);
                    if (stillThere) return stillThere;
                }
                return list[0] ?? null;
            });
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not load buildings");
        } finally {
            setRefreshing(false);
        }
    }, []);

    const loadFloors = useCallback(async (buildingId: string) => {
        try {
            const data = await apiRequest<FloorsResponse>(`/floors?buildingId=${buildingId}`);
            const list = data.floors || [];
            setFloors(list);
            setSelectedFloor((current) => {
                if (current) {
                    const stillThere = list.find((f) => f._id === current._id);
                    if (stillThere) return stillThere;
                }
                return list[0] ?? null;
            });
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not load floors");
        }
    }, []);

    const loadRooms = useCallback(async (floorId: string) => {
        try {
            const data = await apiRequest<RoomsResponse>(`/rooms?floorId=${floorId}`);
            setRooms(data.rooms || []);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not load rooms");
        }
    }, []);

    useEffect(() => {
        loadBuildings();
    }, [loadBuildings]);

    useEffect(() => {
        if (selectedBuilding) {
            loadFloors(selectedBuilding._id);
        } else {
            setFloors([]);
            setSelectedFloor(null);
            setRooms([]);
        }
    }, [selectedBuilding, loadFloors]);

    useEffect(() => {
        if (selectedFloor) {
            loadRooms(selectedFloor._id);
        } else {
            setRooms([]);
        }
    }, [selectedFloor, loadRooms]);

    /** Alert.alert wrapped as a promise so handlers can await a confirmation. */
    const confirm = (title: string, message: string, confirmLabel = "Delete") =>
        new Promise<boolean>((resolve) => {
            Alert.alert(title, message, [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
            ]);
        });

    // ---- Buildings ----

    const openCreateBuilding = () => {
        setEditingBuilding(null);
        setBName("");
        setBCode("");
        setBuildingModalOpen(true);
    };

    const openEditBuilding = (building: Building) => {
        setEditingBuilding(building);
        setBName(building.name);
        setBCode(building.code);
        setBuildingModalOpen(true);
    };

    const handleSaveBuilding = async () => {
        if (!bName.trim() || !bCode.trim()) {
            Alert.alert("Required", "Please enter both a building name and code.");
            return;
        }

        setBusy(true);
        try {
            const body = JSON.stringify({ name: bName.trim(), code: bCode.trim() });
            const res = editingBuilding
                ? await apiRequest<BuildingResponse>(`/buildings/${editingBuilding._id}`, {
                      method: "PUT",
                      body,
                  })
                : await apiRequest<BuildingResponse>("/buildings", { method: "POST", body });

            setBuildingModalOpen(false);
            if (editingBuilding) setSelectedBuilding(res.building);
            await loadBuildings();
            Alert.alert("Success", editingBuilding ? "Building updated." : "Building created.");
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to save building");
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteBuilding = async (building: Building) => {
        const ok = await confirm(
            `Delete ${building.name}?`,
            "All of its floors and rooms will be deleted too. This cannot be undone."
        );
        if (!ok) return;

        setBusy(true);
        try {
            await apiRequest(`/buildings/${building._id}`, { method: "DELETE" });
            if (selectedBuilding?._id === building._id) setSelectedBuilding(null);
            await loadBuildings();
            Alert.alert("Deleted", `${building.name} has been removed.`);
        } catch (e) {
            // The backend refuses to delete anything still referenced by a
            // complaint, and says how many — surface that verbatim.
            Alert.alert("Cannot Delete", e instanceof Error ? e.message : "Failed to delete");
        } finally {
            setBusy(false);
        }
    };

    // ---- Floors ----

    const openCreateFloor = () => {
        const nextNum = floors.length;
        setEditingFloor(null);
        setFNum(String(nextNum));
        setFName(defaultNameFor(nextNum));
        setFPrefix(defaultPrefixFor(nextNum));
        setFloorModalOpen(true);
    };

    const openEditFloor = (floor: Floor) => {
        setEditingFloor(floor);
        setFNum(String(floor.floorNumber));
        setFName(floor.name);
        setFPrefix(floor.prefix);
        setFloorModalOpen(true);
    };

    const handleSaveFloor = async () => {
        if (!selectedBuilding) return;
        if (!fName.trim()) {
            Alert.alert("Required", "Please enter a floor name.");
            return;
        }

        const floorNumber = parseInt(fNum, 10);
        if (Number.isNaN(floorNumber) || floorNumber < 0) {
            Alert.alert("Invalid Floor Number", "Enter 0 for ground floor, 1 for first, and so on.");
            return;
        }

        setBusy(true);
        try {
            if (editingFloor) {
                const res = await apiRequest<FloorResponse>(`/floors/${editingFloor._id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        name: fName.trim(),
                        floorNumber,
                        prefix: fPrefix.trim().toUpperCase(),
                    }),
                });
                setSelectedFloor(res.floor);
            } else {
                await apiRequest<FloorResponse>("/floors", {
                    method: "POST",
                    body: JSON.stringify({
                        buildingId: selectedBuilding._id,
                        name: fName.trim(),
                        floorNumber,
                        prefix: fPrefix.trim().toUpperCase(),
                    }),
                });
            }

            setFloorModalOpen(false);
            await loadFloors(selectedBuilding._id);
            Alert.alert(
                "Success",
                editingFloor
                    ? "Floor updated."
                    : `Floor added with prefix "${fPrefix.trim().toUpperCase()}".`
            );
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to save floor");
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteFloor = async (floor: Floor) => {
        const ok = await confirm(
            `Delete ${floor.name}?`,
            "Every room on this floor will be deleted too. This cannot be undone."
        );
        if (!ok) return;

        setBusy(true);
        try {
            await apiRequest(`/floors/${floor._id}`, { method: "DELETE" });
            if (selectedFloor?._id === floor._id) setSelectedFloor(null);
            if (selectedBuilding) await loadFloors(selectedBuilding._id);
            Alert.alert("Deleted", `${floor.name} has been removed.`);
        } catch (e) {
            Alert.alert("Cannot Delete", e instanceof Error ? e.message : "Failed to delete");
        } finally {
            setBusy(false);
        }
    };

    // ---- Rooms ----

    const handleCreateRooms = async () => {
        if (!selectedFloor) return;

        const count = parseInt(rCount, 10);
        if (Number.isNaN(count) || count < 1 || count > 50) {
            Alert.alert("Invalid Count", "Enter a number between 1 and 50.");
            return;
        }

        setBusy(true);
        try {
            const res = await apiRequest<RoomsResponse>("/rooms", {
                method: "POST",
                body: JSON.stringify({ floorId: selectedFloor._id, roomType: rType, count }),
            });
            setRoomModalOpen(false);
            await loadRooms(selectedFloor._id);
            Alert.alert(
                "Rooms Created 🚪",
                `Created ${res.rooms.map((r) => r.roomNumber).join(", ")}.`
            );
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to create rooms");
        } finally {
            setBusy(false);
        }
    };

    const openEditRoom = (room: Room) => {
        setEditingRoom(room);
        setErNumber(room.roomNumber);
        setErName(room.name || "");
    };

    const handleSaveRoom = async () => {
        if (!editingRoom || !selectedFloor) return;
        if (!erNumber.trim()) {
            Alert.alert("Required", "Room number cannot be empty.");
            return;
        }

        setBusy(true);
        try {
            await apiRequest(`/rooms/${editingRoom._id}`, {
                method: "PUT",
                body: JSON.stringify({ roomNumber: erNumber.trim(), name: erName.trim() }),
            });
            setEditingRoom(null);
            await loadRooms(selectedFloor._id);
            Alert.alert("Success", "Room updated.");
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to update room");
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteRoom = async (room: Room) => {
        const ok = await confirm(`Delete ${room.roomNumber}?`, "This cannot be undone.");
        if (!ok) return;

        setBusy(true);
        try {
            await apiRequest(`/rooms/${room._id}`, { method: "DELETE" });
            if (selectedFloor) await loadRooms(selectedFloor._id);
        } catch (e) {
            Alert.alert("Cannot Delete", e instanceof Error ? e.message : "Failed to delete");
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadBuildings} />}
        >
            <Text style={styles.headerTitle}>Campus Infrastructure Management 🏢</Text>
            <Text style={styles.headerSub}>
                Configure buildings, floors, and classrooms. Rooms are numbered automatically from
                each floor&apos;s prefix (G-1, G-2, F-1, S-1...).
            </Text>

            {busy && <ActivityIndicator color="#be185d" style={{ marginBottom: 10 }} />}

            {/* 1. Buildings */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>1. Buildings ({buildings.length})</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openCreateBuilding}>
                    <Text style={styles.addBtnText}>+ Add Building</Text>
                </TouchableOpacity>
            </View>

            {buildings.length === 0 ? (
                <Text style={styles.emptyHint}>
                    No buildings yet. Add one to start mapping the campus.
                </Text>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {buildings.map((b) => {
                        const isSelected = selectedBuilding?._id === b._id;
                        return (
                            <View key={b._id} style={[styles.chip, isSelected && styles.selectedChip]}>
                                <TouchableOpacity onPress={() => setSelectedBuilding(b)}>
                                    <Text
                                        style={[styles.chipText, isSelected && styles.selectedChipText]}
                                    >
                                        🏢 {b.name} ({b.code})
                                    </Text>
                                </TouchableOpacity>
                                <View style={styles.chipActions}>
                                    <TouchableOpacity onPress={() => openEditBuilding(b)}>
                                        <Text style={styles.chipAction}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteBuilding(b)}>
                                        <Text style={styles.chipAction}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* 2. Floors */}
            {selectedBuilding && (
                <View style={{ marginTop: 20 }}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            2. Floors in {selectedBuilding.code} ({floors.length})
                        </Text>
                        <TouchableOpacity style={styles.addBtn} onPress={openCreateFloor}>
                            <Text style={styles.addBtnText}>+ Add Floor</Text>
                        </TouchableOpacity>
                    </View>

                    {floors.length === 0 ? (
                        <Text style={styles.emptyHint}>
                            No floors yet. Add a ground floor (number 0, prefix G) to begin.
                        </Text>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipRow}
                        >
                            {floors.map((f) => {
                                const isSelected = selectedFloor?._id === f._id;
                                return (
                                    <View
                                        key={f._id}
                                        style={[styles.chip, isSelected && styles.selectedChip]}
                                    >
                                        <TouchableOpacity onPress={() => setSelectedFloor(f)}>
                                            <Text
                                                style={[
                                                    styles.chipText,
                                                    isSelected && styles.selectedChipText,
                                                ]}
                                            >
                                                📶 {f.name} ({f.prefix})
                                            </Text>
                                        </TouchableOpacity>
                                        <View style={styles.chipActions}>
                                            <TouchableOpacity onPress={() => openEditFloor(f)}>
                                                <Text style={styles.chipAction}>✏️</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteFloor(f)}>
                                                <Text style={styles.chipAction}>🗑️</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* 3. Rooms */}
            {selectedFloor && (
                <View style={{ marginTop: 20, marginBottom: 32 }}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            3. Rooms on {selectedFloor.name} ({rooms.length})
                        </Text>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setRoomModalOpen(true)}>
                            <Text style={styles.addBtnText}>+ Batch Add</Text>
                        </TouchableOpacity>
                    </View>

                    {rooms.length === 0 ? (
                        <Text style={styles.emptyHint}>No rooms on this floor yet.</Text>
                    ) : (
                        <View style={styles.roomsGrid}>
                            {rooms.map((r) => (
                                <View key={r._id} style={styles.roomCard}>
                                    <Text style={styles.roomIcon}>
                                        {ROOM_ICONS[r.roomType] ?? "🚪"}
                                    </Text>
                                    <Text style={styles.roomNum}>{r.roomNumber}</Text>
                                    <Text style={styles.roomTypeLabel} numberOfLines={1}>
                                        {r.name || r.roomType}
                                    </Text>
                                    <View style={styles.roomActions}>
                                        <TouchableOpacity onPress={() => openEditRoom(r)}>
                                            <Text style={styles.chipAction}>✏️</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteRoom(r)}>
                                            <Text style={styles.chipAction}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Building create/edit modal */}
            <Modal visible={buildingModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingBuilding ? "Edit Building 🏢" : "Add New Building 🏢"}
                        </Text>
                        <Text style={styles.label}>Building Name</Text>
                        <TextInput
                            style={styles.input}
                            value={bName}
                            onChangeText={setBName}
                            placeholder="e.g. Science Block B"
                        />
                        <Text style={styles.label}>Building Code</Text>
                        <TextInput
                            style={styles.input}
                            value={bCode}
                            onChangeText={setBCode}
                            placeholder="e.g. SCI-B"
                            autoCapitalize="characters"
                        />

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setBuildingModalOpen(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveBuilding}
                                disabled={busy}
                            >
                                <Text style={styles.saveText}>
                                    {editingBuilding ? "Save Changes" : "Save Building"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Floor create/edit modal */}
            <Modal visible={floorModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingFloor ? "Edit Floor 📶" : "Add Floor to Building 📶"}
                        </Text>
                        <Text style={styles.label}>Floor Name</Text>
                        <TextInput
                            style={styles.input}
                            value={fName}
                            onChangeText={setFName}
                            placeholder="e.g. Ground Floor"
                        />
                        <Text style={styles.label}>Floor Number (0 = Ground, 1 = First, 2 = Second)</Text>
                        <TextInput
                            style={styles.input}
                            value={fNum}
                            onChangeText={setFNum}
                            keyboardType="numeric"
                        />
                        <Text style={styles.label}>Room Prefix (G for G-1, F for F-1, S for S-1)</Text>
                        <TextInput
                            style={styles.input}
                            value={fPrefix}
                            onChangeText={setFPrefix}
                            autoCapitalize="characters"
                        />

                        {editingFloor && rooms.length > 0 && (
                            <Text style={styles.autoNotice}>
                                ℹ️ The prefix can&apos;t be changed while this floor has rooms — their
                                numbers would no longer match.
                            </Text>
                        )}

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setFloorModalOpen(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveFloor}
                                disabled={busy}
                            >
                                <Text style={styles.saveText}>
                                    {editingFloor ? "Save Changes" : "Save Floor"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Batch add rooms modal */}
            <Modal visible={roomModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Batch Add Rooms 🚪</Text>
                        <Text style={styles.label}>Room Type</Text>
                        <View style={styles.typeSelectorRow}>
                            {(["classroom", "washroom", "lab", "office"] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeSelChip, rType === t && styles.activeTypeSelChip]}
                                    onPress={() => setRType(t)}
                                >
                                    <Text
                                        style={[
                                            styles.typeSelText,
                                            rType === t && styles.activeTypeSelText,
                                        ]}
                                    >
                                        {ROOM_ICONS[t]} {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Number of Rooms (1–50)</Text>
                        <TextInput
                            style={styles.input}
                            value={rCount}
                            onChangeText={setRCount}
                            keyboardType="numeric"
                        />

                        {selectedFloor && (
                            <Text style={styles.autoNotice}>
                                ℹ️ Numbering continues from the highest existing room on{" "}
                                {selectedFloor.name} using the {selectedFloor.prefix} prefix.
                            </Text>
                        )}

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setRoomModalOpen(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleCreateRooms}
                                disabled={busy}
                            >
                                <Text style={styles.saveText}>Generate Rooms</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit single room modal */}
            <Modal visible={editingRoom !== null} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Room 🚪</Text>
                        <Text style={styles.label}>Room Number</Text>
                        <TextInput
                            style={styles.input}
                            value={erNumber}
                            onChangeText={setErNumber}
                            autoCapitalize="characters"
                        />
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={erName}
                            onChangeText={setErName}
                            placeholder="e.g. Physics Lecture Hall"
                        />

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setEditingRoom(null)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveRoom}
                                disabled={busy}
                            >
                                <Text style={styles.saveText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 4,
    },
    headerSub: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1e293b",
        flex: 1,
    },
    addBtn: {
        backgroundColor: "#be185d",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addBtnText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "700",
    },
    emptyHint: {
        fontSize: 13,
        color: "#94a3b8",
        fontStyle: "italic",
        paddingVertical: 8,
    },
    chipRow: {
        flexDirection: "row",
        marginBottom: 6,
    },
    chip: {
        backgroundColor: "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    selectedChip: {
        backgroundColor: "#be185d",
        borderColor: "#9d174d",
    },
    chipText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
    },
    selectedChipText: {
        color: "#ffffff",
    },
    chipActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 6,
    },
    chipAction: {
        fontSize: 14,
    },
    roomsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 6,
    },
    roomCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 14,
        width: "30%",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    roomIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    roomNum: {
        fontSize: 16,
        fontWeight: "800",
        color: "#0f172a",
    },
    roomTypeLabel: {
        fontSize: 11,
        color: "#64748b",
        marginTop: 2,
    },
    roomActions: {
        flexDirection: "row",
        gap: 14,
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 4,
        marginTop: 8,
    },
    input: {
        backgroundColor: "#f1f5f9",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    typeSelectorRow: {
        flexDirection: "row",
        gap: 6,
        marginVertical: 6,
    },
    typeSelChip: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: "center",
    },
    activeTypeSelChip: {
        backgroundColor: "#be185d",
    },
    typeSelText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#475569",
    },
    activeTypeSelText: {
        color: "#ffffff",
    },
    autoNotice: {
        fontSize: 12,
        color: "#be185d",
        backgroundColor: "#fce7f3",
        padding: 8,
        borderRadius: 6,
        marginTop: 10,
    },
    btnRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#f1f5f9",
    },
    cancelText: {
        color: "#475569",
        fontWeight: "600",
    },
    saveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#be185d",
    },
    saveText: {
        color: "#ffffff",
        fontWeight: "700",
    },
});
