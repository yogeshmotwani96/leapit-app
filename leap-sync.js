import fs from 'fs';
import path from 'path';
import screenshot from 'screenshot-desktop';
import { Jimp, loadFont } from 'jimp';
import { SANS_32_WHITE } from 'jimp/fonts';
import { createClient } from '@supabase/supabase-js';

/**
 * Leap IT Agent - Telemetry Sync Script
 * This script is designed to be packaged into a standalone .exe for employees.
 */

// 1. Identify Config Location
const CONFIG_PATH = path.resolve('leapsync-config.json');
const ENV_PATH = path.resolve('.env.local'); // Only used for developer/local testing

let SUPABASE_URL, SERVICE_KEY, USER_EMAIL;

// 2. Load Configuration
if (fs.existsSync(CONFIG_PATH)) {
    // Production Mode: Load from config file (created by installer or manually)
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    SUPABASE_URL = config.supabaseUrl;
    SERVICE_KEY = config.serviceKey;
    USER_EMAIL = config.email;
    console.log(`💼 Production Mode: Syncing for ${USER_EMAIL}`);
} else if (fs.existsSync(ENV_PATH)) {
    // Developer Mode: Load from .env.local
    const envData = fs.readFileSync(ENV_PATH, 'utf-8');
    const getEnvVal = (key) => {
        const match = envData.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };
    SUPABASE_URL = getEnvVal('VITE_SUPABASE_URL');
    SERVICE_KEY = getEnvVal('VITE_SUPABASE_SERVICE_ROLE_KEY');
    USER_EMAIL = 'yogeshmotwani96@gmail.com'; // Default for testing
    console.log(`🛠️ Developer Mode: Syncing for ${USER_EMAIL}`);
} else {
    console.error("❌ Configuration Error: No config file or .env.local found.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const AW_API = 'http://localhost:5600/api/0';

let isFirstRun = true;

async function getUserId() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, has_setup_tracking')
        .eq('email', USER_EMAIL)
        .limit(1);
    
    if (error || !profiles || profiles.length === 0) {
        throw new Error("Could not find portal account for " + USER_EMAIL);
    }
    return profiles[0];
}

async function syncActivityWatch() {
    try {
        const user = await getUserId();
        
        if (!user.has_setup_tracking) {
            console.log("⏳ Waiting for portal onboarding to be completed...");
            return;
        }

        // --- 1. Regular Activity Logging ---
        const bucketsRes = await fetch(`${AW_API}/buckets`).catch(() => null);
        let currentActivity = null;

        if (bucketsRes && bucketsRes.ok) {
            const buckets = await bucketsRes.json();
            const windowBucket = Object.values(buckets).find(b => b.client === 'aw-watcher-window');
            
            if (windowBucket) {
                const eventsRes = await fetch(`${AW_API}/buckets/${windowBucket.id}/events?limit=25`);
                const events = await eventsRes.json();
                currentActivity = events.length > 0 ? events[0] : null;

                if (events.length > 0) {
                    const payload = events.map(e => ({
                        user_id: user.id,
                        app_name: e.data.app || 'System',
                        window_title: e.data.title || 'In Background',
                        duration_seconds: Math.floor(e.duration || 0),
                        timestamp: e.timestamp
                    }));
                    await supabase.from('activity_logs').insert(payload);
                    console.log(`✅ [${new Date().toLocaleTimeString()}] ${payload.length} activities synced.`);
                }
            }
        } else {
            console.log("⚠️ ActivityWatch Offline: Syncing system pulse only.");
        }

        // --- 2. Phase 1: Mandatory Immediate Capture on startup ---
        if (isFirstRun) {
            // Verify Bucket Existence (One time check)
            console.log("🔍 Checking Cloud Storage Configuration...");
            const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
            
            if (bucketError) {
                console.error("❌ CLOUD ERROR: Could not verify storage buckets. Check your API keys.", bucketError.message);
            } else if (!buckets.find(b => b.name === 'proof-of-presence')) {
                console.error("❌ CRITICAL ERROR: The 'proof-of-presence' bucket was NOT found on your Supabase. Snapshots will FAIL.");
                console.log("💡 Fix: Run the storage_setup.sql command in your Supabase SQL Editor.");
            } else {
                console.log("✅ Cloud Storage Verified.");
            }

            console.log("📸 [STARTUP] Capturing initial Proof of Presence...");
            await captureProofOfPresence(user, currentActivity);
            isFirstRun = false;
            scheduleNextCapture(user); // Kick off the random cycle
        }
        
    } catch (err) {
        console.error("❌ Sync Error:", err.message);
    }
}

/**
 * Randomizes the next capture within the next 60m window.
 */
function scheduleNextCapture(user) {
    // Generate a random delay between 10m and 55m to ensure variability 
    // but stay within the hour-ish block
    const randomMinutes = Math.floor(Math.random() * 50) + 10; 
    const delayMs = randomMinutes * 60 * 1000;
    
    console.log(`🕒 Next random capture scheduled in ${randomMinutes} minutes.`);
    
    setTimeout(async () => {
        try {
            console.log("📸 [RANDOM] Triggering Proof of Presence capture...");
            
            // Re-fetch context for accurate title
            const bucketsRes = await fetch(`${AW_API}/buckets`).catch(() => null);
            let currentActivity = null;
            if (bucketsRes && bucketsRes.ok) {
                const buckets = await bucketsRes.json();
                const windowBucket = Object.values(buckets).find(b => b.client === 'aw-watcher-window');
                if (windowBucket) {
                    const eventsRes = await fetch(`${AW_API}/buckets/${windowBucket.id}/events?limit=1`);
                    const events = await eventsRes.json();
                    currentActivity = events[0];
                }
            }

            await captureProofOfPresence(user, currentActivity);
            scheduleNextCapture(user); // Chain to the next window
        } catch (err) {
            console.error("❌ Random Capture Error:", err.message);
            scheduleNextCapture(user); // Try again anyway
        }
    }, delayMs);
}

async function captureProofOfPresence(user, activity) {
    return new Promise(async (resolve, reject) => {
        let activityTitle = "Idle / No Activity Detected";
        
        if (activity && activity.data) {
            activityTitle = `${activity.data.app || 'App'} - ${activity.data.title || 'Unknown Window'}`;
        } else {
            // Check if ActivityWatch is totally offline
            const awCheck = await fetch(`${AW_API}/buckets`).catch(() => null);
            if (!awCheck) activityTitle = "System Activity Tracker Offline";
        }
        const timestamp = new Date().getTime();
        const sanitizedTitle = activityTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const storageFileName = `${sanitizedTitle}_${timestamp}.jpg`;
        const filePath = path.resolve(`./temp_presence.jpg`);

        try {
            console.log("📸 Capturing Desktop Screenshot...");
            await screenshot({ filename: filePath });
            
            console.log("🖊️ Adding overlay to photo...");
            const image = await Jimp.read(filePath);
            
            // Use a built-in font
            const font = await loadFont(SANS_32_WHITE);
            
            // Add a semi-transparent black bar at the bottom for readability
            const barHeight = 80;
                const barY = image.bitmap.height - barHeight;
                
                // Create a black rectangle manually (Jimp 1.x style)
                for (let y = barY; y < image.bitmap.height; y++) {
                    for (let x = 0; x < image.bitmap.width; x++) {
                        const idx = (image.bitmap.width * y + x) << 2;
                        image.bitmap.data[idx] = 0;     // R
                        image.bitmap.data[idx + 1] = 0; // G
                        image.bitmap.data[idx + 2] = 0; // B
                        image.bitmap.data[idx + 3] = 180; // A (Alpha)
                    }
                }

                // Add text
                const text = `Activity: ${activityTitle} | Time: ${new Date().toLocaleString()}`;
                image.print({ font, x: 20, y: barY + 20, text });
                
                // Save processed image
                const processedPath = path.resolve(`./processed_presence.jpg`);
                await image.write(processedPath);

                // 2. Upload to Supabase Storage
                console.log("☁️ Uploading to Supabase Storage...");
                const fileBuffer = fs.readFileSync(processedPath);
                const storagePath = `${user.id}/${storageFileName}`;

                const { data: storageData, error: uploadError } = await supabase.storage
                    .from('proof-of-presence')
                    .upload(storagePath, fileBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) {
                    console.error("❌ CLOUD UPLOAD ERROR:", uploadError.message);
                    if (uploadError.message.includes('not found')) {
                        console.log("💡 Tip: The 'proof-of-presence' bucket is missing in Supabase.");
                    }
                    throw uploadError;
                }

                const photoUrl = storageData.path;

                // 3. Log to Database
                const { error: dbError } = await supabase.from('proof_of_presence').insert({
                    user_id: user.id,
                    activity_title: activityTitle,
                    photo_url: photoUrl
                });

                if (dbError) {
                    console.error("❌ DATABASE SYNC ERROR:", dbError.message);
                    throw dbError;
                }

                console.log(`✅ [Presence] Captured & Synced successfully: ${activityTitle}`);

                // 4. Cleanup temp files
                fs.unlinkSync(filePath);
                if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
                
                resolve();
            } catch (procErr) {
                console.error("❌ [Presence Capture Failed]:", procErr.message);
                resolve();
            }
    });
}

// Start Cycle
console.log("🚀 LeapSync Agent active. Scanning for activity...");
syncActivityWatch();
setInterval(syncActivityWatch, 30000); // Faster sync (30s) for testing
