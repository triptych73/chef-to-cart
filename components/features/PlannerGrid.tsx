"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar as CalendarIcon, ChefHat, ShoppingCart, Copy, Check, MoreVertical, Users, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import DraggableRecipe from "./DraggableRecipe";
import SavedPlansPanel from "./SavedPlansPanel";
import { Recipe, MealPlan } from "@/types";
import RecipeIngestor from "./RecipeIngestor";
import { cn } from "@/lib/utils";
import { generateShoppingList, generateOcadoSearchString, ShoppingItem } from "@/lib/logic/shopping-list";

// Mock Data
const MOCK_RECIPES: Recipe[] = [
    {
        id: "r1", title: "Spicy Rigatoni", prepTime: 20, servings: 2, color: "bg-orange-500",
        ingredients: [
            { name: "Rigatoni", quantity: "250", unit: "g" },
            { name: "Vodka", quantity: "2", unit: "tbsp" },
            { name: "Double Cream", quantity: "150", unit: "ml" },
            { name: "Tomato Puree", quantity: "1", unit: "tube" }
        ]
    },
    {
        id: "r2", title: "Green Goddess Salad", prepTime: 10, servings: 1, color: "bg-green-500",
        ingredients: [
            { name: "Cabbage", quantity: "0.5", unit: "head" },
            { name: "Cucumber", quantity: "1", unit: "large" },
            { name: "Basil", quantity: "1", unit: "bunch" },
            { name: "Spinach", quantity: "100", unit: "g" }
        ]
    },
    {
        id: "r3", title: "Miso Salmon", prepTime: 25, servings: 4, color: "bg-pink-500",
        ingredients: [
            { name: "Salmon Fillets", quantity: "4", unit: "count" },
            { name: "Miso Paste", quantity: "2", unit: "tbsp" },
            { name: "Soy Sauce", quantity: "1", unit: "tbsp" },
            { name: "Bok Choy", quantity: "3", unit: "heads" }
        ]
    },
    {
        id: "r4", title: "Avocado Toast", prepTime: 5, servings: 1, color: "bg-yellow-500",
        ingredients: [
            { name: "Sourdough Bread", quantity: "2", unit: "slices" },
            { name: "Avocado", quantity: "1", unit: "ripe" },
            { name: "Chilli Flakes", quantity: "1", unit: "pinch" }
        ]
    },
    {
        id: "r5", title: "Steak Frites", prepTime: 40, servings: 2, color: "bg-red-500",
        ingredients: [
            { name: "Ribeye Steak", quantity: "2", unit: "count" },
            { name: "Potatoes", quantity: "500", unit: "g" },
            { name: "Rosemary", quantity: "1", unit: "sprig" }
        ]
    },
];

import { useRecipes, useMealPlan, useSavedPlans } from "@/lib/db-hooks";

// Mock Data - Keep for initial empty state if needed, but we'll use DB
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Lunch", "Dinner"];

