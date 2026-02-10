import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { matches } = body;

        if (!matches || !Array.isArray(matches)) {
            return NextResponse.json({ error: "Missing or invalid matches" }, { status: 400 });
        }

        // Format for cart-sync.mjs
        const jobMatches = matches.filter(m => m.matched_product_id && m.cart_quantity > 0);
        const jobData = {
            timestamp: new Date().toISOString(),
            matches: jobMatches.map(m => ({
                ingredientName: m.ingredient,
                match: {
                    id: m.matched_product_id,
                    name: m.matched_product_name,
                    url: `https://www.ocado.com/products/${m.matched_product_id}`
                },
                suggestedCartQuantity: m.cart_quantity
            }))
        };

        // Write cart_job.json to project root
        const jobPath = join(process.cwd(), "cart_job.json");
        await writeFile(jobPath, JSON.stringify(jobData, null, 2));

        console.log("📁 Sync Job saved to project root.");

        // Trigger npm run cart:sync
        // We use spawn so we don't block the API response while the script runs
        const syncProcess = spawn("npm", ["run", "cart:sync"], {
            cwd: process.cwd(),
            detached: true,
            stdio: "ignore",
            env: { ...process.env }
        });

        syncProcess.unref(); // Allow the parent process to exit independently

        console.log("🚀 Sync automation triggered in background.");

        return NextResponse.json({
            success: true,
            message: "Sync job saved and automation triggered. Watch the VNC window!",
            itemCount: jobMatches.length
        });

    } catch (error: any) {
        console.error("Cart Sync API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
