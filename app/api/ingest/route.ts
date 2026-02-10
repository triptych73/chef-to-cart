import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempFilePath = join(tmpdir(), `recipe-${Date.now()}-${file.name}`);

        // Save temp file
        await writeFile(tempFilePath, buffer);

        try {
            // Execute Python script
            // Assumes 'python' or 'python3' is in PATH. 
            // Adjust path to ocr_agent.py if needed. It resides in 'lib/ai/ocr_agent.py'
            const scriptPath = join(process.cwd(), "lib", "ai", "ocr_agent.py");

            // We pass the temp file path as an argument
            const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${tempFilePath}"`, {
                env: { ...process.env }, // Pass existing env including GOOGLE_API_KEY
            });

            if (stderr) {
                console.warn("Python Stderr:", stderr);
            }

            // Python script prints JSON to stdout
            const result = JSON.parse(stdout);

            if (result.error) {
                throw new Error(result.error);
            }

            return NextResponse.json({ recipe: result });

        } catch (execError: any) {
            console.error("OCR execution error:", execError);
            return NextResponse.json({ error: "Failed to analyze image: " + (execError.message || "Unknown error") }, { status: 500 });
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
