/**
 * Add databases to Jeff app first
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addDatabases() {
  console.log('📦 Adding databases to Jeff app...\n');

  try {
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec = appResponse.data.app.spec;
    
    // Remove ingress - let DO manage it
    delete spec.ingress;

    // Add only PostgreSQL first
    spec.databases = [
      {
        name: 'db',
        engine: 'PG',
        version: '15',
        production: false,
      },
    ];

    // Update
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

    console.log('✅ PostgreSQL database added!\n');
    
    // Now add Redis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const appResponse2 = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec2 = appResponse2.data.app.spec;
    delete spec2.ingress;
    
    spec2.databases.push({
      name: 'redis',
      engine: 'REDIS',
      version: '7',
      production: true,
      cluster_name: 'jeff-redis-cluster',
    });

    await axios.put(
      `${DO_API_BASE}/apps/${APP_ID}`,
      { spec: spec2 },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Redis database added!\n');
    console.log(`App: https://cloud.digitalocean.com/apps/${APP_ID}\n`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

addDatabases();

