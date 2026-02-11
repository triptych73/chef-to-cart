"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Bookmark, Trash2, Download, BookmarkCheck } from "lucide-react";
import { SavedMealPlan, MealPlan } from "@/types";

interface SavedPlansPanelProps {
    savedPlans: SavedMealPlan[];
    loading: boolean;
    currentDays: MealPlan["days"] | undefined;
    onSave: (name: string) => Promise<void>;
    onLoad: (days: MealPlan["days"]) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onClose: () => void;
}

function countMeals(days: MealPlan["days"]): number {
    let count = 0;
    for (const day of Object.values(days)) {
        if (day?.Lunch && (typeof day.Lunch === 'string' ? day.Lunch : day.Lunch.recipeId)) count++;
        if (day?.Dinner && (typeof day.Dinner === 'string' ? day.Dinner : day.Dinner.recipeId)) count++;
    }
    return count;
}

function formatDate(timestamp: any): string {
    if (!timestamp) return "";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch {
        return "";
    }
}

export default function SavedPlansPanel({
    savedPlans,
    loading,
    currentDays,
    onSave,
    onLoad,
    onDelete,
    onClose
}: SavedPlansPanelProps) {
    const [planName, setPlanName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!planName.trim()) return;
        setSaving(true);
        try {
            await onSave(planName.trim());
            setPlanName("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save plan.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await onDelete(id);
            setConfirmDeleteId(null);
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete plan.");
        }
    };

    const handleLoad = async (days: MealPlan["days"]) => {
        try {
            await onLoad(days);
            onClose();
        } catch (err) {
            console.error("Load failed:", err);
            alert("Failed to load plan.");
        }
    };

    const hasCurrentPlan = currentDays && countMeals(currentDays) > 0;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-zinc-700" />
                        <h2 className="text-xl font-serif font-bold">Saved Plans</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <Plus className="rotate-45" />
                    </button>
                </div>

                {/* Save Current Section */}
                <div className="p-6 border-b bg-zinc-50/50">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Save Current Week</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            placeholder={hasCurrentPlan ? "e.g. Healthy Week, Kids' Favourites..." : "Plan your week first..."}
                            disabled={!hasCurrentPlan || saving}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        />
                        <button
                            onClick={handleSave}
                            disabled={!planName.trim() || !hasCurrentPlan || saving}
                            className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                            {saved ? (
                                <>
                                    <BookmarkCheck className="w-4 h-4" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Bookmark className="w-4 h-4" />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                    {!hasCurrentPlan && (
                        <p className="text-xs text-zinc-400 mt-2 italic">
                            Drag some recipes onto the grid first to save a plan.
                        </p>
                    )}
                </div>

                {/* Saved Plans List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center text-zinc-400 py-10 italic text-sm">
                            Loading saved plans...
                        </div>
                    ) : savedPlans.length === 0 ? (
                        <div className="text-center py-10">
                            <Bookmark className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                            <p className="text-sm text-zinc-400 italic">
                                No saved plans yet. Create your first weekly template above!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {savedPlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className="group bg-white border border-zinc-100 rounded-2xl p-4 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-zinc-900 text-sm">{plan.name}</h4>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                {countMeals(plan.days)} meals · {formatDate(plan.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Preview pills */}
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {Object.entries(plan.days).slice(0, 4).map(([day, slots]) => {
                                            const hasMeal = (slots?.Lunch && (typeof slots.Lunch === 'string' ? slots.Lunch : slots.Lunch.recipeId)) ||
                                                (slots?.Dinner && (typeof slots.Dinner === 'string' ? slots.Dinner : slots.Dinner.recipeId));
                                            return hasMeal ? (
                                                <span key={day} className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] rounded-full font-medium uppercase">
                                                    {day}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleLoad(plan.days)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-xl text-xs font-medium hover:bg-zinc-800 transition-all active:scale-95"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Load into Week
                                        </button>

                                        {confirmDeleteId === plan.id ? (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleDelete(plan.id)}
                                                    className="px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-medium hover:bg-red-600 transition-all active:scale-95"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-3 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-medium hover:bg-zinc-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(plan.id)}
                                                className="px-3 py-2 bg-zinc-100 text-zinc-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
}
