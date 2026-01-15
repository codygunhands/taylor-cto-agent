/**
 * Migrate Jeff to use shared databases
 * Adds ai_employee field to all tables and updates queries
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToSharedDatabase() {
  try {
    console.log('🔄 Migrating to shared database architecture...\n');
    
    // Step 1: Add ai_employee field to existing records
    console.log('1. Adding ai_employee field to existing records...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "aiEmployee" VARCHAR(50) DEFAULT 'jeff';
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "aiEmployee" VARCHAR(50) DEFAULT 'jeff';
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "aiEmployee" VARCHAR(50) DEFAULT 'jeff';
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "aiEmployee" VARCHAR(50) DEFAULT 'jeff';
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "aiEmployee" VARCHAR(50) DEFAULT 'jeff';
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "aiEmployee" VARCHAR(50) DEFAULT 'jeff';
    `;
    
    console.log('   ✅ Added ai_employee fields\n');
    
    // Step 2: Create indexes for performance
    console.log('2. Creating indexes...');
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_session_ai_employee" ON "Session"("aiEmployee");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_message_ai_employee" ON "Message"("aiEmployee");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_lead_ai_employee" ON "Lead"("aiEmployee");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_ticket_ai_employee" ON "Ticket"("aiEmployee");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_auditlog_ai_employee" ON "AuditLog"("aiEmployee");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_draft_ai_employee" ON "Draft"("aiEmployee");
    `;
    
    console.log('   ✅ Created indexes\n');
    
    // Step 3: Verify migration
    console.log('3. Verifying migration...');
    
    const sessionCount = await prisma.session.count({
      where: { aiEmployee: 'jeff' }
    });
    
    console.log(`   ✅ Found ${sessionCount} sessions for Jeff`);
    console.log('\n✅ Migration complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Update Prisma schema to include aiEmployee field');
    console.log('   2. Update code to filter by aiEmployee');
    console.log('   3. Set AI_EMPLOYEE_NAME=jeff environment variable');
    console.log('   4. Test thoroughly');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateToSharedDatabase().catch(console.error);
}

module.exports = { migrateToSharedDatabase };

