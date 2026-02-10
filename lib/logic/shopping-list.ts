import { Recipe } from "@/types";

export interface ShoppingItem {
    id: string; // unique based on name + unit
    name: string;
    quantity: number;
    unit: string;
    category: "Produce" | "Pantry" | "Dairy" | "Meat" | "Other";
    checked: boolean;
    originalItems: { recipeName: string; quantity: number; unit: string }[];
}

export interface PlannerState {
    [day: string]: {
        [meal: string]: {
            recipe: Recipe | null;
            servings: number | null;
        };
    };
}

/**
 * Normalizes units to a standard set if possible (very basic version).
 */
function normalizeUnit(unit: string): string {
    const u = unit.toLowerCase().trim();
    if (["g", "gram", "grams"].includes(u)) return "g";
    if (["kg", "kilogram", "kilograms"].includes(u)) return "kg";
    if (["ml", "milliliter", "milliliters"].includes(u)) return "ml";
    if (["l", "liter", "liters"].includes(u)) return "l";
    if (["tbsp", "tablespoon", "tablespoons"].includes(u)) return "tbsp";
    if (["tsp", "teaspoon", "teaspoons"].includes(u)) return "tsp";
    if (["cup", "cups"].includes(u)) return "cup";
    return u;
}

/**
 * Aggregates ingredients from a weekly meal plan with serving scaling.
 */
export function generateShoppingList(plan: PlannerState): ShoppingItem[] {
    const map = new Map<string, ShoppingItem>();

    Object.values(plan).forEach((meals) => {
        Object.values(meals).forEach(({ recipe, servings: plannedServings }) => {
            if (!recipe || !recipe.ingredients) return;

            // Determine scale factor: planned / base
            const baseServings = recipe.servings || 2;
            const servingsToShopFor = plannedServings || baseServings;
            const scaleFactor = servingsToShopFor / baseServings;

            recipe.ingredients.forEach((ing: any) => {
                const unit = normalizeUnit(ing.unit || "");
                const name = ing.name.toLowerCase().trim();
                const key = `${name}::${unit}`;

                const baseQty = parseFloat(ing.quantity) || 0;
                const scaledQty = baseQty * scaleFactor;

                if (map.has(key)) {
                    const item = map.get(key)!;
                    item.quantity += scaledQty;
                    item.originalItems.push({ recipeName: recipe.title, quantity: scaledQty, unit });
                } else {
                    map.set(key, {
                        id: key,
                        name: ing.name,
                        quantity: scaledQty,
                        unit: unit,
                        category: "Other",
                        checked: false,
                        originalItems: [{ recipeName: recipe.title, quantity: scaledQty, unit }]
                    });
                }
            });
        });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generates a string optimized for Ocado/Waitrose "Multi-Search" or "Quick Shop".
 * Format typically: "200g tomato, 1 milk, 500g pasta"
 */
export function generateOcadoSearchString(items: ShoppingItem[]): string {
    return items
        .filter(i => !i.checked) // Only export unchecked items? Or all? Let's expor all for now.
        .map((item) => {
            // Logic: If unit is "count" or empty, just "3 onions".
            // If unit is weight, "300g cheese".
            const qtyStr = item.quantity > 0 ? item.quantity : "";
            const unitStr = ["count", "pcs", ""].includes(item.unit) ? "" : item.unit;

            return `${qtyStr}${unitStr} ${item.name}`;
        })
        .join(", ");
}
