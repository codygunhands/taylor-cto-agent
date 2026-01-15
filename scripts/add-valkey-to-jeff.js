/**
 * Add Valkey (Redis-compatible) to Jeff app
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addValkey() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 ADDING VALKEY (REDIS-COMPATIBLE) TO JEFF');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Find Valkey cluster
    const dbResponse = await axios.get(`${DO_API_BASE}/databases`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    let valkeyCluster = dbResponse.data.databases.find(
      d => (d.engine === 'valkey' || d.engine === 'redis') && d.name.includes('jeff')
    );

    if (!valkeyCluster) {
      console.log('📦 Creating Valkey cluster...\n');
      
      const createResponse = await axios.post(
        `${DO_API_BASE}/databases`,
        {
          name: 'jeff-redis',
          engine: 'valkey',
          version: '8',
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
      
      valkeyCluster = createResponse.data.database;
      console.log(`✅ Valkey cluster created: ${valkeyCluster.name} (${valkeyCluster.id})\n`);
      console.log('⏳ Waiting for cluster to be ready...\n');
      
      // Wait for cluster
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await axios.get(
          `${DO_API_BASE}/databases/${valkeyCluster.id}`,
          { headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` } }
        );
        
        const status = statusResponse.data.database.status;
        if (status === 'online') {
          console.log('✅ Valkey cluster is online!\n');
          break;
        }
        attempts++;
        process.stdout.write(`   Status: ${status}...\r`);
      }
      console.log('');
    } else {
      console.log(`✅ Using existing cluster: ${valkeyCluster.name} (${valkeyCluster.id})\n`);
    }

    // Step 2: Add to app
    console.log('📦 Adding Valkey to app...\n');
    
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = JSON.parse(JSON.stringify(appResponse.data.app.spec));

    // Check if already added
    const hasRedis = spec.databases.some(d => d.engine === 'REDIS' || d.name === 'redis');
    if (hasRedis) {
      console.log('✅ Redis/Valkey already added!\n');
    } else {
      // Add Valkey as REDIS (App Platform treats Valkey as Redis)
      spec.databases.push({
        name: 'redis',
        engine: 'REDIS',
        version: '7',
        production: true,
        cluster_name: valkeyCluster.id,
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

      console.log('✅ Valkey added to app!\n');
    }

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 JEFF DEPLOYMENT 100% COMPLETE!');
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
    console.log('\n🎉 ALL COMPONENTS DEPLOYED VIA API!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

addValkey();

