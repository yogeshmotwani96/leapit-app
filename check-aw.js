async function checkAWPorts() {
    const ports = [5600, 5666, 12705];
    console.log("🔍 Pinging ActivityWatch Ports (Native Fetch)...");

    for (const port of ports) {
        try {
            console.log(`\nTesting Port ${port}...`);
            
            // Try v0 API
            const res0 = await fetch(`http://localhost:${port}/api/0/buckets`).catch(() => null);
            if (res0 && res0.ok) {
                console.log(`✅ [API v0] Response OK on port ${port}`);
            }

            // Try v1 API
            const res1 = await fetch(`http://localhost:${port}/api/v1/buckets`).catch(() => null);
            if (res1 && res1.ok) {
                console.log(`✅ [API v1] Response OK on port ${port}`);
            }

            if ((!res0 || !res0.ok) && (!res1 || !res1.ok)) {
                console.log(`❌ No response on port ${port}`);
            }
        } catch (e) {
            console.log(`❌ Error on port ${port}: ${e.message}`);
        }
    }
}

checkAWPorts();
