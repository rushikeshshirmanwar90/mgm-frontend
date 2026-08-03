import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const STEPS: { icon: IoniconName; title: string; caption: string }[] = [
    { icon: "camera-outline", title: "Report", caption: "Photo + where it is" },
    { icon: "construct-outline", title: "Repair", caption: "Manager assigns it" },
    { icon: "checkmark-done-outline", title: "Done", caption: "You get an update" },
];

interface HowItWorksProps {
    style?: StyleProp<ViewStyle>;
}

/**
 * Three-step explainer of the complaint lifecycle.
 *
 * Most staff will use this app rarely — a couple of times a year — so the flow
 * has to re-teach itself rather than assume anyone remembers it. Kept compact
 * enough to live permanently on the dashboard.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({ style }) => (
    <View style={[styles.card, style]}>
        {STEPS.map((step, i) => (
            <React.Fragment key={step.title}>
                <View style={styles.step}>
                    <View style={styles.iconWrap}>
                        <Ionicons name={step.icon} size={17} color={Colors.primary} />
                        <View style={styles.numberBadge}>
                            <Text style={styles.numberText}>{i + 1}</Text>
                        </View>
                    </View>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.caption} numberOfLines={2}>
                        {step.caption}
                    </Text>
                </View>

                {i < STEPS.length - 1 && (
                    <Ionicons
                        name="chevron-forward"
                        size={13}
                        color={Colors.textTertiary}
                        style={styles.chevron}
                    />
                )}
            </React.Fragment>
        ))}
    </View>
);

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        paddingVertical: 16,
        paddingHorizontal: 10,
        marginBottom: 22,
    },
    step: {
        flex: 1,
        alignItems: "center",
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    numberBadge: {
        position: "absolute",
        top: -5,
        right: -5,
        width: 17,
        height: 17,
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    numberText: {
        fontSize: 9,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    title: {
        fontSize: 12.5,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    caption: {
        fontSize: 10.5,
        color: Colors.textTertiary,
        textAlign: "center",
        marginTop: 2,
        lineHeight: 14,
    },
    chevron: {
        marginTop: 18,
    },
});