function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatWeekStartDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatWeekRange(startDate: Date): string {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${startDate.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
}

export default function PlannerGrid() {
    const { recipes, addRecipe, updateRecipe, loading: recipesLoading } = useRecipes();

    // Week navigation
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const currentWeekStart = formatWeekStartDate(weekStart);
    const { plan, updatePlan, loading: planLoading } = useMealPlan(currentWeekStart);
    const { savedPlans, loading: savedPlansLoading, savePlan, deleteSavedPlan } = useSavedPlans();

    const goToPrevWeek = useCallback(() => {
        setWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
    }, []);

    const goToNextWeek = useCallback(() => {
        setWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
    }, []);

    const goToThisWeek = useCallback(() => {
        setWeekStart(getMonday(new Date()));
    }, []);

    const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [showAddRecipe, setShowAddRecipe] = useState(false);
    const [showSavedPlans, setShowSavedPlans] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sidebarCategory, setSidebarCategory] = useState<string>("Mains");

    const CATEGORIES = ["Soups/Starters", "Mains", "Desserts", "Baby"];

    const categorizedRecipes = useMemo(() => {
        const groups: Record<string, Recipe[]> = {
            "Soups/Starters": [],
            "Mains": [],
            "Desserts": [],
            "Baby": []
        };
        recipes.forEach(r => {
            const cat = r.category || "Mains";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(r);
        });
        return groups;
    }, [recipes]);

    // Build the planner state efficiently from the DB plan
    const planner = useMemo(() => {
        const state: Record<string, Record<string, { recipe: Recipe | null, servings: number | null }>> = {};
        DAYS.forEach(day => {
            state[day] = {
                Lunch: { recipe: null, servings: null },
                Dinner: { recipe: null, servings: null }
            };

            if (plan?.days?.[day]) {
                const lunchData = plan.days[day].Lunch;
                const dinnerData = plan.days[day].Dinner;

                // Compatibility check: handle case where slot might be a string (legacy)
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

    const handleSaveRecipe = async (data: any) => {
        try {
            await addRecipe({
                title: data.title,
                category: data.category || "Mains",
                prepTime: data.prep_time_minutes || 0,
                servings: data.servings || 1,
                color: "bg-blue-500",
                ingredients: data.ingredients,
                instructions: data.instructions || []
            });
            setShowAddRecipe(false);
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save recipe to database.");
        }
    };

    // Derived state for shopping list
    const shoppingList = useMemo(() => generateShoppingList(planner), [planner]);

    const loading = recipesLoading || planLoading;

    const handleSavePlan = async (name: string) => {
        if (!plan?.days) return;
        await savePlan(name, plan.days);
    };

    const handleLoadPlan = async (days: MealPlan["days"]) => {
        await updatePlan(days);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12 text-zinc-400 italic">
                <div className="flex flex-col items-center gap-4">
                    <ChefHat className="w-8 h-8 animate-pulse text-zinc-300" />
                    <span>Synchronizing your kitchen...</span>
                </div>
            </div>
        );
    }

    const handleQuickUpdateCategory = async (id: string, category: string) => {
        try {
            await updateRecipe(id, { category: category as any });
        } catch (err) {
            console.error("Quick switch failed:", err);
        }
    };

    const handleDrop = async (day: string, meal: string) => {
        if (activeRecipe) {
            const currentDays = plan?.days || {};
            const newDays = {
                ...currentDays,
                [day]: {
                    Lunch: (currentDays[day] as any)?.Lunch || null,
                    Dinner: (currentDays[day] as any)?.Dinner || null,
                    [meal]: {
                        recipeId: activeRecipe.id,
                        servings: activeRecipe.servings || 2
                    }
                }
            };
            await updatePlan(newDays as any);
            setActiveRecipe(null);
        }
    };

    const handleUpdateServings = async (day: string, meal: string, servings: number) => {
        if (plan?.days?.[day]) {
            const currentDay = plan.days[day] as any;
            const newDays = {
                ...plan.days,
                [day]: {
                    ...currentDay,
                    [meal]: {
                        ...currentDay[meal],
                        servings: servings
                    }
                }
            };
            await updatePlan(newDays as any);
        }
    };

    const handleRemoveFromPlan = async (day: string, meal: string) => {
        if (plan?.days?.[day]) {
            const currentDay = plan.days[day] as any;
            const newDays = {
                ...plan.days,
                [day]: {
                    ...currentDay,
                    [meal]: null
                }
            };
            await updatePlan(newDays as any);
        }
    };




    const handleCopyOcado = () => {
        const str = generateOcadoSearchString(shoppingList);
        navigator.clipboard.writeText(str);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-100px)] relative">
            {/* Sidebar: Recipes */}
            <aside className="w-full lg:w-80 flex flex-col gap-6">
                <div className="flex items-center gap-2 text-zinc-800">
                    <ChefHat className="w-5 h-5" />
                    <h2 className="font-serif font-medium text-lg">My Cookbook</h2>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-1 bg-zinc-100 p-1 rounded-lg">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSidebarCategory(cat)}
                                className={cn(
                                    "flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                                    sidebarCategory === cat
                                        ? "bg-white text-zinc-900 shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {recipes.filter(r => (r.category || "Mains") === sidebarCategory).map((recipe) => (
                        <div
                            key={recipe.id}
                            onMouseDown={() => setActiveRecipe(recipe)}
                            className="cursor-move"
                        >
                            <DraggableRecipe
                                recipe={recipe}
                                onUpdateCategory={handleQuickUpdateCategory}
                                layoutId={`sidebar-${recipe.id}`}
                            />
                        </div>
                    ))}

                    {recipes.filter(r => (r.category || "Mains") === sidebarCategory).length === 0 && (
                        <div className="py-8 text-center text-zinc-400 text-xs italic">
                            No {sidebarCategory} found.
                        </div>
                    )}

                    <button
                        onClick={() => setShowAddRecipe(true)}
                        className="w-full py-3 border border-dashed rounded-xl text-sm text-muted-foreground hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Recipe
                    </button>
                </div>
            </aside>

            {/* Main Grid */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goToPrevWeek}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-zinc-800"
                            title="Previous week"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                            onClick={goToThisWeek}
                            className="flex items-center gap-2 text-zinc-800 hover:text-zinc-600 transition-colors"
                            title="Jump to this week"
                        >
                            <CalendarIcon className="w-5 h-5" />
                            <h2 className="font-serif font-medium text-lg whitespace-nowrap">
                                {formatWeekRange(weekStart)}
                            </h2>
                        </button>

                        <button
                            onClick={goToNextWeek}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-zinc-800"
                            title="Next week"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSavedPlans(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            <Bookmark size={16} />
                            <span className="hidden sm:inline">Saved Plans</span>
                        </button>

                        <button
                            onClick={() => setShowShoppingList(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                            <ShoppingCart size={16} />
                            Generate List
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-4 flex-1 h-full min-h-0 overflow-y-auto pb-4">
                    {DAYS.map((day) => (
                        <div key={day} className="flex flex-col gap-2 min-w-[100px]">
                            <div className="text-center font-medium text-sm text-zinc-500 py-2 uppercase tracking-wide">
                                {day}
                            </div>

                            {MEALS.map((meal) => (
                                <div
                                    key={`${day}-${meal}`}
                                    className={cn(
                                        "flex-1 rounded-2xl border border-zinc-100 bg-white/50 relative group transition-all duration-300 min-h-[120px]",
                                        planner[day][meal] ? "ring-2 ring-zinc-900/5 shadow-md bg-white" : "hover:bg-white hover:shadow-sm"
                                    )}
                                    onMouseUp={() => handleDrop(day, meal)}
                                >
                                    <div className="absolute top-3 left-3 text-[10px] font-bold text-zinc-300 uppercase tracking-wider pointer-events-none">
                                        {meal}
                                    </div>

                                    <AnimatePresence>
                                        {planner[day][meal].recipe ? (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                className="absolute inset-2 z-10"
                                            >
                                                <DraggableRecipe
                                                    recipe={planner[day][meal].recipe!}
                                                    layoutId={`grid-${day}-${meal}-${planner[day][meal].recipe!.id}`}
                                                />

                                                <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <div className="flex items-center gap-1 px-1 py-0.5 bg-zinc-900/90 backdrop-blur-sm text-white text-[8px] rounded-md font-bold shadow-sm">
                                                        <Users size={7} />
                                                        {planner[day][meal].servings || planner[day][meal].recipe!.servings}
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const s = prompt("Number of servings?", (planner[day][meal].servings || planner[day][meal].recipe!.servings || 2).toString());
                                                            if (s) handleUpdateServings(day, meal, parseInt(s));
                                                        }}
                                                        className="bg-zinc-800/90 backdrop-blur-sm text-white rounded-md p-0.5 hover:bg-zinc-900 shadow-sm"
                                                    >
                                                        <MoreVertical className="w-2.5 h-2.5" />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFromPlan(day, meal);
                                                        }}
                                                        className="bg-red-500/90 backdrop-blur-sm text-white rounded-md p-0.5 hover:bg-red-600 shadow-sm"
                                                    >
                                                        <Plus className="w-2.5 h-2.5 rotate-45" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-6 h-6 text-zinc-200" />
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Shopping List Overlay */}
            <AnimatePresence>
                {showShoppingList && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowShoppingList(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                        >
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-xl font-serif font-bold">Shopping List</h2>
                                <button onClick={() => setShowShoppingList(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                                    <Plus className="rotate-45" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {shoppingList.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10">
                                        Your plan is empty. Drag some recipes to the grid first!
                                    </div>
                                ) : (
                                    <ul className="space-y-4">
                                        {shoppingList.map((item) => (
                                            <li key={item.id} className="flex items-start gap-3 pb-3 border-b border-dashed last:border-0">
                                                <div className="mt-1 w-4 h-4 rounded border border-zinc-300" />
                                                <div>
                                                    <span className="font-semibold block">
                                                        {item.quantity} {item.unit} {item.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Used in: {item.originalItems.map(i => i.recipeName).join(", ")}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="p-6 border-t bg-zinc-50">
                                <button
                                    onClick={handleCopyOcado}
                                    disabled={shoppingList.length === 0}
                                    className="w-full py-3 bg-[#54092b] hover:bg-[#420722] text-white rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copied ? "Copied!" : "Copy for Ocado Search"}
                                </button>
                                <p className="text-xs text-center text-muted-foreground mt-3">
                                    Paste this into the Ocado search bar to multiple-add items.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Add Recipe Modal */}
            <AnimatePresence>
                {showAddRecipe && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddRecipe(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl bg-white rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-xl font-serif font-bold">Import Recipe</h2>
                                <button onClick={() => setShowAddRecipe(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                                    <Plus className="rotate-45" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <RecipeIngestor
                                    onSave={handleSaveRecipe}
                                    onCancel={() => setShowAddRecipe(false)}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Saved Plans Panel */}
            <AnimatePresence>
                {showSavedPlans && (
                    <SavedPlansPanel
                        savedPlans={savedPlans}
                        loading={savedPlansLoading}
                        currentDays={plan?.days}
                        onSave={handleSavePlan}
                        onLoad={handleLoadPlan}
                        onDelete={deleteSavedPlan}
                        onClose={() => setShowSavedPlans(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
