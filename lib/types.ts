export type UserRole = "staff" | "manager" | "admin";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface User {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    department?: string;
    isEmailVerified: boolean;
    isApproved: boolean;
    approvalStatus?: ApprovalStatus;
    createdAt?: string;
}

export interface Building {
    _id: string;
    name: string;
    code: string;
    description?: string;
    address?: string;
}

export interface Floor {
    _id: string;
    buildingId: string;
    name: string;
    floorNumber: number;
    prefix: string; // G, F, S, T, etc.
}

export interface Room {
    _id: string;
    floorId: string;
    roomNumber: string; // G-1, F-2, S-3
    roomType: "classroom" | "washroom" | "lab" | "office" | "library" | "other";
    name?: string;
}

export interface CostDetail {
    laborCost: number;
    materialCost: number;
    otherCost: number;
    totalCost: number;
    notes?: string;
    addedBy?: string;
    addedAt?: string;
    updatedBy?: string;
    updatedAt?: string;
}

export interface Complaint {
    _id: string;
    title: string;
    description: string;
    raisedBy: User | string;
    buildingId: Building | string;
    floorId: Floor | string;
    roomId?: Room | string;
    locationType: "classroom" | "washroom" | "lab" | "office" | "library" | "corridor" | "other";
    photos: string[];
    status: "pending" | "in_progress" | "resolved" | "rejected";
    priority: "low" | "medium" | "high" | "critical";
    assignedTo?: User | string;
    costDetails?: CostDetail;
    resolvedAt?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AppNotification {
    _id: string;
    userId: string;
    title: string;
    message: string;
    type: "complaint_update" | "complaint_resolved" | "new_complaint" | "registration_approved" | "registration_rejected";
    complaintId?: string;
    isRead: boolean;
    createdAt: string;
}

// ---- API response shapes ----
// Pass these to apiRequest<T>() so responses are checked rather than guessed at.

export interface BuildingsResponse {
    buildings: Building[];
}

export interface BuildingResponse {
    message?: string;
    building: Building;
}

export interface FloorsResponse {
    floors: Floor[];
}

export interface FloorResponse {
    message?: string;
    floor: Floor;
    rooms?: Room[];
}

export interface RoomsResponse {
    message?: string;
    rooms: Room[];
}

export interface RoomResponse {
    message?: string;
    room: Room;
}

export interface ComplaintsResponse {
    complaints: Complaint[];
}

export interface ComplaintResponse {
    message?: string;
    complaint: Complaint;
}

export interface CostResponse {
    message?: string;
    costDetails: CostDetail;
    complaint: Complaint;
}

export interface NotificationsResponse {
    notifications: AppNotification[];
    unreadCount: number;
}

export interface UsersResponse {
    users: User[];
}

export interface UserResponse {
    message?: string;
    user: User;
}

export interface MessageResponse {
    message: string;
}
