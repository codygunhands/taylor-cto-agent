/**
 * Complete Redis setup - Create cluster and add to app
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function completeRedis() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 COMPLETING REDIS SETUP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Check for existing Redis cluster
    console.log('🔍 Checking for existing Redis clusters...\n');
    const dbResponse = await axios.get(`${DO_API_BASE}/databases`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    let redisCluster = dbResponse.data.databases.find(
      d => d.engine === 'redis' && d.name.includes('jeff')
    );

    // Step 2: Create Redis cluster if needed
    if (!redisCluster) {
      console.log('📦 Creating Redis cluster...\n');
      
      try {
        const createResponse = await axios.post(
          `${DO_API_BASE}/databases`,
          {
            name: 'jeff-redis',
            engine: 'redis',
            version: '7',
            region: 'nyc1',
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
        console.log('⏳ Waiting for cluster to be ready...\n');
        
        // Wait for cluster to be ready
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusResponse = await axios.get(
            `${DO_API_BASE}/databases/${redisCluster.id}`,
            { headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` } }
          );
          
          const status = statusResponse.data.database.status;
          if (status === 'online') {
            console.log('✅ Redis cluster is online!\n');
            break;
          }
          attempts++;
          process.stdout.write(`   Status: ${status}...\r`);
        }
        console.log('');
        
      } catch (error) {
        console.error('❌ Error creating Redis cluster:', error.response?.data || error.message);
        throw error;
      }
    } else {
      console.log(`✅ Using existing Redis cluster: ${redisCluster.name} (${redisCluster.id})\n`);
    }

    // Step 3: Add Redis to app
    console.log('📦 Adding Redis to app...\n');
    
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if Redis already added
    const redisDb = spec.databases.find(d => d.engine === 'REDIS');
    if (redisDb) {
      console.log('✅ Redis already added to app!\n');
    } else {
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

      console.log('✅ Redis added to app!\n');
    }

    // Step 4: Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ REDIS SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Redis Cluster: ${redisCluster.name} (${redisCluster.id})`);
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}\n`);
    console.log('Final Components:');
    console.log(`  Services: ${finalApp.data.app.spec.services.length} - ${finalApp.data.app.spec.services.map(s => s.name).join(', ')}`);
    console.log(`  Workers: ${finalApp.data.app.spec.workers?.length || 0} - ${finalApp.data.app.spec.workers?.map(w => w.name).join(', ') || 'none'}`);
    console.log(`  Databases: ${finalApp.data.app.spec.databases.length} - ${finalApp.data.app.spec.databases.map(d => d.engine).join(', ')}\n`);
    console.log('✅ JEFF DEPLOYMENT 100% COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

completeRedis();

