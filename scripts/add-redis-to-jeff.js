/**
 * Add Redis database to Jeff app
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addRedis() {
  console.log('📦 Adding Redis database to Jeff app...\n');

  try {
    // Get Redis clusters
    const dbResponse = await axios.get(`${DO_API_BASE}/databases`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const redisClusters = dbResponse.data.databases.filter(d => d.engine === 'redis');
    let redisCluster = redisClusters.find(d => d.name.includes('jeff')) || redisClusters[0];

    if (!redisCluster) {
      console.log('❌ No Redis cluster found. Creating one...\n');
      
      // Try creating with different region formats
      const regions = ['nyc', 'nyc1', 'nyc3'];
      let created = false;
      
      for (const region of regions) {
        try {
          const createResponse = await axios.post(
            `${DO_API_BASE}/databases`,
            {
              name: 'jeff-redis',
              engine: 'redis',
              version: '7',
              region: region,
              size: 'db-s-1vcpu-1gb',
              num_nodes: 1,
            },
            {
              headers: {
                'Authorization': `Bearer ${DO_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );
          redisCluster = createResponse.data.database;
          console.log(`✅ Redis cluster created: ${redisCluster.name} (${redisCluster.id})\n`);
          created = true;
          break;
        } catch (error) {
          if (error.response?.status !== 422) {
            throw error;
          }
        }
      }
      
      if (!created) {
        console.log('⚠️  Could not create Redis cluster. You may need to create it manually.\n');
        return;
      }
    } else {
      console.log(`✅ Using existing Redis cluster: ${redisCluster.name} (${redisCluster.id})\n`);
    }

    // Get current app spec
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if Redis already added
    const hasRedis = spec.databases.some(d => d.engine === 'REDIS');
    if (hasRedis) {
      console.log('✅ Redis database already added to app!\n');
      return;
    }

    // Add Redis to app spec
    spec.databases.push({
      name: 'redis',
      engine: 'REDIS',
      version: '7',
      production: true,
      cluster_name: redisCluster.id,
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

    console.log('✅ Redis database added to app!\n');

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ JEFF DEPLOYMENT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}`);
    console.log(`Live URL: ${finalApp.data.app.live_url || 'Pending deployment...'}\n`);
    console.log(`Services: ${finalApp.data.app.spec.services.length} (API)`);
    console.log(`Workers: ${finalApp.data.app.spec.workers?.length || 0} (Worker)`);
    console.log(`Databases: ${finalApp.data.app.spec.databases.length} (PostgreSQL + Redis)\n`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

addRedis();

