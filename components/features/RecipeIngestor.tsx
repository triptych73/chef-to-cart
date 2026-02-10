"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ingredient {
    quantity: string;
    unit: string;
    name: string;
}

interface RecipeData {
    title: string;
    category?: string;
    servings: number;
    ingredients: Ingredient[];
    instructions: string[];
    prep_time_minutes?: number;
    cook_time_minutes?: number;
}

interface RecipeIngestorProps {
    onSave?: (recipe: RecipeData) => void;
    onCancel?: () => void;
}

export default function RecipeIngestor({ onSave, onCancel }: RecipeIngestorProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
            setRecipeData(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".jpeg", ".jpg", ".png", ".webp"],
        },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/ingest", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to process recipe");
            }

            setRecipeData({
                ...data.recipe,
                ingredients: data.recipe.ingredients || [],
                instructions: data.recipe.instructions || []
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
            <div className="space-y-2 text-center">
                <h2 className="text-3xl font-serif font-medium tracking-tight">Add a Recipe</h2>
                <p className="text-muted-foreground text-sm">Upload a photo of your cookbook or handwritten note.</p>
            </div>

            <div
                {...getRootProps()}
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 ease-in-out cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[250px]",
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
                    file && "border-green-500/50 bg-green-50/50"
                )}
            >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                    {!file ? (
                        <motion.div
                            key="prompt"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-2 text-center"
                        >
                            <div className="p-4 rounded-full bg-muted/50">
                                <UploadCloud className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG, WebP (Max 10MB)</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden shadow-sm border">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {file && !recipeData && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                >
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className={cn(
                            "px-8 py-2.5 rounded-full font-medium text-white shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2",
                            isUploading ? "bg-zinc-700" : "bg-zinc-900 hover:bg-zinc-800"
                        )}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing Recipe...
                            </>
                        ) : (
                            "Extract Recipe Data"
                        )}
                    </button>
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </motion.div>
            )}

            {recipeData && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border rounded-xl shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b bg-muted/20">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-serif font-medium">{recipeData.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {["Soups/Starters", "Mains", "Desserts", "Baby"].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setRecipeData({ ...recipeData, category: cat })}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                                        recipeData.category === cat
                                            ? "bg-zinc-900 text-white shadow-sm"
                                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-4">
                            {recipeData.servings && <span>Serves {recipeData.servings}</span>}
                            {recipeData.prep_time_minutes && <span>Prep: {recipeData.prep_time_minutes}m</span>}
                        </div>
                    </div>

                    <div className="p-6 grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Ingredients
                            </h4>
                            <ul className="space-y-2 text-sm">
                                {recipeData.ingredients?.length > 0 ? (
                                    recipeData.ingredients.map((ing, i) => (
                                        <li key={i} className="flex gap-2 pb-2 border-b border-dashed last:border-0 border-muted">
                                            <span className="font-semibold">{ing.quantity} {ing.unit}</span>
                                            <span className="text-muted-foreground">{ing.name}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-muted-foreground italic">No ingredients identified.</li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Instructions
                            </h4>
                            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                                {recipeData.instructions?.length > 0 ? (
                                    recipeData.instructions.map((step, i) => (
                                        <li key={i} className="pl-1 leading-relaxed">
                                            {step}
                                        </li>
                                    ))
                                ) : (
                                    <li className="list-none text-muted-foreground italic">No instructions identified.</li>
                                )}
                            </ol>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/20 border-t flex justify-end gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={() => onSave?.(recipeData)}
                            className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg shadow-sm hover:bg-zinc-800 transition-colors"
                        >
                            Save to Cookbook
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
