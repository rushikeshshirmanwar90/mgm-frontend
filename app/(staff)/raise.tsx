import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { BuildingFloorRoomPicker } from "@/components/BuildingFloorRoomPicker";
import { Building, Floor, Room } from "@/lib/types";
import { apiRequest, isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/api";
import { useRouter } from "expo-router";
import { Colors, PriorityColors, Radius } from "@/constants/theme";
import { Banner, Button, Card, Chip, SectionTitle, TextField } from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const LOCATION_TYPES: { key: string; label: string; icon: IoniconName }[] = [
    { key: "classroom", label: "Classroom", icon: "school-outline" },
    { key: "washroom", label: "Washroom", icon: "water-outline" },
    { key: "lab", label: "Lab", icon: "flask-outline" },
    { key: "office", label: "Office", icon: "briefcase-outline" },
    { key: "other", label: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export default function RaiseComplaintScreen() {
    const router = useRouter();

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

    const addAssets = (result: ImagePicker.ImagePickerResult) => {
        if (result.canceled || !result.assets) return;
        setLocalPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
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
                    quality: 0.8,
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
                    quality: 0.8,
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

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
        >
            <ScrollView
                style={styles.page}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Location */}
                <Card accent style={styles.card}>
                    <SectionTitle title="Where is the issue?" />
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
                            <Text style={styles.categoryLabel}>Location category</Text>
                            <View style={styles.chipWrap}>
                                {LOCATION_TYPES.map((t) => (
                                    <Chip
                                        key={t.key}
                                        label={t.label}
                                        icon={t.icon}
                                        selected={locationType === t.key}
                                        onPress={() => setLocationType(t.key as any)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </Card>

                {/* Details */}
                <Card style={styles.card}>
                    <SectionTitle title="Issue details" />

                    <TextField
                        label="Complaint title"
                        icon="alert-circle-outline"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Broken AC switch board"
                    />

                    <TextField
                        label="Description"
                        icon="document-text-outline"
                        multiline
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe what is damaged and any exact location details."
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
                                            { backgroundColor: active ? tone.fg : Colors.border },
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

                    {/* Warn before they attach anything, rather than letting the
                        upload fail at submit time. */}
                    {!isCloudinaryConfigured && (
                        <Banner
                            tone="warning"
                            title="Photo uploads aren't set up yet"
                            message="You can still submit the complaint — it will just go through without photos."
                        />
                    )}

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
                                        <Ionicons name="close" size={12} color="#FFFFFF" />
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
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        padding: 16,
        paddingBottom: 36,
    },
    card: {
        marginBottom: 16,
    },
    categoryBox: {
        marginTop: 18,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingTop: 14,
    },
    categoryLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    chipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
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
