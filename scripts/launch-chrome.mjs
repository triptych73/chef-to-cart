import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * launch-chrome.mjs
 * Streamlines the Ocado Chrome Debugging workflow.
 * 1. Kills existing Chrome processes.
 * 2. Lauches Chrome with remote debugging on port 9222 and a persistent profile.
 */
async function launch() {
    console.log("🛑 Killing existing Chrome processes...");
    try {
        await execAsync('taskkill /F /IM chrome.exe /T');
    } catch (e) {
        // Ignore errors if no chrome is running
    }

    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const userDataDir = "C:\\temp\\chrome-ocado-profile";

    if (!fs.existsSync(userDataDir)) {
        console.log(`📂 Creating persistent profile directory: ${userDataDir}`);
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    console.log("🚀 Launching Chrome with Remote Debugging Port 9222...");
    console.log(`🔗 Profile: ${userDataDir}`);

    // Command to launch Chrome and return immediately
    const cmd = `start "" "${chromePath}" --remote-debugging-port=9222 --user-data-dir="${userDataDir}"`;

    exec(cmd, (error) => {
        if (error) {
            console.error(`❌ Failed to launch Chrome: ${error.message}`);
        }
    });

    console.log("\n✨ Chrome is launching! Please log in to Ocado in the new window.");
    console.log("👉 Once logged in, run: npm run cart:sync\n");
}

launch();
