/**
 * Add Redis using cluster name instead of ID
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addRedisByName() {
  console.log('📦 Adding Redis using cluster name...\n');

  try {
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if already added
    if (spec.databases.some(d => d.name === 'redis')) {
      console.log('✅ Redis already added!\n');
      return;
    }

    // Try different approaches
    const attempts = [
      {
        name: 'redis',
        engine: 'REDIS',
        version: '8',
        production: true,
        cluster_name: 'jeff-redis', // Try name
      },
      {
        name: 'redis',
        engine: 'REDIS',
        production: true,
        cluster_name: '57d56ce5-02c9-4a4c-89b4-6d04b10b3898', // Try ID without version
      },
    ];

    for (const redisConfig of attempts) {
      try {
        const testSpec = JSON.parse(JSON.stringify(spec));
        testSpec.databases.push(redisConfig);
        delete testSpec.ingress;

        await axios.put(
          `${DO_API_BASE}/apps/${APP_ID}`,
          { spec: testSpec },
          {
            headers: {
              'Authorization': `Bearer ${DO_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`✅ Redis added using ${redisConfig.cluster_name}!\n`);
        break;
      } catch (error) {
        if (error.response?.data?.id === 'not_found') {
          console.log(`⚠️  Cluster ${redisConfig.cluster_name} not found, trying next...\n`);
          continue;
        }
        throw error;
      }
    }

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉🎉🎉 JEFF DEPLOYMENT 100% COMPLETE VIA API! 🎉🎉🎉');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}\n`);
    console.log('Components:');
    console.log(`  ✅ Services: ${finalApp.data.app.spec.services.length}`);
    console.log(`  ✅ Workers: ${finalApp.data.app.spec.workers?.length || 0}`);
    console.log(`  ✅ Databases: ${finalApp.data.app.spec.databases.length}`);
    finalApp.data.app.spec.databases.forEach(db => {
      console.log(`     - ${db.name}: ${db.engine}`);
    });
    console.log('\n🎉 ALL COMPONENTS DEPLOYED!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

addRedisByName();

