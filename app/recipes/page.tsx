"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Plus, BookOpen, CheckCircle } from "lucide-react";
import DraggableRecipe from "@/components/features/DraggableRecipe";
import RecipeIngestor from "@/components/features/RecipeIngestor";
import { useRecipes } from "@/lib/db-hooks";
import { Recipe } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function RecipesPage() {
    const [includeAll, setIncludeAll] = useState(false);
    const { recipes, addRecipe, updateRecipe, deleteRecipe, user, loading } = useRecipes(includeAll);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [showAddRecipe, setShowAddRecipe] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Recipe | null>(null);

    const CATEGORIES = ["All", "Soups/Starters", "Mains", "Desserts", "Baby"];

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditData(selectedRecipe);
    };

    const handleUpdateRecipe = async (id: string, data: Partial<Recipe>) => {
        try {
            await updateRecipe(id, data);
            if (selectedRecipe?.id === id) {
                setSelectedRecipe(prev => ({ ...prev!, ...data }));
            }
            setIsEditing(false);
        } catch (err) {
            console.error("Update failed:", err);
            alert("Failed to update recipe.");
        }
    };

    const handleQuickUpdateCategory = async (id: string, category: string) => {
        try {
            await updateRecipe(id, { category: category as any });
        } catch (err) {
            console.error("Quick switch failed:", err);
        }
    };

    const handleClaimRecipe = async (recipe: Recipe) => {
        if (!user) return;
        try {
            await updateRecipe(recipe.id, { ownerId: user.uid });
            alert("Recipe claimed! It now belongs to your collection.");
            setSelectedRecipe(prev => prev ? { ...prev, ownerId: user.uid } : null);
        } catch (err) {
            console.error("Claim failed:", err);
            alert("Failed to claim recipe.");
        }
    };

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

    const filteredRecipes = recipes.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || r.category === selectedCategory || (!r.category && selectedCategory === "Mains");

        if (includeAll) {
            // In debug mode, only show recipes NOT owned by us
            return matchesSearch && r.ownerId !== user?.uid;
        }
        return matchesSearch && matchesCategory;
    });

    const handleClaimAll = async () => {
        if (!user || filteredRecipes.length === 0) return;
        const confirm = window.confirm(`Claim all ${filteredRecipes.length} recipes?`);
        if (!confirm) return;

        try {
            const promises = filteredRecipes.map(r => updateRecipe(r.id, { ownerId: user.uid }));
            await Promise.all(promises);
            alert("All recipes claimed successfully!");
            setIncludeAll(false); // Switch back to personal view
        } catch (err) {
            console.error("Bulk claim failed:", err);
            alert("Some recipes failed to claim.");
        }
    };

    if (loading) return <div className="p-12 text-center text-muted-foreground">Loading your collection...</div>;

    return (
        <div className="min-h-screen bg-zinc-50 p-6 lg:p-12 pb-32">
            <header className="mb-12 max-w-4xl">
                <h1 className="text-4xl font-serif font-bold text-zinc-900 mb-2">Cookbook</h1>
                <p className="text-muted-foreground text-lg">Your editorial collection of saved recipes.</p>
            </header>

            <section className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search your recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all text-sm"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm font-medium hover:bg-zinc-50 transition-colors">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                    <button
                        onClick={() => setIncludeAll(!includeAll)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-sm",
                            includeAll ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        )}
                    >
                        {includeAll ? "View Orphans Only" : "Show All"}
                    </button>

                    {includeAll && filteredRecipes.length > 0 && (
                        <button
                            onClick={handleClaimAll}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-all"
                        >
                            Claim All
                        </button>
                    )}

                    <button
                        onClick={() => setShowAddRecipe(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> New Recipe
                    </button>
                </div>
            </section>

            <section className="mb-12">
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                                selectedCategory === cat
                                    ? "bg-zinc-900 text-white shadow-md scale-105"
                                    : "bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRecipes.length > 0 ? (
                    filteredRecipes.map((recipe, index) => (
                        <motion.div
                            key={recipe.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedRecipe(recipe)}
                            className="cursor-pointer"
                        >
                            <DraggableRecipe
                                recipe={recipe}
                                onUpdateCategory={handleQuickUpdateCategory}
                                layoutId={`gallery-${recipe.id}`}
                            />
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-white border rounded-2xl flex items-center justify-center text-zinc-400 shadow-sm">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-zinc-900 font-medium">No recipes found</p>
                            <p className="text-zinc-500 text-sm">Try a different search or add a new recipe.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Recipe Ingestor Modal */}
            <AnimatePresence>
                {showAddRecipe && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white z-[200] overflow-y-auto"
                    >
                        <div className="sticky top-0 bg-white/80 backdrop-blur-md p-4 border-b flex justify-end z-10">
                            <button
                                onClick={() => setShowAddRecipe(false)}
                                className="p-2 hover:bg-zinc-100 rounded-full"
                            >
                                <Plus className="rotate-45 w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <RecipeIngestor onSave={handleSaveRecipe} onCancel={() => setShowAddRecipe(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recipe Detail Modal */}
            <AnimatePresence>
                {selectedRecipe && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedRecipe(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl relative z-10">
                            <button
                                onClick={() => setSelectedRecipe(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full bg-white/50 backdrop-blur-sm"
                            >
                                <Plus className="rotate-45 w-5 h-5" />
                            </button>

                            <div className="p-8 pt-12">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editData?.title || ""}
                                                onChange={(e) => setEditData(prev => ({ ...prev!, title: e.target.value }))}
                                                className="text-3xl font-serif font-bold text-zinc-900 w-full border-b border-zinc-200 focus:outline-none focus:border-zinc-900"
                                            />
                                        ) : (
                                            <h2 className="text-3xl font-serif font-bold text-zinc-900">{selectedRecipe.title}</h2>
                                        )}
                                        {!isEditing && selectedRecipe.category && (
                                            <span className="inline-block mt-2 px-3 py-1 bg-zinc-100 text-zinc-500 text-[10px] uppercase tracking-widest font-bold rounded-full">
                                                {selectedRecipe.category}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                                        {CATEGORIES.filter(c => c !== "All").map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setEditData(prev => ({ ...prev!, category: cat as any }))}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                                    editData?.category === cat
                                                        ? "bg-zinc-900 text-white shadow-sm"
                                                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-4 text-sm text-zinc-500 mb-8 border-b pb-6">
                                    {isEditing ? (
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <span>Prep (mins):</span>
                                                <input
                                                    type="number"
                                                    value={editData?.prepTime || 0}
                                                    onChange={(e) => setEditData(prev => ({ ...prev!, prepTime: parseInt(e.target.value) }))}
                                                    className="w-16 border rounded px-2"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>Servings:</span>
                                                <input
                                                    type="number"
                                                    value={editData?.servings || 1}
                                                    onChange={(e) => setEditData(prev => ({ ...prev!, servings: parseInt(e.target.value) }))}
                                                    className="w-16 border rounded px-2"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {selectedRecipe.prepTime && <span>{selectedRecipe.prepTime} mins Prep</span>}
                                            {selectedRecipe.servings && <span>Yields {selectedRecipe.servings} Servings</span>}
                                        </>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-10">
                                    <section>
                                        <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-400 mb-4">Ingredients</h3>
                                        <ul className="space-y-3">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    {editData?.ingredients?.map((ing, i) => (
                                                        <div key={i} className="flex gap-2 text-sm">
                                                            <input
                                                                value={ing.name}
                                                                onChange={(e) => {
                                                                    const newIngs = [...editData.ingredients!];
                                                                    newIngs[i].name = e.target.value;
                                                                    setEditData(prev => ({ ...prev!, ingredients: newIngs }));
                                                                }}
                                                                className="flex-1 border-b"
                                                            />
                                                            <input
                                                                value={ing.quantity}
                                                                onChange={(e) => {
                                                                    const newIngs = [...editData.ingredients!];
                                                                    newIngs[i].quantity = e.target.value;
                                                                    setEditData(prev => ({ ...prev!, ingredients: newIngs }));
                                                                }}
                                                                className="w-12 border-b text-right"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                selectedRecipe.ingredients?.map((ing, i) => (
                                                    <li key={i} className="text-sm border-b border-zinc-100 pb-2 flex justify-between">
                                                        <span>{ing.name}</span>
                                                        <span className="font-medium text-zinc-400">{ing.quantity} {ing.unit}</span>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-400 mb-4">Method</h3>
                                        <ol className="space-y-4">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    {editData?.instructions?.map((step, i) => (
                                                        <textarea
                                                            key={i}
                                                            value={step}
                                                            onChange={(e) => {
                                                                const newSteps = [...editData.instructions!];
                                                                newSteps[i] = e.target.value;
                                                                setEditData(prev => ({ ...prev!, instructions: newSteps }));
                                                            }}
                                                            className="w-full text-sm border rounded p-2 focus:ring-1 focus:ring-zinc-900"
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                selectedRecipe.instructions?.map((step, i) => (
                                                    <li key={i} className="text-sm text-zinc-600 leading-relaxed flex gap-3">
                                                        <span className="text-zinc-300 font-bold">{i + 1}.</span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))
                                            )}
                                        </ol>
                                    </section>
                                </div>

                                <div className="mt-12 pt-8 border-t flex justify-end gap-3">
                                    {selectedRecipe.ownerId !== user?.uid && (
                                        <button
                                            onClick={() => handleClaimRecipe(selectedRecipe)}
                                            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Claim this Recipe
                                        </button>
                                    )}
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-2 text-sm font-medium hover:bg-zinc-100 rounded-full transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleUpdateRecipe(selectedRecipe.id, editData!)}
                                                className="px-8 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
                                            >
                                                Save Changes
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleStartEdit}
                                            className="px-8 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-200 transition-all active:scale-95"
                                        >
                                            Edit Recipe
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
