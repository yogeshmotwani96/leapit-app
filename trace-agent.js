import NodeWebcam from 'node-webcam';
import { Jimp, loadFont } from 'jimp';
import { SANS_32_WHITE } from 'jimp/fonts';
import fs from 'fs';
import path from 'path';

console.log("🛠️ BEGINNING TRACE DIAGNOSTICS...");

const TEST_PATH = path.resolve('trace_test.jpg');
const PROCESSED_PATH = path.resolve('trace_processed.jpg');

const options = {
    width: 1280,
    height: 720,
    quality: 80,
    saveShots: true,
    output: "jpeg",
    device: false, // Default camera
    callbackReturn: "location",
    verbose: true // WE ENABLE VERBOSE FOR TRACING
};

async function runTrace() {
    try {
        console.log("1. Initializing Webcam...");
        const webcam = NodeWebcam.create(options);

        console.log("2. Attempting to CAPTURE to " + TEST_PATH);
        webcam.capture(TEST_PATH, async (err, data) => {
            if (err) {
                console.error("❌ STEP 2 FAILED: Webcam Capture Error:", err);
                console.log("💡 Tip: On Windows, make sure no other app (Zoom/Teams) is using the camera.");
                return;
            }
            console.log("✅ STEP 2 SUCCESS: Raw photo saved at " + data);

            try {
                console.log("3. Loading Image into JIMP for overlay check...");
                if (!fs.existsSync(TEST_PATH)) throw new Error("File not found on disk!");
                
                const image = await Jimp.read(TEST_PATH);
                console.log("✅ STEP 3 SUCCESS: Jimp loaded the image (" + image.bitmap.width + "x" + image.bitmap.height + ")");

                console.log("4. Loading Fonts...");
                // Jimp 1.x now requires the separately exported loadFont function
                const font = await loadFont(SANS_32_WHITE);
                console.log("✅ STEP 4 SUCCESS: Jimp fonts loaded.");

                console.log("5. Applying Test Overlay...");
                image.print({ font, x: 10, y: 10, text: "TRACE TEST OK" });
                await image.write(PROCESSED_PATH);
                console.log("✅ STEP 5 SUCCESS: Processed image saved at " + PROCESSED_PATH);

                console.log("\n🎊 DIAGNOSTICS COMPLETE: Your camera and image software are WORKING.");
                console.log("🚀 The problem is likely your Supabase Storage Bucket or Service Key.");
            } catch (jimpErr) {
                console.error("❌ JIMP/OVERLAY ERROR:", jimpErr.message);
            }
        });
    } catch (rootErr) {
        console.error("❌ CRITICAL UNHANDLED ERROR:", rootErr.message);
    }
}

runTrace();
