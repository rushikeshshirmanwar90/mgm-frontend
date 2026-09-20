import React, { forwardRef, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import {
    Building,
    BuildingsResponse,
    Floor,
    FloorsResponse,
    Room,
    RoomsResponse,
} from "@/lib/types";
import { Colors, Radius } from "@/constants/theme";

export interface RoomMatch {
    building: Building;
    floor: Floor;
    room: Room;
}

interface RoomCodeSearchProps {
    onMatch: (match: RoomMatch) => void;
}

/** "G-3" and "g 3" should both find room "G-3" — dashes/spaces/case don't matter. */
const normalize = (s: string) => s.toUpperCase().replace(/[\s-]/g, "");

/**
 * Type a class code (e.g. "G3" or "F2") to jump straight to that
 * building/floor/room instead of stepping through the pickers by hand.
 * Fetches the full building → floor → room tree once (all three list
 * endpoints already support being called with no filter) and matches
 * client-side, since the dataset for one campus is small.
 */
export const RoomCodeSearch = forwardRef<TextInput, RoomCodeSearchProps>(({ onMatch }, ref) => {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState<RoomMatch[]>([]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [buildingsRes, floorsRes, roomsRes] = await Promise.all([
                    apiRequest<BuildingsResponse>("/buildings"),
                    apiRequest<FloorsResponse>("/floors"),
                    apiRequest<RoomsResponse>("/rooms"),
                ]);
                if (cancelled) return;

                const buildingsById = new Map(
                    (buildingsRes.buildings || []).map((b) => [b._id, b])
                );
                const floorsById = new Map((floorsRes.floors || []).map((f) => [f._id, f]));

                const built: RoomMatch[] = [];
                for (const room of roomsRes.rooms || []) {
                    const floor = floorsById.get(room.floorId);
                    if (!floor) continue;
                    const building = buildingsById.get(floor.buildingId);
                    if (!building) continue;
                    built.push({ building, floor, room });
                }
                setIndex(built);
            } catch (e) {
                console.error("Room search index error", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const results = useMemo(() => {
        const q = normalize(query);
        if (!q) return [];
        return index.filter((m) => normalize(m.room.roomNumber).includes(q)).slice(0, 6);
    }, [query, index]);

    return (
        <View style={styles.wrap}>
            <View style={styles.inputRow}>
                <Ionicons
                    name="search-outline"
                    size={17}
                    color={Colors.primary}
                    style={styles.icon}
                />
                <TextInput
                    ref={ref}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search a class, e.g. G3 or F2"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                ) : query.length > 0 ? (
                    <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {query.length > 0 && (
                <View style={styles.results}>
                    {results.length === 0 ? (
                        <Text style={styles.empty}>
                            No room matches &quot;{query}&quot;. Try just the class name, e.g. G3.
                        </Text>
                    ) : (
                        results.map((m, i) => (
                            <TouchableOpacity
                                key={m.room._id}
                                style={[
                                    styles.resultRow,
                                    i === results.length - 1 && styles.resultRowLast,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => {
                                    onMatch(m);
                                    setQuery("");
                                }}
                            >
                                <View style={styles.resultBadge}>
                                    <Text style={styles.resultBadgeText}>{m.room.roomNumber}</Text>
                                </View>
                                <View style={styles.resultText}>
                                    <Text style={styles.resultPrimary} numberOfLines={1}>
                                        {m.room.name || m.room.roomNumber}
                                    </Text>
                                    <Text style={styles.resultSecondary} numberOfLines={1}>
                                        {m.building.name} · {m.floor.name}
                                    </Text>
                                </View>
                                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}
        </View>
    );
});
RoomCodeSearch.displayName = "RoomCodeSearch";

const styles = StyleSheet.create({
    wrap: {
        marginBottom: 18,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primaryLight,
        borderWidth: 1.5,
        borderColor: Colors.primaryBorder,
        borderRadius: Radius.md,
        paddingHorizontal: 12,
        minHeight: 48,
        gap: 8,
    },
    icon: {
        marginRight: 2,
    },
    input: {
        flex: 1,
        fontSize: 14.5,
        fontWeight: "600",
        color: Colors.textBody,
        paddingVertical: 12,
    },
    results: {
        marginTop: 8,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        overflow: "hidden",
    },
    empty: {
        padding: 12,
        fontSize: 12,
        color: Colors.textTertiary,
        fontStyle: "italic",
    },
    resultRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    resultRowLast: {
        borderBottomWidth: 0,
    },
    resultBadge: {
        minWidth: 40,
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
    },
    resultBadgeText: {
        fontSize: 11.5,
        fontWeight: "800",
        color: Colors.primaryDark,
    },
    resultText: {
        flex: 1,
    },
    resultPrimary: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.textPrimary,
    },
    resultSecondary: {
        fontSize: 11,
        color: Colors.textTertiary,
        marginTop: 1,
    },
});
