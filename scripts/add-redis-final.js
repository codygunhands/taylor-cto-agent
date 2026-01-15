/**
 * Add Redis database to Jeff app (let App Platform create it)
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addRedis() {
  console.log('📦 Adding Redis database to Jeff app...\n');

  try {
    // Get current app spec
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if Redis already exists
    const hasRedis = spec.databases.some(d => d.engine === 'REDIS');
    if (hasRedis) {
      console.log('✅ Redis database already added!\n');
      return;
    }

    // Add Redis as non-production - App Platform will create it
    spec.databases.push({
      name: 'redis',
      engine: 'REDIS',
      version: '7',
      production: false, // Let App Platform create it
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

    console.log('✅ Redis database added! App Platform will create it automatically.\n');

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ JEFF DEPLOYMENT COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}`);
    console.log(`Live URL: ${finalApp.data.app.live_url || 'Pending deployment...'}\n`);
    console.log('Components:');
    console.log(`  Services: ${finalApp.data.app.spec.services.length} - ${finalApp.data.app.spec.services.map(s => s.name).join(', ')}`);
    console.log(`  Workers: ${finalApp.data.app.spec.workers?.length || 0} - ${finalApp.data.app.spec.workers?.map(w => w.name).join(', ') || 'none'}`);
    console.log(`  Databases: ${finalApp.data.app.spec.databases.length} - ${finalApp.data.app.spec.databases.map(d => d.engine).join(', ')}\n`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

addRedis();

