"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Clock, Users, MoreHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

import { Recipe } from "@/types";

interface DraggableRecipeProps {
    recipe: Recipe;
    onDragStart?: (recipe: Recipe) => void;
    onDragEnd?: () => void;
    onUpdateCategory?: (recipeId: string, category: string) => void;
    layoutId?: string;
}

const CATEGORIES = ["Soups/Starters", "Mains", "Desserts", "Baby"];

export default function DraggableRecipe({ recipe, onDragStart, onDragEnd, onUpdateCategory, layoutId }: DraggableRecipeProps) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showMenu) return;

        const handleGlobalClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };

        window.addEventListener("mousedown", handleGlobalClick);
        return () => window.removeEventListener("mousedown", handleGlobalClick);
    }, [showMenu]);

    return (
        <motion.div
            layout
            layoutId={layoutId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, boxShadow: "0px 4px 12px rgba(0,0,0,0.05)" }}
            whileDrag={{ scale: 1.05, zIndex: 100, boxShadow: "0px 10px 25px rgba(0,0,0,0.2)" }}
            drag
            dragSnapToOrigin
            onDragStart={() => onDragStart?.(recipe)}
            onDragEnd={onDragEnd}
            onContextMenu={(e) => {
                if (onUpdateCategory) {
                    e.preventDefault();
                    setShowMenu(true);
                }
            }}
            className={cn(
                "bg-white rounded-xl p-3 border border-zinc-100 shadow-sm cursor-grab active:cursor-grabbing group relative",
                showMenu && "ring-2 ring-zinc-900 shadow-lg"
            )}
            style={{
                zIndex: showMenu ? 50 : "auto"
            }}
        >
            {/* Decorative color strip */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl", recipe.color || "bg-zinc-200")} />

            <div className="flex items-start gap-2 pl-1">
                <div className="pt-1.5 text-zinc-300 group-hover:text-zinc-400 transition-colors shrink-0">
                    <GripVertical size={14} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[13px] text-zinc-900 line-clamp-2 leading-tight">
                        {recipe.title}
                    </h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                        {recipe.prepTime && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <Clock size={9} /> {recipe.prepTime}m
                            </span>
                        )}
                        {recipe.servings && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <Users size={9} /> serves {recipe.servings}
                            </span>
                        )}
                    </div>
                </div>

                {onUpdateCategory && (
                    <div className="relative">
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            <MoreHorizontal size={16} />
                        </button>

                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    ref={menuRef}
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-1 w-40 bg-white border border-zinc-200 rounded-lg shadow-2xl z-50 p-1 flex flex-col gap-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-2 py-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                        Move To
                                    </div>
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateCategory(recipe.id, cat);
                                                setShowMenu(false);
                                            }}
                                            className={cn(
                                                "flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors text-left",
                                                (recipe.category || "Mains") === cat
                                                    ? "bg-zinc-900 text-white"
                                                    : "text-zinc-600 hover:bg-zinc-50"
                                            )}
                                        >
                                            {cat}
                                            {(recipe.category || "Mains") === cat && <Check size={12} />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
