import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Ocado Cart Automation Script
 * Connects to an existing Chrome instance via Remote Debugging Port 9222.
 *
 * Usage:
 *   npm run cart:sync           -- Smart mode: checks existing quantities
 *   npm run cart:sync -- --add  -- Add mode: blindly stacks quantities
 */

const addMode = process.argv.includes("--add");
console.log(addMode
    ? "📦 ADD mode: stacking quantities on top of existing"
    : "🧠 SMART mode: checking existing basket quantities first"
);

async function run() {
    const localJobPath = path.resolve("cart_job.json");
    const downloadsJobPath = path.join(process.env.USERPROFILE || "", "Downloads", "cart_job.json");

    let jobPath = null;
    if (fs.existsSync(localJobPath)) {
        jobPath = localJobPath;
    } else if (fs.existsSync(downloadsJobPath)) {
        console.log(`📁 Found sync job in Downloads: ${downloadsJobPath}`);
        jobPath = downloadsJobPath;
    }

    if (!jobPath) {
        console.error("❌ No cart_job.json found.");
        console.error(`   Checked: ${localJobPath}`);
        console.error(`   Checked: ${downloadsJobPath}`);
        console.error("   Please generate it from the Shop page first.");
        return;
    }

    const job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
    const matches = job.matches;
    const catalogPath = path.resolve("lib/data/ocado-catalog.json");
    let catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

    if (matches.length === 0) {
        console.log("ℹ️ No items to add to cart.");
        return;
    }

    console.log(`🚀 Starting Ocado Cart Sync for ${matches.length} items...`);
    console.log("🔗 Connecting to Chrome on port 9222 (127.0.0.1)...");

    let browser;
    try {
        // Connect to existing browser
        browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
        const context = browser.contexts()[0];
        const page = await context.newPage();

        for (const item of matches) {
            const hasMatch = item.match && item.match.id;
            const ingredientName = item.ingredientName || item.ingredient;
            const targetUrl = hasMatch ? item.match.url : `https://www.ocado.com/search?entry=${encodeURIComponent(ingredientName)}`;

            console.log(`🛒 Processing: ${ingredientName} -> ${hasMatch ? item.match.name : "SEARCH FALLBACK"}`);

            try {
                await page.goto(targetUrl, { waitUntil: "networkidle" });

                // If we're on the search page, grab the first result
                if (!hasMatch) {
                    console.log(`   🔍 Searching for ${ingredientName}...`);
                    const firstResult = await page.$('li.fops-item [data-test="add-button"], li.fops-item a');
                    if (firstResult) {
                        const productLink = await page.$eval('li.fops-item .fops-title a', el => ({
                            name: el.title || el.innerText,
                            url: el.href,
                            id: el.href.split("/").pop()
                        })).catch(() => null);

                        if (productLink) {
                            console.log(`   ✨ Found & Learning: ${productLink.name}`);
                            // Auto-learn: Add to catalog if not there
                            if (!catalog.find(c => c.id === productLink.id)) {
                                catalog.push({
                                    id: productLink.id,
                                    name: productLink.name,
                                    url: productLink.url,
                                    frequency: 1
                                });
                                fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 4));
                            }
                            // Redirect to the product page to handle quantity correctly
                            await page.goto(productLink.url, { waitUntil: "networkidle" });
                        }
                    } else {
                        console.warn(`   ⚠️ No search results found for ${ingredientName}`);
                        continue;
                    }
                }

                // STABLE SELECTORS (from user DOM inspection)
                const plusButtonSelector = '[data-test="counter:increment"]';
                const addButtonSelector = '[data-test="add-button"]';
                const qtyInputSelector = 'input[data-test="quantity-in-basket"]';

                await page.waitForTimeout(500); // Small wait for hydration

                const plusButton = await page.$(plusButtonSelector);
                const addButton = await page.$(addButtonSelector);
                const suggestedQty = item.suggestedCartQuantity || item.cart_quantity || 1;

                // Read current basket quantity (0 if not in trolley)
                const currentQty = await page.$eval(qtyInputSelector, el => parseInt(el.value || "0")).catch(() => 0);

                // SMART MODE: skip if we already have enough
                if (!addMode && currentQty >= suggestedQty) {
                    console.log(`   ✅ Already have ${currentQty}/${suggestedQty} — skipping`);
                    continue;
                }

                // Calculate how many clicks we need
                const clicksNeeded = addMode ? suggestedQty : (suggestedQty - currentQty);

                if (plusButton) {
                    // Item already in trolley — just click + the right number of times
                    console.log(`   📊 In trolley: ${currentQty} | Need: ${suggestedQty} | Adding: ${clicksNeeded} more`);
                    for (let i = 0; i < clicksNeeded; i++) {
                        await plusButton.click();
                        await page.waitForTimeout(400);
                    }
                } else if (addButton) {
                    // Not in trolley — click Add first, then + for any remaining
                    console.log(`   ✨ Not in trolley. Adding ${suggestedQty}...`);
                    await addButton.click();
                    await page.waitForTimeout(1000);

                    if (suggestedQty > 1) {
                        const newPlus = await page.waitForSelector(plusButtonSelector, { timeout: 3000 }).catch(() => null);
                        if (newPlus) {
                            for (let i = 0; i < suggestedQty - 1; i++) {
                                await newPlus.click();
                                await page.waitForTimeout(400);
                            }
                        }
                    }
                } else {
                    console.warn(`   ⚠️ Could not find Add/+ buttons. Selector issue or out of stock?`);
                }

            } catch (err) {
                console.error(`   ❌ Failed to process ${ingredientName}:`, err.message);
            }
        }

        console.log("✅ Sync complete!");
        await page.close();

    } catch (err) {
        console.error("❌ Fatal Error: Could not connect to Chrome. Is it running with --remote-debugging-port=9222?", err.message);
    } finally {
        if (browser) await browser.close();
    }
}

run();
