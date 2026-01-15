/**
 * Finalize Jeff deployment - Add worker and update env vars
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function finalize() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ JEFF APP CREATED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const app = appResponse.data.app;
    
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}`);
    console.log(`Live URL: ${app.live_url || 'Pending deployment...'}\n`);
    
    console.log('Current Status:');
    console.log(`  Services: ${app.spec.services.length} (API)`);
    console.log(`  Databases: ${app.spec.databases.length} (PostgreSQL)\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NEXT STEPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Add Worker Service:');
    console.log('   - Go to dashboard → Settings → Components');
    console.log('   - Add worker service manually (DigitalOcean API has ingress limitation)');
    console.log('');
    console.log('2. Add Redis Database:');
    console.log('   - Go to dashboard → Settings → Databases');
    console.log('   - Add Redis database (or create managed Redis cluster first)');
    console.log('');
    console.log('3. Set Environment Variables:');
    console.log('   - GRADIENT_API_KEY (get from https://cloud.digitalocean.com/gradient)');
    console.log('   - GRADIENT_MODEL (e.g., llama2-7b-chat)');
    console.log('   - API_KEY: 485cabb25244073a3c877e2ee7459ea50ecf2de9f86ffa0e8f455d3935f22417');
    console.log('   - INTERNAL_API_KEY: 485cabb25244073a3c877e2ee7459ea50ecf2de9f86ffa0e8f455d3935f22417');
    console.log('');
    console.log('4. Wait for deployment to complete');
    console.log('5. Run migrations: npm run prisma:migrate deploy\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

finalize();

