import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.resolve('.env.local');
const envData = fs.readFileSync(ENV_PATH, 'utf-8');
const getEnvVal = (key) => {
    const match = envData.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabase = createClient(getEnvVal('VITE_SUPABASE_URL'), getEnvVal('VITE_SUPABASE_SERVICE_ROLE_KEY'));

async function listFiles() {
    const { data: profiles } = await supabase.from('profiles').select('id').eq('email', 'yogeshmotwani96@gmail.com');
    const userId = profiles?.[0]?.id;

    if (!userId) {
        console.log("User not found.");
        return;
    }

    console.log(`Checking files for userId: ${userId}`);
    const { data, error } = await supabase.storage.from('proof-of-presence').list(userId);

    if (error) {
        console.error("Error listing files:", error.message);
    } else {
        console.log("Files found in 'proof-of-presence' bucket:");
        console.table(data);
    }
}

listFiles();
