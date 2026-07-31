import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { BuildingFloorRoomPicker } from "@/components/BuildingFloorRoomPicker";
import { Building, Floor, Room } from "@/lib/types";
import { apiRequest, uploadImageToCloudinary } from "@/lib/api";
import { useRouter } from "expo-router";

export default function RaiseComplaintScreen() {
    const router = useRouter();

    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const [locationType, setLocationType] = useState<"classroom" | "washroom" | "lab" | "office" | "other">("classroom");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

    const [localPhotos, setLocalPhotos] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Permission to access camera roll is required!");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets) {
                const newUris = result.assets.map((asset) => asset.uri);
                setLocalPhotos((prev) => [...prev, ...newUris]);
            }
        } catch (e) {
            console.error("Image pick error", e);
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
                "Complaint Raised! 📢",
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
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.headerTitle}>Report Campus Damage 📸</Text>
            <Text style={styles.headerSub}>
                Select location, attach damage photo, and submit to the maintenance department.
            </Text>

            {/* Location Selector */}
            <View style={styles.card}>
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
                    <View style={styles.locationTypeBox}>
                        <Text style={styles.label}>Location Category</Text>
                        <View style={styles.typeRow}>
                            {(["classroom", "washroom", "lab", "office", "other"] as const).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, locationType === type && styles.selectedTypeChip]}
                                    onPress={() => setLocationType(type)}
                                >
                                    <Text style={[styles.typeText, locationType === type && styles.selectedTypeText]}>
                                        {type === "washroom" ? "🚽 Washroom" : type === "classroom" ? "🏫 Classroom" : type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Issue Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Issue Details</Text>

                <Text style={styles.label}>Complaint Title *</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Broken AC switch board / Washroom pipe leakage"
                />

                <Text style={styles.label}>Detailed Description *</Text>
                <TextInput
                    style={[styles.input, { height: 90 }]}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe what is damaged, exact location details, etc."
                />

                <Text style={styles.label}>Priority Level</Text>
                <View style={styles.priorityRow}>
                    {(["low", "medium", "high", "critical"] as const).map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.priorityChip,
                                priority === p && styles.selectedPriorityChip,
                            ]}
                            onPress={() => setPriority(p)}
                        >
                            <Text
                                style={[
                                    styles.priorityText,
                                    priority === p && styles.selectedPriorityText,
                                ]}
                            >
                                {p.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Photos Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Attach Damage Photos 📷</Text>

                <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickImage}>
                    <Text style={styles.photoPickerIcon}>➕📷</Text>
                    <Text style={styles.photoPickerText}>Tap to select photo from gallery/camera</Text>
                </TouchableOpacity>

                {localPhotos.length > 0 && (
                    <ScrollView horizontal style={styles.photoPreviewRow}>
                        {localPhotos.map((uri, idx) => (
                            <View key={idx} style={styles.photoWrapper}>
                                <Image source={{ uri }} style={styles.photoPreview} />
                                <TouchableOpacity
                                    style={styles.removePhotoBtn}
                                    onPress={() => handleRemovePhoto(idx)}
                                >
                                    <Text style={styles.removePhotoText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>Submit Complaint to Manager</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: "#f8fafc",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 4,
    },
    headerSub: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 16,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
        marginTop: 6,
    },
    input: {
        backgroundColor: "#f1f5f9",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    locationTypeBox: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 10,
    },
    typeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    typeChip: {
        backgroundColor: "#f1f5f9",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    selectedTypeChip: {
        backgroundColor: "#2563eb",
    },
    typeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    selectedTypeText: {
        color: "#ffffff",
    },
    priorityRow: {
        flexDirection: "row",
        gap: 8,
        marginVertical: 6,
    },
    priorityChip: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    selectedPriorityChip: {
        backgroundColor: "#2563eb",
    },
    priorityText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
    },
    selectedPriorityText: {
        color: "#ffffff",
    },
    photoPickerBtn: {
        backgroundColor: "#eff6ff",
        borderWidth: 2,
        borderColor: "#93c5fd",
        borderStyle: "dashed",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    photoPickerIcon: {
        fontSize: 28,
        marginBottom: 6,
    },
    photoPickerText: {
        fontSize: 13,
        color: "#1d4ed8",
        fontWeight: "600",
    },
    photoPreviewRow: {
        flexDirection: "row",
        marginTop: 12,
    },
    photoWrapper: {
        position: "relative",
        marginRight: 10,
    },
    photoPreview: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    removePhotoBtn: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#dc2626",
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
    },
    removePhotoText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "800",
    },
    submitBtn: {
        backgroundColor: "#2563eb",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginBottom: 30,
        elevation: 4,
    },
    submitBtnText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },
});
