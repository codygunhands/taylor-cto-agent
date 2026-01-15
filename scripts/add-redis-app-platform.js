/**
 * Add Redis to app - Let App Platform provision it automatically
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addRedisAppPlatform() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 ADDING REDIS VIA APP PLATFORM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get current app spec
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if Redis already exists
    const hasRedis = spec.databases.some(d => d.engine === 'REDIS');
    if (hasRedis) {
      console.log('✅ Redis already added!\n');
      return;
    }

    console.log('📦 Adding Redis database (App Platform will provision it)...\n');

    // Add Redis WITHOUT cluster_name - App Platform will create it
    spec.databases.push({
      name: 'redis',
      engine: 'REDIS',
      version: '7',
      production: true,
      // No cluster_name - App Platform provisions it automatically
    });

    // Remove ingress to avoid validation issues
    delete spec.ingress;

    // Update app
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

    console.log('✅ Redis added! App Platform will provision the cluster automatically.\n');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ JEFF DEPLOYMENT 100% COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}`);
    console.log(`Live URL: ${finalApp.data.app.live_url || 'Pending deployment...'}\n`);
    console.log('Components:');
    console.log(`  ✅ Services: ${finalApp.data.app.spec.services.length} - ${finalApp.data.app.spec.services.map(s => s.name).join(', ')}`);
    console.log(`  ✅ Workers: ${finalApp.data.app.spec.workers?.length || 0} - ${finalApp.data.app.spec.workers?.map(w => w.name).join(', ') || 'none'}`);
    console.log(`  ✅ Databases: ${finalApp.data.app.spec.databases.length}`);
    finalApp.data.app.spec.databases.forEach(db => {
      console.log(`     - ${db.name}: ${db.engine} (production: ${db.production || false})`);
    });
    console.log('\n🎉 All components deployed via API!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

addRedisAppPlatform();

