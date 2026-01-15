/**
 * Create shared databases for all AI employees
 * This reduces costs from $30/month per AI to $30/month total
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

async function createSharedPostgreSQL() {
  try {
    console.log('🔍 Checking for existing shared PostgreSQL database...');
    
    // Check if database already exists
    const dbsResponse = await axios.get(
      `${DO_API_BASE}/databases`,
      {
        headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
      }
    );
    
    const existingDb = dbsResponse.data.databases.find(
      db => db.name === 'ai-employees-db' || db.name.includes('ai-employees')
    );
    
    if (existingDb) {
      console.log(`✅ Shared PostgreSQL already exists: ${existingDb.name}`);
      console.log(`   ID: ${existingDb.id}`);
      console.log(`   Status: ${existingDb.status}`);
      return existingDb;
    }
    
    console.log('📦 Creating shared PostgreSQL database...');
    
    const response = await axios.post(
      `${DO_API_BASE}/databases`,
      {
        name: 'ai-employees-db',
        engine: 'pg',
        version: '15',
        size: 'db-s-1vcpu-1gb',
        region: 'nyc1',
        num_nodes: 1,
        tags: ['ai-employees', 'shared']
      },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const db = response.data.database;
    console.log('✅ Shared PostgreSQL database created!');
    console.log(`   ID: ${db.id}`);
    console.log(`   Name: ${db.name}`);
    console.log(`   Status: ${db.status}`);
    console.log(`   Cost: $15/month`);
    console.log('\n⏳ Waiting for database to be ready (this may take 5-10 minutes)...');
    
    // Wait for database to be ready
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const statusResponse = await axios.get(
        `${DO_API_BASE}/databases/${db.id}`,
        {
          headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
        }
      );
      
      const status = statusResponse.data.database.status;
      if (status === 'online') {
        console.log('✅ Database is online and ready!');
        return statusResponse.data.database;
      }
      
      attempts++;
      if (attempts % 6 === 0) {
        console.log(`   Still waiting... (${attempts * 10}s)`);
      }
    }
    
    throw new Error('Database creation timeout');
    
  } catch (error) {
    if (error.response?.status === 422 && error.response?.data?.message?.includes('already exists')) {
      console.log('⚠️  Database with similar name already exists');
      // Try to find it
      const dbsResponse = await axios.get(
        `${DO_API_BASE}/databases`,
        {
          headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
        }
      );
      const existing = dbsResponse.data.databases.find(db => db.name.includes('ai'));
      if (existing) {
        console.log(`   Found: ${existing.name} (ID: ${existing.id})`);
        return existing;
      }
    }
    console.error('❌ Error creating PostgreSQL:', error.response?.data || error.message);
    throw error;
  }
}

async function createSharedRedis() {
  try {
    console.log('\n🔍 Checking for existing shared Redis database...');
    
    // Check if Redis already exists
    const dbsResponse = await axios.get(
      `${DO_API_BASE}/databases`,
      {
        headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
      }
    );
    
    const existingRedis = dbsResponse.data.databases.find(
      db => (db.name === 'ai-employees-redis' || db.name.includes('ai-employees-redis')) && 
            (db.engine === 'redis' || db.engine === 'valkey')
    );
    
    if (existingRedis) {
      console.log(`✅ Shared Redis already exists: ${existingRedis.name}`);
      console.log(`   ID: ${existingRedis.id}`);
      console.log(`   Status: ${existingRedis.status}`);
      return existingRedis;
    }
    
    console.log('📦 Creating shared Redis/Valkey database...');
    
    // Use Valkey (Redis-compatible) as it's more reliable via API
    const response = await axios.post(
      `${DO_API_BASE}/databases`,
      {
        name: 'ai-employees-redis',
        engine: 'valkey',
        version: '8',
        size: 'db-s-1vcpu-1gb',
        region: 'nyc1',
        num_nodes: 1,
        tags: ['ai-employees', 'shared', 'redis']
      },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const redis = response.data.database;
    console.log('✅ Shared Redis database created!');
    console.log(`   ID: ${redis.id}`);
    console.log(`   Name: ${redis.name}`);
    console.log(`   Status: ${redis.status}`);
    console.log(`   Cost: $15/month`);
    console.log('\n⏳ Waiting for Redis to be ready (this may take 5-10 minutes)...');
    
    // Wait for Redis to be ready
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const statusResponse = await axios.get(
        `${DO_API_BASE}/databases/${redis.id}`,
        {
          headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
        }
      );
      
      const status = statusResponse.data.database.status;
      if (status === 'online') {
        console.log('✅ Redis is online and ready!');
        return statusResponse.data.database;
      }
      
      attempts++;
      if (attempts % 6 === 0) {
        console.log(`   Still waiting... (${attempts * 10}s)`);
      }
    }
    
    throw new Error('Redis creation timeout');
    
  } catch (error) {
    if (error.response?.status === 422) {
      console.log('⚠️  Database creation failed (may already exist or invalid parameters)');
      console.log('   Error:', error.response.data.message);
      // Try to find existing Redis
      const dbsResponse = await axios.get(
        `${DO_API_BASE}/databases`,
        {
          headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
        }
      );
      const existing = dbsResponse.data.databases.find(
        db => (db.engine === 'redis' || db.engine === 'valkey') && db.name.includes('ai')
      );
      if (existing) {
        console.log(`   Found: ${existing.name} (ID: ${existing.id})`);
        return existing;
      }
    }
    console.error('❌ Error creating Redis:', error.response?.data || error.message);
    throw error;
  }
}

async function getConnectionUrls(db) {
  try {
    const response = await axios.get(
      `${DO_API_BASE}/databases/${db.id}/connection_pooling`,
      {
        headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
      }
    );
    
    return {
      connectionString: response.data.connection_pooling?.connection_uri || db.connection.uri,
      host: db.connection.host,
      port: db.connection.port,
      database: db.connection.database,
      user: db.connection.user,
      password: db.connection.password,
      ssl: db.connection.ssl
    };
  } catch (error) {
    // Fallback to basic connection info
    return {
      connectionString: db.connection?.uri || 'Check DigitalOcean dashboard',
      host: db.connection?.host || 'N/A',
      port: db.connection?.port || 'N/A',
      database: db.connection?.database || 'N/A',
      user: db.connection?.user || 'N/A',
      password: db.connection?.password ? '***' : 'N/A',
      ssl: db.connection?.ssl || false
    };
  }
}

async function main() {
  try {
    console.log('🚀 Creating Shared Databases for AI Employees\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('This will create shared PostgreSQL and Redis databases');
    console.log('that all AI employees can use, reducing costs from $30/month');
    console.log('per AI to $30/month total.\n');
    
    // Create PostgreSQL
    const postgres = await createSharedPostgreSQL();
    const pgConn = await getConnectionUrls(postgres);
    
    // Create Redis
    const redis = await createSharedRedis();
    const redisConn = await getConnectionUrls(redis);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SHARED DATABASES CREATED!\n');
    
    console.log('📊 PostgreSQL Connection:');
    console.log(`   DATABASE_URL=${pgConn.connectionString}`);
    console.log(`   Host: ${pgConn.host}:${pgConn.port}`);
    console.log(`   Database: ${pgConn.database}`);
    console.log(`   User: ${pgConn.user}`);
    
    console.log('\n📊 Redis Connection:');
    console.log(`   REDIS_URL=${redisConn.connectionString}`);
    console.log(`   Host: ${redisConn.host}:${redisConn.port}`);
    
    console.log('\n💰 Cost:');
    console.log('   PostgreSQL: $15/month');
    console.log('   Redis: $15/month');
    console.log('   Total: $30/month (shared by all AI employees)');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Update Jeff to use these shared databases');
    console.log('   2. Add AI_EMPLOYEE_NAME=jeff to Jeff\'s environment variables');
    console.log('   3. Run database migrations with ai_employee field');
    console.log('   4. Test Jeff with shared databases');
    console.log('   5. Deploy new AI employees using same databases');
    
    console.log('\n💡 Save these connection strings - you\'ll need them!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createSharedPostgreSQL, createSharedRedis };

