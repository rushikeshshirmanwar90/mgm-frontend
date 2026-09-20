import React, { useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ComplaintDetailContent } from "@/components/ComplaintDetailContent";
import { TICKET_PAGE_BG } from "@/components/ComplaintTicket";
import { Colors } from "@/constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

/**
 * Hosts one complaint's detail per page in a horizontal pager, so swiping
 * moves to the next/previous complaint from whichever list the user opened
 * this from — no need to back out and reopen another one. `ids` is the
 * full ordered list of complaint ids from that list screen; falls back to
 * just the single `id` if a screen didn't pass one (deep link, etc.).
 */
export default function ComplaintDetailScreen() {
    const { id, ids } = useLocalSearchParams<{ id: string; ids?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const idList = ids ? ids.split(",").filter(Boolean) : [id];
    const initialIndex = Math.max(0, idList.indexOf(id));
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const listRef = useRef<FlatList<string>>(null);

    const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(Math.min(Math.max(index, 0), idList.length - 1));
    };

    return (
        <View style={styles.root}>
            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={10}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Complaint</Text>
                    {idList.length > 1 && (
                        <Text style={styles.headerSubtitle}>
                            {activeIndex + 1} of {idList.length} · swipe for more
                        </Text>
                    )}
                </View>
                <View style={styles.backBtn} />
            </View>

            <FlatList
                ref={listRef}
                data={idList}
                keyExtractor={(item) => item}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                onMomentumScrollEnd={handleMomentumEnd}
                renderItem={({ item }) => (
                    <View style={{ width: SCREEN_WIDTH }}>
                        <ComplaintDetailContent id={item} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: TICKET_PAGE_BG,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingBottom: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTextWrap: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    headerSubtitle: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 1,
        fontWeight: "600",
    },
});
