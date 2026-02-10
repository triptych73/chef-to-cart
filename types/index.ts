export interface Ingredient {
    name: string;
    quantity: string | number;
    unit: string;
    raw?: string;
}

export type RecipeCategory = "Soups/Starters" | "Mains" | "Desserts" | "Baby";

export interface Recipe {
    id: string;
    title: string;
    category?: RecipeCategory;
    image?: string;
    prepTime?: number;
    servings?: number;
    color?: string;
    ingredients?: Ingredient[];
    instructions?: string[];
    ownerId?: string;
    createdAt?: string;
}

export interface MealSlot {
    recipeId: string | null;
    servings: number | null;
}

export interface MealPlan {
    id: string; // userId_weekStartDate
    userId: string;
    weekStartDate: string;
    days: {
        [day: string]: {
            Lunch: MealSlot | null;
            Dinner: MealSlot | null;
        }
    };
    updatedAt?: any;
}

export interface PantryItem {
    id: string;
    name: string;
    category: string;
    status: "In Stock" | "Low" | "Out of Stock";
    lastPurchased?: string;
}

export interface CatalogItem {
    id: string;
    name: string;
    url: string;
    frequency: number;
}

export interface MatchResult {
    ingredient: string;
    quantity_needed: string | number;
    matched_product_id: string | null;
    matched_product_name: string | null;
    confidence: "high" | "medium" | "none";
    cart_quantity: number;
    reasoning?: string;
}
