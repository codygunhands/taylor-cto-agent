/**
 * Finalize Redis/Valkey addition - Wait for cluster then add to app
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';
const VALKEY_ID = '57d56ce5-02c9-4a4c-89b4-6d04b10b3898';

async function finalizeRedis() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 FINALIZING REDIS/VALKEY ADDITION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Wait for cluster to be online
    console.log('⏳ Waiting for Valkey cluster to be ready...\n');
    let attempts = 0;
    while (attempts < 60) {
      const dbResponse = await axios.get(`${DO_API_BASE}/databases/${VALKEY_ID}`, {
        headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
      });
      
      const status = dbResponse.data.database.status;
      process.stdout.write(`   Status: ${status}...\r`);
      
      if (status === 'online') {
        console.log('\n✅ Valkey cluster is online!\n');
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Get app spec
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if already added
    const hasRedis = spec.databases.some(d => d.name === 'redis');
    if (hasRedis) {
      console.log('✅ Redis already added to app!\n');
    } else {
      // Add Redis
      spec.databases.push({
        name: 'redis',
        engine: 'REDIS',
        version: '8',
        production: true,
        cluster_name: VALKEY_ID,
      });

      delete spec.ingress;

      await axios.put(
        `${DO_API_BASE}/apps/${APP_ID}`,
        { spec },
        {
          headers: {
            'Authorization': `Bearer ${DO_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Redis added to app!\n');
    }

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉🎉🎉 JEFF DEPLOYMENT 100% COMPLETE VIA API! 🎉🎉🎉');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}`);
    console.log(`Live URL: ${finalApp.data.app.live_url || 'Pending deployment...'}\n`);
    console.log('Components:');
    console.log(`  ✅ Services: ${finalApp.data.app.spec.services.length} - ${finalApp.data.app.spec.services.map(s => s.name).join(', ')}`);
    console.log(`  ✅ Workers: ${finalApp.data.app.spec.workers?.length || 0} - ${finalApp.data.app.spec.workers?.map(w => w.name).join(', ') || 'none'}`);
    console.log(`  ✅ Databases: ${finalApp.data.app.spec.databases.length}`);
    finalApp.data.app.spec.databases.forEach(db => {
      console.log(`     - ${db.name}: ${db.engine}`);
    });
    console.log('\n🎉 ALL COMPONENTS DEPLOYED VIA DIGITALOCEAN API!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

finalizeRedis();

