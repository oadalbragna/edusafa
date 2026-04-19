/**
 * EduSafa Learning - Password Migration Script
 * 
 * Migrates all plain-text passwords to hashed passwords
 * Run this script ONCE before deploying to production
 * 
 * Usage: npx ts-node scripts/migrate-passwords.ts
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update, DataSnapshot } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAiNEWKhQQsJsWjrmTziiwA83pmKz_jBV4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "mas-tech-123.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://mas-tech-123-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "mas-tech-123",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "mas-tech-123.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "882849023773",
  appId: process.env.FIREBASE_APP_ID || "1:882849023773:web:27ff72c0edb053959103f4",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-DK9N23NS33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Hash password using SHA-256
 * Note: For production, use bcrypt on a server
 */
async function hashPassword(password: string): Promise<string> {
  // For Node.js environment, we'll use crypto module
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Check if password is already hashed (64 char hex string)
 */
function isHashed(password: string): boolean {
  return password.length === 64 && /^[a-f0-9]+$/i.test(password);
}

/**
 * Migrate all plain-text passwords to hashed passwords
 */
async function migratePasswords(): Promise<void> {
  console.log('🔐 Starting password migration...\n');
  
  try {
    // Fetch all users
    const usersRef = ref(db, 'sys/users');
    const snapshot: DataSnapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log('❌ No users found in database');
      return;
    }
    
    const users = snapshot.val();
    const updates: Record<string, any> = {};
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log(`📊 Found ${Object.keys(users).length} users\n`);
    
    // Process each user
    for (const [uid, user] of Object.entries(users)) {
      try {
        // Skip if no password or already hashed
        if (!user.password) {
          console.log(`⚠️  User ${uid}: No password found, skipping`);
          skippedCount++;
          continue;
        }
        
        if (isHashed(user.password)) {
          console.log(`✅ User ${uid}: Password already hashed, skipping`);
          skippedCount++;
          continue;
        }
        
        // Hash the password
        const hashedPassword = await hashPassword(user.password);
        
        // Prepare update
        updates[`sys/users/${uid}/password`] = hashedPassword;
        updates[`sys/users/${uid}/passwordMigrated`] = true;
        updates[`sys/users/${uid}/migratedAt`] = new Date().toISOString();
        
        migratedCount++;
        console.log(`🔐 User ${uid}: Password will be migrated`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ User ${uid}: Error processing -`, error);
      }
    }
    
    // Apply all updates
    if (Object.keys(updates).length > 0) {
      console.log(`\n📝 Applying ${Object.keys(updates).length / 3} updates...\n`);
      await update(ref(db), updates);
      
      console.log('\n✅ Migration completed successfully!\n');
      console.log('📊 Migration Summary:');
      console.log(`   • Migrated: ${migratedCount} users`);
      console.log(`   • Skipped: ${skippedCount} users`);
      console.log(`   • Errors: ${errorCount} users`);
      console.log(`   • Total: ${Object.keys(users).length} users\n`);
      
      console.log('⚠️  IMPORTANT: Please verify the migration was successful before deploying!\n');
      console.log('📝 Next steps:');
      console.log('   1. Test login with a few user accounts');
      console.log('   2. Verify passwords are hashed in Firebase Console');
      console.log('   3. Deploy security rules: firebase deploy --only database:rules');
      console.log('   4. Remove or disable this migration script\n');
      
    } else {
      console.log('\nℹ️  No passwords needed migration. All passwords are already hashed or missing.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePasswords()
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
