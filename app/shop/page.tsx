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

    const handleAutomate = async () => {
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
        } catch (err) {
            setMatchingError(err instanceof Error ? err.message : "AI matching failed");
        } finally {
            setIsMatching(false);
        }
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
                                <button
                                    onClick={() => setShowAutomationPreview(false)}
                                    className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400"
                                >
                                    <Trash2 size={20} className="rotate-45" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isMatching ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                        <p className="text-zinc-500 font-medium">Gemini is matching your list...</p>
                                    </div>
                                ) : matchingError ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500">
                                        <AlertCircle className="w-10 h-10" />
                                        <p className="font-medium text-center">{matchingError}</p>
                                        <button onClick={handleAutomate} className="text-sm underline">Try again</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">✅ Ready to Add</h3>
                                            <div className="space-y-2">
                                                {matches.filter(m => m.confidence !== "none").map((m, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-white shadow-sm">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-zinc-900">{m.ingredient}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={cn(
                                                                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter",
                                                                    m.confidence === "high" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                                )}>
                                                                    {m.confidence} Match
                                                                </span>
                                                                <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">{m.matched_product_name}</span>
                                                            </div>
                                                            {m.reasoning && <p className="text-[9px] text-zinc-400 mt-1 italic leading-tight">{m.reasoning}</p>}
                                                        </div>
                                                        <div className="text-right ml-4 px-3 py-1 bg-zinc-50 rounded-lg border border-zinc-100">
                                                            <span className="text-xs font-black text-zinc-900">
                                                                {m.cart_quantity} {m.cart_quantity === 1 ? 'Pack' : 'Packs'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">🔍 Search Fallback</h3>
                                            <p className="text-[10px] text-zinc-400 italic">Not in your catalog. The script will search Ocado and pick the best match automatically.</p>
                                            <div className="space-y-2">
                                                {matches.filter(m => m.confidence === "none").map((m, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-zinc-600">{m.ingredient}</p>
                                                            <p className="text-[9px] text-zinc-400 mt-1">Will search Ocado for "{m.ingredient}"</p>
                                                        </div>
                                                        <div className="text-right ml-4 px-3 py-1 border border-dashed border-zinc-200 rounded-lg">
                                                            <span className="text-xs font-bold text-zinc-400">? Pack</span>
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
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 italic">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">!</div>
                                            <p className="text-[10px] text-blue-800">
                                                Found {matches.filter(m => m.confidence !== "none").length} matches. Run <code className="bg-blue-100 px-1 rounded font-bold">npm run cart:sync</code> to add them.
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowAutomationPreview(false)}
                                                className="flex-1 px-6 py-3 border border-zinc-200 rounded-full text-sm font-medium hover:bg-zinc-100 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDownloadJob}
                                                disabled={matches.filter(m => m.confidence !== "none").length === 0}
                                                className="flex-3 px-8 py-3 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight size={16} />
                                                Download Sync Job
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
