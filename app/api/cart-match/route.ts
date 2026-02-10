import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body || !body.items) {
            return NextResponse.json({ error: "No shopping list items provided" }, { status: 400 });
        }

        const tempFilePath = join(tmpdir(), `cart-match-${Date.now()}.json`);

        // Save shopping list to temp file for the Python script
        await writeFile(tempFilePath, JSON.stringify(body.items));

        try {
            // Execute Python script
            const scriptPath = join(process.cwd(), "lib", "ai", "cart_matcher_agent.py");
            const catalogPath = join(process.cwd(), "lib", "data", "ocado-catalog.json");

            const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${tempFilePath}" "${catalogPath}"`, {
                env: { ...process.env },
            });

            if (stderr) {
                console.warn("Python Matcher Stderr:", stderr);
            }

            const result = JSON.parse(stdout);

            if (result.error) {
                throw new Error(result.error);
            }

            return NextResponse.json(result);

        } catch (execError: any) {
            console.error("Cart Matcher execution error:", execError);
            return NextResponse.json({ error: "Failed to match items: " + (execError.message || "Unknown error") }, { status: 500 });
        } finally {
            // Cleanup temp file
            try {
                await unlink(tempFilePath);
            } catch (e) {
                console.warn("Failed to delete temp file:", tempFilePath);
            }
        }

    } catch (error: any) {
        console.error("API Route error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
