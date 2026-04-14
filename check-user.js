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

async function checkUser() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'yogeshmotwani96@gmail.com');

    if (error) {
        console.error("Error fetching user:", error);
    } else {
        console.log("User profiles for yogeshmotwani96@gmail.com:");
        console.table(profiles);
    }
}

checkUser();
