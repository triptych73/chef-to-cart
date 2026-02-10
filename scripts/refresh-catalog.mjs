import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * refresh-catalog.mjs
 * Connects to debug Chrome, scrapes Ocado Favourites, and merges into ocaodo-catalog.json.
 */
async function refresh() {
    console.log("🔗 Connecting to Chrome on port 9222...");

    let browser;
    try {
        browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
        const context = browser.contexts()[0];
        const page = await context.newPage();

        console.log("🖱️ Navigating to Ocado Favourites...");
        await page.goto("https://www.ocado.com/favourites", { waitUntil: "networkidle" });

        console.log("⏳ Waiting 10s for page to fully render...");
        await page.waitForTimeout(10000);

        console.log("📜 Scrolling to bottom to trigger lazy-loading...");
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 100;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight || totalHeight > 10000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        console.log("🕵️ Scraping all product links...");
        const products = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a'));
            console.log(`Debug: Found ${allLinks.length} total links on page`);

            const productLinks = allLinks.filter(link => link.href.includes("/products/"));
            const productMap = new Map();

            productLinks.forEach(link => {
                const url = link.href.split("?")[0];
                const id = url.split("/").pop();
                const name = (link.title || link.innerText || "").trim();

                // Only keep if it has a name longer than 3 chars (excludes icons/thumbnails)
                // Also exclude links that are just 'Product details' or similar common noise
                const noise = ["product details", "add to trolley", "increase quantity", "decrease quantity"];
                if (id && name.length > 3 && !noise.some(n => name.toLowerCase().includes(n))) {
                    // Update if we find a better name (some links are just the ID)
                    if (!productMap.has(id) || name.length > productMap.get(id).name.length) {
                        productMap.set(id, { id, name, url, frequency: 1 });
                    }
                }
            });

            return Array.from(productMap.values());
        });

        console.log(`✅ Scraped ${products.length} products.`);

        const catalogPath = path.resolve("lib/data/ocado-catalog.json");
        let catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

        let newCount = 0;
        for (const product of products) {
            if (!catalog.find(c => c.id === product.id)) {
                catalog.push(product);
                newCount++;
            }
        }

        if (newCount > 0) {
            fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 4));
            console.log(`🎉 Added ${newCount} new products to your catalog! Total: ${catalog.length}`);
        } else {
            console.log("ℹ️ No new products found to add.");
        }

        await page.close();

    } catch (err) {
        console.error("❌ Error refreshing catalog:", err.message);
        console.log("💡 Tip: Make sure Chrome is running via 'npm run cart:launch' and you are logged in.");
    } finally {
        if (browser) await browser.close();
    }
}

refresh();
