import { Complaint } from "@/lib/types";

/**
 * Filters complaints by a free-text query.
 *
 * Searches the fields a person would actually recall — what the issue was, and
 * where it was — rather than only the title, so "washroom" or "G-1" finds the
 * right ticket. Shared by the staff, manager and admin lists so all three
 * behave identically.
 */
export function searchComplaints(complaints: Complaint[], query: string): Complaint[] {
    const q = query.trim().toLowerCase();
    if (!q) return complaints;

    return complaints.filter((c) => {
        const building = typeof c.buildingId === "object" ? c.buildingId : null;
        const floor = typeof c.floorId === "object" ? c.floorId : null;
        const room = typeof c.roomId === "object" ? c.roomId : null;
        const reporter = typeof c.raisedBy === "object" ? c.raisedBy : null;

        return [
            c.title,
            c.description,
            c.locationType,
            c.priority,
            building?.name,
            building?.code,
            floor?.name,
            room?.roomNumber,
            room?.name,
            reporter?.name,
            reporter?.department,
        ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(q));
    });
}
