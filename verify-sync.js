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

async function checkSync() {
    const { data, error } = await supabase
        .from('proof_of_presence')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Latest Proof of Presence records:");
        console.table(data);
    }
}

checkSync();
