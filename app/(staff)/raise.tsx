import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { BuildingFloorRoomPicker } from "@/components/BuildingFloorRoomPicker";
import { RoomCodeSearch, RoomMatch } from "@/components/RoomCodeSearch";
import { ApprovalStatusNotice } from "@/components/ApprovalStatusNotice";
import { Building, Floor, Room } from "@/lib/types";
import { apiRequest, uploadImageToCloudinary } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { Colors, PriorityColors, Radius } from "@/constants/theme";
import { Button, Card, Screen, SectionTitle, Select, TextField } from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type Step = "location" | "details";

const LOCATION_TYPES: { key: string; label: string; icon: IoniconName }[] = [
    { key: "classroom", label: "Classroom", icon: "school-outline" },
    { key: "washroom", label: "Washroom", icon: "water-outline" },
    { key: "lab", label: "Lab", icon: "flask-outline" },
    { key: "office", label: "Office", icon: "briefcase-outline" },
    { key: "other", label: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

/** Two-segment progress bar standing in for the "Where is the issue? / Issue details" card. */
function StepProgress({ step }: { step: Step }) {
    return (
        <View style={styles.stepProgress}>
            <View style={[styles.stepSegment, styles.stepSegmentActive]} />
            <View style={[styles.stepSegment, step === "details" && styles.stepSegmentActive]} />
        </View>
    );
}

export default function RaiseComplaintScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { user } = useAuth();

    const [step, setStep] = useState<Step>("location");
    const [searchOpen, setSearchOpen] = useState(false);

    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const [locationType, setLocationType] = useState<
        "classroom" | "washroom" | "lab" | "office" | "other"
    >("classroom");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

    const [localPhotos, setLocalPhotos] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const scrollRef = useRef<ScrollView>(null);
    const descriptionRef = useRef<TextInput>(null);
    const searchInputRef = useRef<TextInput>(null);

    // Header lives on this screen rather than in the Tabs layout: both
    // buttons need to reach into this screen's own state (which step we're
    // on, whether search is open) and refs.
    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => (step === "details" ? setStep("location") : router.back())}
                    hitSlop={10}
                    style={styles.headerBtn}
                    accessibilityRole="button"
                    accessibilityLabel={step === "details" ? "Back to location" : "Go back"}
                >
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
            ),
            headerRight:
                step === "location"
                    ? () => (
                          <TouchableOpacity
                              onPress={() => setSearchOpen((v) => !v)}
                              hitSlop={10}
                              style={styles.headerBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Search for a class by name"
                          >
                              <Ionicons
                                  name={searchOpen ? "close" : "search"}
                                  size={22}
                                  color={Colors.textSecondary}
                              />
                          </TouchableOpacity>
                      )
                    : undefined,
        });
    }, [navigation, router, step, searchOpen]);

    // Jump back to the top of whichever step's content just came into view,
    // rather than carrying over a scroll position from the other step.
    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [step]);

    useEffect(() => {
        if (searchOpen) {
            const t = setTimeout(() => searchInputRef.current?.focus(), 150);
            return () => clearTimeout(t);
        }
    }, [searchOpen]);

    const handleRoomMatch = (match: RoomMatch) => {
        setSelectedBuilding(match.building);
        setSelectedFloor(match.floor);
        setSelectedRoom(match.room);
        setLocationType(match.room.roomType as typeof locationType);
        setSearchOpen(false);
        Keyboard.dismiss();
    };

    /**
     * Offset of the details card inside the scroll content. The card is a direct
     * child of the content container, so `layout.y` is already the value
     * `scrollTo` wants — no measuring against native handles needed.
     */
    const detailsCardY = useRef(0);

    /**
     * Lifts the details card to the top of the viewport when one of its inputs
     * takes focus.
     *
     * Keyboard avoidance only pads the container — it never scrolls — so on a
     * short screen the description box would otherwise sit behind the keyboard
     * with no way to see what you're typing.
     */
    const handleDetailsFocus = () => {
        // Deferred a beat: the keyboard frame, and the content inset derived
        // from it, aren't applied until after the focus event fires.
        setTimeout(() => {
            scrollRef.current?.scrollTo({
                y: Math.max(detailsCardY.current - 12, 0),
                animated: true,
            });
        }, 120);
    };

    const addAssets = (result: ImagePicker.ImagePickerResult) => {
        if (result.canceled || !result.assets) return;
        const newPhotos = result.assets.map((a) => {
            if (a.base64) {
                const mime = a.mimeType || "image/jpeg";
                return `data:${mime};base64,${a.base64}`;
            }
            return a.uri;
        });
        setLocalPhotos((prev) => [...prev, ...newPhotos]);
    };

    /** Opens the camera so damage can be photographed on the spot. */
    const handleTakePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    "Camera Access Needed",
                    "Allow camera access in Settings to photograph the damage directly."
                );
                return;
            }

            addAssets(
                await ImagePicker.launchCameraAsync({
                    // `MediaTypeOptions` is deprecated in expo-image-picker 17;
                    // the array form is the supported API.
                    mediaTypes: ["images"],
                    quality: 0.7,
                    base64: true,
                })
            );
        } catch (e) {
            console.error("Camera error", e);
            Alert.alert("Camera Unavailable", "Could not open the camera on this device.");
        }
    };

    /** Picks existing photos from the device's library. */
    const handlePickFromGallery = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    "Photo Access Needed",
                    "Allow photo library access in Settings to attach existing photos."
                );
                return;
            }

            addAssets(
                await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsMultipleSelection: true,
                    quality: 0.7,
                    base64: true,
                })
            );
        } catch (e) {
            console.error("Image pick error", e);
            Alert.alert("Could Not Open Gallery", "Please try again.");
        }
    };

    const handleRemovePhoto = (index: number) => {
        setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        // Get the keyboard out of the way before any alert or navigation lands,
        // so a validation message isn't half-covered by it.
        Keyboard.dismiss();

        if (!selectedBuilding || !selectedFloor) {
            Alert.alert("Location Required", "Please select Building and Floor.");
            return;
        }

        if (!title.trim() || !description.trim()) {
            Alert.alert("Required Fields", "Please enter a Complaint Title and Description.");
            return;
        }

        setSubmitting(true);
        try {
            // Upload photos to Cloudinary.
            const uploadedUrls: string[] = [];
            let failedUploads = 0;
            let lastUploadError: string | null = null;

            for (const photoUri of localPhotos) {
                try {
                    uploadedUrls.push(await uploadImageToCloudinary(photoUri));
                } catch (imgErr) {
                    failedUploads += 1;
                    lastUploadError = imgErr instanceof Error ? imgErr.message : null;
                    console.error("Failed to upload a photo", imgErr);
                }
            }

            // The photo is the evidence, so losing all of them silently is not an
            // acceptable success. Stop and let the reporter decide.
            if (failedUploads > 0 && uploadedUrls.length === 0) {
                Alert.alert(
                    "Photo Upload Failed",
                    `${lastUploadError ?? "Your photos could not be uploaded."}\n\nSubmit this complaint without photos?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Submit Anyway",
                            onPress: () => submitComplaint([]),
                        },
                    ]
                );
                setSubmitting(false);
                return;
            }

            if (failedUploads > 0) {
                Alert.alert(
                    "Some Photos Failed",
                    `${failedUploads} of ${localPhotos.length} photos could not be uploaded. The complaint will be submitted with the ${uploadedUrls.length} that succeeded.`
                );
            }

            await submitComplaint(uploadedUrls);
        } catch (error) {
            Alert.alert(
                "Submission Failed",
                error instanceof Error ? error.message : "Failed to submit complaint."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const submitComplaint = async (photos: string[]) => {
        if (!selectedBuilding || !selectedFloor) return;

        try {
            await apiRequest("/complaints", {
                method: "POST",
                body: JSON.stringify({
                    buildingId: selectedBuilding._id,
                    floorId: selectedFloor._id,
                    roomId: selectedRoom ? selectedRoom._id : undefined,
                    locationType: selectedRoom ? selectedRoom.roomType : locationType,
                    title,
                    description,
                    priority,
                    photos,
                }),
            });

            Alert.alert(
                "Complaint Raised",
                "Your maintenance complaint has been submitted to the Estate Manager. You will be notified when it is resolved.",
                [
                    {
                        text: "View My Complaints",
                        onPress: () => router.replace("/(staff)/complaints"),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                "Submission Failed",
                error instanceof Error ? error.message : "Failed to submit complaint."
            );
        }
    };

    // The tab is removed for pending staff, so this is belt-and-braces for a
    // deep link or a stale navigator — and it explains itself rather than
    // rendering a form whose submit is guaranteed to 403.
    if (!user?.isApproved) {
        return (
            <Screen scroll>
                <ApprovalStatusNotice />
            </Screen>
        );
    }

    const canProceed = !!selectedBuilding && !!selectedFloor;

    return (
        <KeyboardAvoidingView
            // iOS gets its keyboard inset natively from the ScrollView below,
            // which also scrolls the focused input into view. Padding here as
            // well would shift the form by twice the keyboard height, so this
            // wrapper only does the work on Android.
            behavior="padding"
            enabled={Platform.OS === "android"}
            style={styles.flex}
        >
            <ScrollView
                ref={scrollRef}
                style={styles.page}
                contentContainerStyle={styles.container}
                // "handled" lets a tap on a chip or button go through while the
                // keyboard is open, instead of being eaten by the dismiss.
                keyboardShouldPersistTaps="handled"
                // Swipe the keyboard away without hunting for a Done key.
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                showsVerticalScrollIndicator={false}
            >
                <StepProgress step={step} />

                {step === "location" ? (
                    <View>
                        <SectionTitle title="Where is the issue?" />

                        {searchOpen && (
                            <RoomCodeSearch ref={searchInputRef} onMatch={handleRoomMatch} />
                        )}

                        <BuildingFloorRoomPicker
                            selectedBuildingId={selectedBuilding?._id || null}
                            selectedFloorId={selectedFloor?._id || null}
                            selectedRoomId={selectedRoom?._id || null}
                            onSelectBuilding={(b) => {
                                setSelectedBuilding(b);
                                setSelectedFloor(null);
                                setSelectedRoom(null);
                            }}
                            onSelectFloor={(f) => {
                                setSelectedFloor(f);
                                setSelectedRoom(null);
                            }}
                            onSelectRoom={(r) => {
                                setSelectedRoom(r);
                                if (r) setLocationType(r.roomType as any);
                            }}
                        />

                        {!selectedRoom && selectedFloor && (
                            <View style={styles.categoryBox}>
                                <Select
                                    label="Location category"
                                    placeholder="Select a category"
                                    options={LOCATION_TYPES.map((t) => ({
                                        key: t.key,
                                        label: t.label,
                                        icon: t.icon,
                                    }))}
                                    value={locationType}
                                    onChange={(key) => setLocationType(key as typeof locationType)}
                                />
                            </View>
                        )}

                        <Button
                            label="Next: Issue details"
                            icon="arrow-forward"
                            iconAfter
                            size="lg"
                            fullWidth
                            disabled={!canProceed}
                            onPress={() => setStep("details")}
                            style={styles.nextBtn}
                        />
                    </View>
                ) : (
                    <>
                        {/* Details */}
                        <View
                            onLayout={(e) => {
                                detailsCardY.current = e.nativeEvent.layout.y;
                            }}
                        >
                            <Card style={styles.card}>
                                <SectionTitle title="Issue details" />

                                <TextField
                                    label="Complaint title"
                                    icon="alert-circle-outline"
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="e.g. Broken AC switch board"
                                    onFocus={handleDetailsFocus}
                                    returnKeyType="next"
                                    // Hand off to the description without the keyboard
                                    // closing and reopening in between.
                                    submitBehavior="submit"
                                    onSubmitEditing={() => descriptionRef.current?.focus()}
                                />

                                <TextField
                                    ref={descriptionRef}
                                    label="Description"
                                    icon="document-text-outline"
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Describe what is damaged and any exact location details."
                                    onFocus={handleDetailsFocus}
                                    // Return inserts a line break here rather than
                                    // ending input — descriptions run to a few lines.
                                    submitBehavior="newline"
                                />

                                <Text style={styles.categoryLabel}>Priority</Text>
                                <View style={styles.priorityRow}>
                                    {PRIORITIES.map((p) => {
                                        const active = priority === p;
                                        const tone = PriorityColors[p];
                                        return (
                                            <TouchableOpacity
                                                key={p}
                                                onPress={() => setPriority(p)}
                                                activeOpacity={0.8}
                                                style={[
                                                    styles.priorityChip,
                                                    active && {
                                                        backgroundColor: tone.bg,
                                                        borderColor: tone.fg,
                                                    },
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.priorityDot,
                                                        {
                                                            backgroundColor: active
                                                                ? tone.fg
                                                                : Colors.border,
                                                        },
                                                    ]}
                                                />
                                                <Text
                                                    style={[
                                                        styles.priorityText,
                                                        active && { color: tone.fg },
                                                    ]}
                                                >
                                                    {p}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </Card>
                        </View>

                        {/* Photos */}
                        <Card style={styles.card}>
                            <SectionTitle
                                title="Damage photos"
                                action={
                                    localPhotos.length > 0 ? (
                                        <Text style={styles.photoCount}>
                                            {localPhotos.length} attached
                                        </Text>
                                    ) : null
                                }
                            />

                            <View style={styles.pickerRow}>
                                <TouchableOpacity
                                    style={styles.pickerOption}
                                    onPress={handleTakePhoto}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.pickerIcon}>
                                        <Ionicons name="camera" size={20} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.pickerLabel}>Take photo</Text>
                                    <Text style={styles.pickerHint}>Use the camera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.pickerOption}
                                    onPress={handlePickFromGallery}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.pickerIcon}>
                                        <Ionicons name="images" size={20} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.pickerLabel}>From gallery</Text>
                                    <Text style={styles.pickerHint}>Pick existing</Text>
                                </TouchableOpacity>
                            </View>

                            {localPhotos.length > 0 && (
                                <ScrollView
                                    horizontal
                                    style={styles.photoPreviewRow}
                                    showsHorizontalScrollIndicator={false}
                                >
                                    {localPhotos.map((uri, idx) => (
                                        <View key={idx} style={styles.photoWrapper}>
                                            <Image source={{ uri }} style={styles.photoPreview} />
                                            <TouchableOpacity
                                                style={styles.removePhotoBtn}
                                                onPress={() => handleRemovePhoto(idx)}
                                                hitSlop={6}
                                            >
                                                <Ionicons
                                                    name="close"
                                                    size={12}
                                                    color="#FFFFFF"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </Card>

                        <Button
                            label="Submit complaint"
                            icon="paper-plane-outline"
                            size="lg"
                            fullWidth
                            loading={submitting}
                            onPress={handleSubmit}
                        />
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    headerBtn: {
        marginHorizontal: 16,
        padding: 4,
    },
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        padding: 16,
        // Deep enough that the Submit button clears the keyboard once the
        // details card has been scrolled up to meet it.
        paddingBottom: 56,
    },
    stepProgress: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 18,
    },
    stepSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.borderLight,
    },
    stepSegmentActive: {
        backgroundColor: Colors.primary,
    },
    nextBtn: {
        marginTop: 22,
    },
    card: {
        marginBottom: 16,
    },
    categoryBox: {
        marginTop: 6,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingTop: 12,
    },
    categoryLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    priorityRow: {
        flexDirection: "row",
        gap: 6,
    },
    priorityChip: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingVertical: 9,
        paddingHorizontal: 4,
        borderRadius: Radius.md,
        backgroundColor: Colors.borderLight,
        borderWidth: 1,
        borderColor: "transparent",
    },
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    priorityText: {
        fontSize: 10.5,
        fontWeight: "800",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    photoCount: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primary,
    },
    pickerRow: {
        flexDirection: "row",
        gap: 10,
    },
    pickerOption: {
        flex: 1,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1.5,
        borderColor: Colors.primaryBorder,
        borderStyle: "dashed",
        borderRadius: Radius.lg,
        paddingVertical: 18,
        alignItems: "center",
    },
    pickerIcon: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: "rgba(255,255,255,0.75)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 9,
    },
    pickerLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.primaryDark,
    },
    pickerHint: {
        fontSize: 11,
        color: Colors.primary,
        marginTop: 2,
    },
    photoPreviewRow: {
        marginTop: 14,
    },
    photoWrapper: {
        position: "relative",
        marginRight: 10,
    },
    photoPreview: {
        width: 78,
        height: 78,
        borderRadius: Radius.md,
        backgroundColor: Colors.borderLight,
    },
    removePhotoBtn: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: Colors.error,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: Colors.surface,
    },
});
