const mongoose = require('mongoose');

// Import the updated User model
const User = require('./models/User');

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/expense_tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateFinancialData() {
  try {
    console.log('🔄 Starting financial data migration...');
    
    // Get the database connection
    const db = mongoose.connection;
    
    // Check if the old FinancialData collection exists
    const collections = await db.db.listCollections().toArray();
    const financialDataCollection = collections.find(col => col.name === 'financialdatas');
    
    if (!financialDataCollection) {
      console.log('ℹ️  No old FinancialData collection found. Migration not needed.');
      return;
    }
    
    // Get all financial data records from the old collection
    const financialDataRecords = await db.db.collection('financialdatas').find({}).toArray();
    console.log(`📊 Found ${financialDataRecords.length} financial data records to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const record of financialDataRecords) {
      try {
        // Find the corresponding user
        const user = await User.findById(record.userId);
        
        if (!user) {
          console.log(`⚠️  User not found for financial data record: ${record.userId}`);
          skippedCount++;
          continue;
        }
        
        // Migrate the financial data to the embedded structure
        user.financialData = {
          totalExpense: record.totalExpense || 0,
          totalEMI: record.totalEMI || 0,
          totalDebt: record.totalDebt || 0,
          totalSavings: record.totalSavings || 0,
          monthlyIncome: record.monthlyIncome || user.salary || 0,
          expenseBreakdown: record.expenseBreakdown || {
            rent: 0,
            food: 0,
            transport: 0,
            utilities: 0,
            others: 0
          },
          savingsHistory: record.savingsHistory || [],
          incomeExpenseHistory: record.incomeExpenseHistory || [],
          lastUpdated: record.lastUpdated || new Date()
        };
        
        await user.save();
        migratedCount++;
        console.log(`✅ Migrated financial data for user: ${user.email}`);
        
      } catch (error) {
        console.error(`❌ Error migrating financial data for record ${record._id}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migratedCount} records`);
    console.log(`⚠️  Skipped: ${skippedCount} records`);
    
    if (migratedCount > 0) {
      console.log('\n💡 To clean up, you can manually drop the old collection:');
      console.log('   db.financialdatas.drop()');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
migrateFinancialData(); 