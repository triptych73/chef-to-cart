import { cn } from "@/lib/utils";

/**
 * Parses Ocado Favourites HTML to extract product details.
 * Expects the raw HTML string of the 'Favourites' page or a specific list section.
 */
export interface OcadoProduct {
    id: string;
    name: string;
    price: string;
    image?: string;
    category?: string;
}

export function parseOcadoFavourites(htmlContent: string): OcadoProduct[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const specificProducts: OcadoProduct[] = [];

    // Selector strategy: Ocado's structure changes, but products usually reside in list items
    // Look for common product wrappers. This is a heuristic based on typical e-commerce structures.
    // We look for elements with 'fop-contentWrapper' or similar classes often used by Ocado's FOP (First On Page?) components.

    // Strategy A: Look for 'fops-item' (Fear Of Possum? No, likely 'Feature On Page' or 'Food Option Product'?)
    const items = doc.querySelectorAll('.fops-item');

    items.forEach((item) => {
        try {
            // Name
            const nameEl = item.querySelector('.fops-title') || item.querySelector('h4') || item.querySelector('a[title]');
            const name = nameEl?.textContent?.trim() || nameEl?.getAttribute('title') || "Unknown Product";

            // Price
            const priceEl = item.querySelector('.fops-price') || item.querySelector('.price-group');
            const price = priceEl?.textContent?.trim() || "0.00";

            // Image
            const imgEl = item.querySelector('img.fops-img') as HTMLImageElement;
            const image = imgEl?.src || imgEl?.dataset?.src || "";

            // ID (often in input value or data attribute)
            const idInput = item.querySelector('input[name="sku"]') as HTMLInputElement;
            const id = idInput?.value || item.getAttribute('id') || `sku-${Math.random().toString(36).substr(2, 9)}`;

            if (name && name !== "Unknown Product") {
                specificProducts.push({
                    id,
                    name,
                    price,
                    image,
                    category: "Imported"
                });
            }
        } catch (e) {
            console.warn("Failed to parse an Ocado item", e);
        }
    });

    return specificProducts;
}
