"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight, Copy, Check, Printer, Share2, Trash2 } from "lucide-react";
import { useRecipes, useMealPlan } from "@/lib/db-hooks";
import { generateShoppingList, generateOcadoSearchString, ShoppingItem } from "@/lib/logic/shopping-list";
import { cn } from "@/lib/utils";
import { Recipe, MatchResult } from "@/types";
import { Loader2, AlertCircle, Info } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const currentWeekStart = "2026-02-09";

export default function ShopPage() {
    const { recipes, loading: recipesLoading } = useRecipes();
    const { plan, loading: planLoading } = useMealPlan(currentWeekStart);
    const [copied, setCopied] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [showAutomationPreview, setShowAutomationPreview] = useState(false);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [isMatching, setIsMatching] = useState(false);
    const [matchingError, setMatchingError] = useState<string | null>(null);
    const [showRemote, setShowRemote] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const [lastMatchedListJson, setLastMatchedListJson] = useState<string | null>(null);

    const loading = recipesLoading || planLoading;

    // Build the planner state for the aggregator
    const plannerState = useMemo(() => {
        const state: any = {};
        DAYS.forEach(day => {
            state[day] = {
                Lunch: { recipe: null, servings: null },
                Dinner: { recipe: null, servings: null }
            };

            if (plan?.days?.[day]) {
                const lunchData = plan.days[day].Lunch;
                const dinnerData = plan.days[day].Dinner;

                if (lunchData) {
                    const lId = typeof lunchData === 'string' ? lunchData : lunchData.recipeId;
                    const lServ = typeof lunchData === 'string' ? null : lunchData.servings;
                    if (lId) {
                        state[day].Lunch = {
                            recipe: recipes.find(r => r.id === lId) || null,
                            servings: lServ
                        };
                    }
                }

                if (dinnerData) {
                    const dId = typeof dinnerData === 'string' ? dinnerData : dinnerData.recipeId;
                    const dServ = typeof dinnerData === 'string' ? null : dinnerData.servings;
                    if (dId) {
                        state[day].Dinner = {
                            recipe: recipes.find(r => r.id === dId) || null,
                            servings: dServ
                        };
                    }
                }
            }
        });
        return state;
    }, [plan, recipes]);

    const shoppingList = useMemo(() => generateShoppingList(plannerState), [plannerState]);
    const shoppingListJson = JSON.stringify(shoppingList);

    const handleSyncToVPS = async () => {
        setIsSyncing(true);
        setSyncStatus(null);
        try {
            const response = await fetch("/api/cart-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matches })
            });

            if (!response.ok) throw new Error("Sync failed");

            const data = await response.json();
            setSyncStatus("🚀 Action triggered! Watch the VNC window below.");
            setTimeout(() => setShowAutomationPreview(false), 3000);
        } catch (err) {
            setSyncStatus("❌ Error starting sync");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCopy = () => {
        const text = generateOcadoSearchString(shoppingList);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleItem = (id: string) => {
        const newChecked = new Set(checkedItems);
        if (newChecked.has(id)) newChecked.delete(id);
        else newChecked.add(id);
        setCheckedItems(newChecked);
    };

    const handleAutomate = async (force: boolean | React.MouseEvent = false) => {
        const isForce = force === true;
        // If not forced and we have a cached match for the same list, just open preview
        if (!isForce && shoppingListJson === lastMatchedListJson && matches.length > 0) {
            setShowAutomationPreview(true);
            return;
        }

        setIsMatching(true);
        setMatchingError(null);
        setShowAutomationPreview(true);

        try {
            const response = await fetch("/api/cart-match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: shoppingList })
            });

            if (!response.ok) throw new Error("Failed to match ingredients");

            const data = await response.json();
            setMatches(data.matches || []);
            setLastMatchedListJson(shoppingListJson);
        } catch (err) {
            setMatchingError(err instanceof Error ? err.message : "AI matching failed");
        } finally {
            setIsMatching(false);
        }
    };

    const handleUpdateQty = (idx: number, delta: number) => {
        setMatches(prev => prev.map((m, i) => {
            if (i !== idx) return m;
            return { ...m, cart_quantity: Math.max(0, m.cart_quantity + delta) };
        }));
    };

    const handleRemoveMatch = (idx: number) => {
        setMatches(prev => prev.filter((_, i) => i !== idx));
    };

    const handleDownloadJob = () => {
        const jobMatches = matches.filter(m => m.matched_product_id && m.cart_quantity > 0);
        const data = {
            timestamp: new Date().toISOString(),
            matches: jobMatches.map(m => ({
                ingredientName: m.ingredient,
                match: {
                    id: m.matched_product_id,
                    name: m.matched_product_name,
                    url: `https://www.ocado.com/products/${m.matched_product_id}` // Construct URL if missing
                },
                suggestedCartQuantity: m.cart_quantity
            }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cart_job.json";
        a.click();
        setShowAutomationPreview(false);
    };

    if (loading) return <div className="p-12 text-center text-muted-foreground italic">Gathering your list...</div>;

    if (shoppingList.length === 0) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-4">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                        <ShoppingBag size={24} />
                    </div>
                    <h2 className="text-2xl font-serif font-medium">Your basket is empty</h2>
                    <p className="text-zinc-500">Plan some meals in the Planner to generate your shopping list automatically.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="max-w-4xl mx-auto p-6 md:p-12 pb-32">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-zinc-900 mb-2">Provisions</h1>
                        <p className="text-zinc-500">Scaled and aggregated for your current week.</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleAutomate}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                        >
                            <ShoppingBag size={16} />
                            Automate Basket
                        </button>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? "Copied" : "Quick Shop Search"}
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
                    <div className="p-8 space-y-8">
                        {/* Categorization logic would go here in a larger app */}
                        <section>
                            <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-6">Market List</h3>
                            <div className="divide-y divide-zinc-50">
                                {shoppingList.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleItem(item.id)}
                                        className={cn(
                                            "group py-4 flex items-center justify-between cursor-pointer transition-colors",
                                            checkedItems.has(item.id) ? "opacity-40" : "hover:bg-zinc-50/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                                checkedItems.has(item.id) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 group-hover:border-zinc-400"
                                            )}>
                                                {checkedItems.has(item.id) && <Check size={12} className="text-white" />}
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "font-medium transition-all text-zinc-800",
                                                    checkedItems.has(item.id) && "line-through text-zinc-400"
                                                )}>
                                                    {item.name}
                                                </p>
                                                <div className="flex gap-2 text-[10px] text-zinc-400 mt-0.5">
                                                    {item.originalItems.map((orig, idx) => (
                                                        <span key={idx} className="bg-zinc-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                            {orig.recipeName}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-zinc-900">
                                                {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-4 text-zinc-400">
                    <button className="flex items-center gap-2 p-3 hover:text-zinc-900 transition-colors">
                        <Printer size={18} />
                    </button>
                    <button className="flex items-center gap-2 p-3 hover:text-zinc-900 transition-colors">
                        <Share2 size={18} />
                    </button>
                    <button className="flex items-center gap-2 p-3 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Remote Browser Section */}
                <div className="mt-12 pt-12 border-t border-zinc-200">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-zinc-900">Remote Ocado Session</h2>
                            <p className="text-sm text-zinc-500">Watch the automation live on your VPS.</p>
                        </div>
                        {!showRemote ? (
                            <button
                                onClick={() => setShowRemote(true)}
                                className="px-6 py-2 bg-zinc-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-md"
                            >
                                Unlock Session
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowRemote(false)}
                                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                Hide Session
                            </button>
                        )}
                    </div>

                    {showRemote && (
                        <div className="aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-zinc-900">
                            <iframe
                                src="http://34.9.39.101:6080/vnc.html?autoconnect=true&reconnect=true"
                                className="w-full h-full border-none"
                                title="Ocado Remote Session"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Automation Preview Modal */}
            <AnimatePresence>
                {showAutomationPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAutomationPreview(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-6 border-b bg-zinc-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-serif font-bold">Automation Preview</h2>
                                    <p className="text-xs text-zinc-500">Matching your list to your Ocado catalog.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isMatching && !matchingError && (
                                        <button
                                            onClick={(e) => handleAutomate(true)}
                                            className="px-4 py-1.5 bg-zinc-200 text-zinc-700 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-300 transition-all flex items-center gap-2"
                                        >
                                            <Loader2 size={12} className={isMatching ? "animate-spin" : ""} />
                                            Re-Match
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowAutomationPreview(false)}
                                        className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400"
                                    >
                                        <Trash2 size={20} className="rotate-45" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/30">
                                {isMatching ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                        <p className="text-zinc-500 font-medium text-center">
                                            Gemini is matching your list...<br />
                                            <span className="text-[10px] text-zinc-400 italic font-normal">Comparing against {shoppingList.length} items</span>
                                        </p>
                                    </div>
                                ) : matchingError ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500">
                                        <AlertCircle className="w-10 h-10" />
                                        <p className="font-medium text-center">{matchingError}</p>
                                        <button onClick={() => handleAutomate(true)} className="text-sm underline">Try again</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {matches.length === 0 && (
                                            <div className="py-20 text-center text-zinc-400 italic text-sm">
                                                No matches found. Try refreshing or checkout manually.
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">✅ Ready to Add</h3>
                                            <div className="space-y-2">
                                                {matches.map((m, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-white shadow-sm group">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-zinc-900 truncate">{m.ingredient}</p>
                                                                <span className={cn(
                                                                    "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0",
                                                                    m.confidence === "high" ? "bg-green-100 text-green-700" :
                                                                        m.confidence === "medium" ? "bg-blue-100 text-blue-700" :
                                                                            "bg-zinc-100 text-zinc-500"
                                                                )}>
                                                                    {m.confidence === "none" ? "Search" : m.confidence}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                                                <span className="text-[10px] text-zinc-500 truncate italic">
                                                                    {m.matched_product_name || `Searching for "${m.ingredient}"...`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 ml-4">
                                                            <div className="flex items-center bg-zinc-100 rounded-full p-1 border border-zinc-200">
                                                                <button
                                                                    onClick={() => handleUpdateQty(idx, -1)}
                                                                    className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-8 text-center text-[11px] font-black text-zinc-900">
                                                                    {m.cart_quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleUpdateQty(idx, 1)}
                                                                    className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveMatch(idx)}
                                                                className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t bg-zinc-50 space-y-4">
                                {!isMatching && !matchingError && (
                                    <>
                                        {matches.length > 0 && (
                                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 italic">
                                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">!</div>
                                                <p className="text-[10px] text-blue-800">
                                                    Found {matches.filter(m => m.confidence !== "none").length} confident matches. Manual edits will be preserved for this sync.
                                                </p>
                                            </div>
                                        )}
                                        {syncStatus && (
                                            <div className={cn(
                                                "p-3 rounded-xl text-[10px] font-bold text-center",
                                                syncStatus.includes("🚀") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                            )}>
                                                {syncStatus}
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowAutomationPreview(false)}
                                                className="flex-1 px-6 py-3 border border-zinc-200 rounded-full text-sm font-medium hover:bg-zinc-100 transition-all"
                                            >
                                                Close
                                            </button>
                                            <button
                                                onClick={handleDownloadJob}
                                                disabled={matches.length === 0}
                                                className="flex-1 px-6 py-3 border border-zinc-200 rounded-full text-sm font-medium hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                Download
                                            </button>
                                            <button
                                                onClick={handleSyncToVPS}
                                                disabled={isSyncing || matches.length === 0}
                                                className="flex-[2] px-8 py-3 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag size={16} />}
                                                Push to VPS Cart
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
