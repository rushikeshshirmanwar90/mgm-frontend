import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Banner, Button, SectionTitle, TextField } from "@/components/ui";

type RoomType = "classroom" | "washroom" | "lab" | "office";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

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

const ROOM_ICONS: Record<string, IoniconName> = {
    washroom: "water-outline",
    lab: "flask-outline",
    office: "briefcase-outline",
    library: "library-outline",
    classroom: "school-outline",
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
                "Rooms Created",
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
            style={styles.page}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={loadBuildings}
                    tintColor={Colors.primary}
                    colors={[Colors.primary]}
                />
            }
        >
            <Text style={styles.intro}>
                Rooms are numbered automatically from each floor&apos;s prefix — G-1, G-2, F-1, S-1
                and so on.
            </Text>

            {busy && <ActivityIndicator color={Colors.primary} style={styles.busy} />}

            {/* 1. Buildings */}
            <SectionTitle
                title={`Buildings · ${buildings.length}`}
                action={
                    <Button label="Add" icon="add" size="sm" onPress={openCreateBuilding} />
                }
            />

            {buildings.length === 0 ? (
                <Text style={styles.emptyHint}>
                    No buildings yet. Add one to start mapping the campus.
                </Text>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tileRow}
                >
                    {buildings.map((b) => {
                        const isSelected = selectedBuilding?._id === b._id;
                        return (
                            <EntityTile
                                key={b._id}
                                icon="business"
                                title={b.name}
                                meta={b.code}
                                selected={isSelected}
                                onPress={() => setSelectedBuilding(b)}
                                onEdit={() => openEditBuilding(b)}
                                onDelete={() => handleDeleteBuilding(b)}
                            />
                        );
                    })}
                </ScrollView>
            )}

            {/* 2. Floors */}
            {selectedBuilding && (
                <View style={styles.section}>
                    <SectionTitle
                        title={`Floors in ${selectedBuilding.code} · ${floors.length}`}
                        action={
                            <Button label="Add" icon="add" size="sm" onPress={openCreateFloor} />
                        }
                    />

                    {floors.length === 0 ? (
                        <Text style={styles.emptyHint}>
                            No floors yet. Add a ground floor (number 0, prefix G) to begin.
                        </Text>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tileRow}
                        >
                            {floors.map((f) => (
                                <EntityTile
                                    key={f._id}
                                    icon="layers"
                                    title={f.name}
                                    meta={`Prefix ${f.prefix}`}
                                    selected={selectedFloor?._id === f._id}
                                    onPress={() => setSelectedFloor(f)}
                                    onEdit={() => openEditFloor(f)}
                                    onDelete={() => handleDeleteFloor(f)}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* 3. Rooms */}
            {selectedFloor && (
                <View style={styles.section}>
                    <SectionTitle
                        title={`Rooms on ${selectedFloor.name} · ${rooms.length}`}
                        action={
                            <Button
                                label="Batch add"
                                icon="add"
                                size="sm"
                                onPress={() => setRoomModalOpen(true)}
                            />
                        }
                    />

                    {rooms.length === 0 ? (
                        <Text style={styles.emptyHint}>No rooms on this floor yet.</Text>
                    ) : (
                        <View style={styles.roomsGrid}>
                            {rooms.map((r) => (
                                <View key={r._id} style={styles.roomCard}>
                                    <View style={styles.roomIconWrap}>
                                        <Ionicons
                                            name={ROOM_ICONS[r.roomType] ?? "cube-outline"}
                                            size={17}
                                            color={Colors.primary}
                                        />
                                    </View>
                                    <Text style={styles.roomNum}>{r.roomNumber}</Text>
                                    <Text style={styles.roomType} numberOfLines={1}>
                                        {r.name || r.roomType}
                                    </Text>
                                    <View style={styles.roomActions}>
                                        <TouchableOpacity
                                            onPress={() => openEditRoom(r)}
                                            hitSlop={8}
                                        >
                                            <Ionicons
                                                name="create-outline"
                                                size={15}
                                                color={Colors.textTertiary}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteRoom(r)}
                                            hitSlop={8}
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={15}
                                                color={Colors.error}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Building create/edit modal */}
            <FormSheet
                visible={buildingModalOpen}
                title={editingBuilding ? "Edit building" : "Add building"}
                subtitle="Buildings group the floors and rooms of your campus."
                onClose={() => setBuildingModalOpen(false)}
                onSubmit={handleSaveBuilding}
                submitLabel={editingBuilding ? "Save changes" : "Create building"}
                busy={busy}
            >
                <TextField
                    label="Building name"
                    icon="business-outline"
                    value={bName}
                    onChangeText={setBName}
                    placeholder="e.g. Science Block B"
                />
                <TextField
                    label="Building code"
                    icon="pricetag-outline"
                    value={bCode}
                    onChangeText={setBCode}
                    placeholder="e.g. SCI-B"
                    autoCapitalize="characters"
                />
            </FormSheet>

            {/* Floor create/edit modal */}
            <FormSheet
                visible={floorModalOpen}
                title={editingFloor ? "Edit floor" : "Add floor"}
                subtitle="The prefix drives automatic room numbering."
                onClose={() => setFloorModalOpen(false)}
                onSubmit={handleSaveFloor}
                submitLabel={editingFloor ? "Save changes" : "Create floor"}
                busy={busy}
            >
                <TextField
                    label="Floor name"
                    icon="layers-outline"
                    value={fName}
                    onChangeText={setFName}
                    placeholder="e.g. Ground Floor"
                />
                <TextField
                    label="Floor number"
                    hint="0 = ground"
                    icon="swap-vertical-outline"
                    value={fNum}
                    onChangeText={setFNum}
                    keyboardType="numeric"
                />
                <TextField
                    label="Room prefix"
                    hint="G → G-1"
                    icon="pricetag-outline"
                    value={fPrefix}
                    onChangeText={setFPrefix}
                    autoCapitalize="characters"
                />

                {editingFloor && rooms.length > 0 && (
                    <Banner
                        tone="info"
                        title="Prefix is locked"
                        message="This floor already has rooms — changing the prefix would leave their numbers out of sync."
                    />
                )}
            </FormSheet>

            {/* Batch add rooms modal */}
            <FormSheet
                visible={roomModalOpen}
                title="Batch add rooms"
                subtitle="Generate a run of rooms in one go."
                onClose={() => setRoomModalOpen(false)}
                onSubmit={handleCreateRooms}
                submitLabel="Generate rooms"
                busy={busy}
            >
                <Text style={styles.fieldLabel}>Room type</Text>
                <View style={styles.typeRow}>
                    {(["classroom", "washroom", "lab", "office"] as const).map((t) => {
                        const active = rType === t;
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setRType(t)}
                                activeOpacity={0.8}
                                style={[styles.typeChip, active && styles.typeChipActive]}
                            >
                                <Ionicons
                                    name={ROOM_ICONS[t] ?? "cube-outline"}
                                    size={15}
                                    color={active ? Colors.primaryDark : Colors.textTertiary}
                                />
                                <Text
                                    style={[
                                        styles.typeChipText,
                                        active && styles.typeChipTextActive,
                                    ]}
                                >
                                    {t}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TextField
                    label="Number of rooms"
                    hint="1–50"
                    icon="calculator-outline"
                    value={rCount}
                    onChangeText={setRCount}
                    keyboardType="numeric"
                />

                {selectedFloor && (
                    <Banner
                        tone="info"
                        title="Continues existing numbering"
                        message={`New rooms follow the highest existing number on ${selectedFloor.name}, using the ${selectedFloor.prefix} prefix.`}
                    />
                )}
            </FormSheet>

            {/* Edit single room modal */}
            <FormSheet
                visible={editingRoom !== null}
                title="Edit room"
                subtitle="Rename a room or correct its number."
                onClose={() => setEditingRoom(null)}
                onSubmit={handleSaveRoom}
                submitLabel="Save changes"
                busy={busy}
            >
                <TextField
                    label="Room number"
                    icon="pricetag-outline"
                    value={erNumber}
                    onChangeText={setErNumber}
                    autoCapitalize="characters"
                />
                <TextField
                    label="Display name"
                    hint="optional"
                    icon="text-outline"
                    value={erName}
                    onChangeText={setErName}
                    placeholder="e.g. Physics Lecture Hall"
                />
            </FormSheet>
        </ScrollView>
    );
}

/** Selectable card for a building or floor, with inline edit/delete. */
const EntityTile: React.FC<{
    icon: IoniconName;
    title: string;
    meta: string;
    selected: boolean;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ icon, title, meta, selected, onPress, onEdit, onDelete }) => (
    <View style={[styles.tile, selected && styles.tileSelected]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tileBody}>
            <View style={[styles.tileIcon, selected && styles.tileIconSelected]}>
                <Ionicons
                    name={icon}
                    size={16}
                    color={selected ? "#FFFFFF" : Colors.primary}
                />
            </View>
            <View style={styles.tileText}>
                <Text
                    style={[styles.tileTitle, selected && styles.tileTitleSelected]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
                <Text
                    style={[styles.tileMeta, selected && styles.tileMetaSelected]}
                    numberOfLines={1}
                >
                    {meta}
                </Text>
            </View>
        </TouchableOpacity>

        <View style={styles.tileActions}>
            <TouchableOpacity onPress={onEdit} hitSlop={8}>
                <Ionicons
                    name="create-outline"
                    size={15}
                    color={selected ? "#C5DDF4" : Colors.textTertiary}
                />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8}>
                <Ionicons
                    name="trash-outline"
                    size={15}
                    color={selected ? "#F8C9C9" : Colors.error}
                />
            </TouchableOpacity>
        </View>
    </View>
);

/** Bottom-sheet modal shared by every create/edit form on this screen. */
const FormSheet: React.FC<{
    visible: boolean;
    title: string;
    subtitle: string;
    submitLabel: string;
    busy: boolean;
    onClose: () => void;
    onSubmit: () => void;
    children: React.ReactNode;
}> = ({ visible, title, subtitle, submitLabel, busy, onClose, onSubmit, children }) => {
    // Keeps the sheet's action buttons clear of the system navigation area.
    const insets = useSafeAreaInsets();

    return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
        >
            <View style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
                <View style={styles.grabber} />

                <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderText}>
                        <Text style={styles.sheetTitle}>{title}</Text>
                        <Text style={styles.sheetSubtitle}>{subtitle}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={10}>
                        <Ionicons name="close" size={22} color={Colors.textTertiary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.sheetBody}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>

                <View style={styles.sheetActions}>
                    <Button
                        label="Cancel"
                        variant="ghost"
                        size="lg"
                        onPress={onClose}
                        style={styles.sheetActionBtn}
                    />
                    <Button
                        label={submitLabel}
                        icon="checkmark"
                        size="lg"
                        loading={busy}
                        onPress={onSubmit}
                        style={styles.sheetActionBtn}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    </Modal>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        padding: 16,
        paddingBottom: 36,
    },
    intro: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 18,
    },
    busy: {
        marginBottom: 12,
    },
    section: {
        marginTop: 26,
    },
    emptyHint: {
        fontSize: 12.5,
        color: Colors.textTertiary,
        fontStyle: "italic",
        paddingVertical: 6,
    },
    tileRow: {
        gap: 10,
        paddingRight: 4,
        paddingBottom: 4,
    },
    tile: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        paddingHorizontal: 12,
        paddingVertical: 11,
        minWidth: 168,
        ...Shadow.sm,
    },
    tileSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primaryDark,
    },
    tileBody: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    tileIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    tileIconSelected: {
        backgroundColor: "rgba(255,255,255,0.22)",
    },
    tileText: {
        flex: 1,
    },
    tileTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    tileTitleSelected: {
        color: "#FFFFFF",
    },
    tileMeta: {
        fontSize: 11,
        color: Colors.textTertiary,
        fontWeight: "600",
        marginTop: 1,
    },
    tileMetaSelected: {
        color: "#C5DDF4",
    },
    tileActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 14,
        marginTop: 10,
    },
    roomsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    roomCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: 12,
        width: "31%",
        flexGrow: 1,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.sm,
    },
    roomIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 11,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    roomNum: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    roomType: {
        fontSize: 10.5,
        color: Colors.textTertiary,
        marginTop: 1,
        textTransform: "capitalize",
    },
    roomActions: {
        flexDirection: "row",
        gap: 16,
        marginTop: 10,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    typeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 18,
    },
    typeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: Radius.md,
        backgroundColor: Colors.borderLight,
        borderWidth: 1,
        borderColor: "transparent",
        flexGrow: 1,
        justifyContent: "center",
    },
    typeChipActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    typeChipText: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "capitalize",
    },
    typeChipTextActive: {
        color: Colors.primaryDark,
    },
    modalOverlay: {
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
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    sheetHeaderText: {
        flex: 1,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    sheetBody: {
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    sheetActions: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    sheetActionBtn: {
        flex: 1,
    },
});
