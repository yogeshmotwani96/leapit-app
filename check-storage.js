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

async function checkStorage() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error);
    } else {
        console.log("Current Storage Buckets:");
        console.table(data.map(b => ({ name: b.name, public: b.public })));
        
        const exists = data.find(b => b.name === 'proof-of-presence');
        if (!exists) {
            console.error("CRITICAL: 'proof-of-presence' bucket is MISSING!");
        }
    }
}

checkStorage();
