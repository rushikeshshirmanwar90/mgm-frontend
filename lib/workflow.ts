import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { apiRequest } from "./api";
import { Complaint, ComplaintResponse, CostDetail } from "./types";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Complaint categories the Estate Manager picks from when adding the estimate.
 * Keys must match COMPLAINT_CATEGORIES in mgm-backend/lib/complaint-workflow.ts.
 */
export const COMPLAINT_CATEGORIES: { key: string; label: string; icon: IoniconName }[] = [
    { key: "electrical", label: "Electrical", icon: "flash-outline" },
    { key: "plumbing", label: "Plumbing", icon: "water-outline" },
    { key: "carpentry", label: "Carpentry", icon: "hammer-outline" },
    { key: "civil", label: "Civil / masonry", icon: "business-outline" },
    { key: "painting", label: "Painting", icon: "color-palette-outline" },
    { key: "hvac", label: "AC / HVAC", icon: "snow-outline" },
    { key: "cleaning", label: "Cleaning", icon: "sparkles-outline" },
    { key: "it_network", label: "IT / network", icon: "wifi-outline" },
    { key: "other", label: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

/** Display name for a complaint's category, using the typed-in one for "Other". */
export function categoryLabel(complaint: Pick<Complaint, "category" | "categoryOther">): string | null {
    const key = complaint.category;
    if (!key) return null;
    if (key === "other" && complaint.categoryOther) return complaint.categoryOther;
    return COMPLAINT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/**
 * Expenditure lines on the final cost breakdown. Keys must match COST_ITEMS in
 * mgm-backend/lib/complaint-workflow.ts. Miscellaneous is last and carries a
 * description of what it was for.
 */
export const COST_ITEMS: { key: string; label: string; icon: IoniconName }[] = [
    { key: "electrician", label: "Electrician", icon: "flash-outline" },
    { key: "plumber", label: "Plumber", icon: "water-outline" },
    { key: "carpenter", label: "Carpenter", icon: "hammer-outline" },
    { key: "mason", label: "Mason / civil work", icon: "business-outline" },
    { key: "painter", label: "Painter", icon: "color-palette-outline" },
    { key: "hvac_technician", label: "AC / HVAC technician", icon: "snow-outline" },
    { key: "general_labour", label: "General labour", icon: "people-outline" },
    { key: "materials", label: "Materials & spare parts", icon: "cube-outline" },
    { key: "miscellaneous", label: "Miscellaneous", icon: "receipt-outline" },
];

/**
 * The lines of a cost breakdown to display. Complaints costed before the
 * itemised form only have the old labour / material / other split, so fall
 * back to that rather than showing nothing.
 */
export function costLines(cost: CostDetail): { label: string; amount: number }[] {
    if (cost.items && cost.items.length > 0) {
        return cost.items.map((item) => ({
            label: COST_ITEMS.find((c) => c.key === item.key)?.label ?? item.key,
            amount: item.amount,
        }));
    }
    return [
        { label: "Labour", amount: cost.laborCost || 0 },
        { label: "Material", amount: cost.materialCost || 0 },
        { label: "Other", amount: cost.otherCost || 0 },
    ].filter((l) => l.amount > 0);
}

/** Workflow actions sent to PUT /complaints/:id. */
export type WorkflowAction =
    | "estimate"
    | "approve"
    | "return"
    | "start"
    | "work_done"
    | "hold"
    | "resume"
    | "reopen";

/** Runs a workflow step and returns the updated complaint. */
export async function runAction(
    complaintId: string,
    action: WorkflowAction,
    extra: Record<string, unknown> = {}
): Promise<Complaint> {
    const res = await apiRequest<ComplaintResponse>(`/complaints/${complaintId}`, {
        method: "PUT",
        body: JSON.stringify({ action, ...extra }),
    });
    return res.complaint;
}

/** Stages a complaint can be put on hold from (mirrors HOLDABLE on the server). */
export const HOLDABLE: Complaint["status"][] = [
    "pending",
    "awaiting_approval",
    "approved",
    "in_progress",
];
