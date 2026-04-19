/**
 * EduSafa Learning - Database Migration Script
 * 
 * هذا السكربت يقوم بترحيل البيانات من الهيكل القديم إلى الهيكل الجديد
 * 
 * ⚠️ تحذيرات هامة:
 * 1. قم بأخذ نسخة احتياطية كاملة قبل التشغيل
 * 2. تأكد من أن جميع المستخدمين قد سجلوا الخروج
 * 3. قم بتشغيل هذا السكربت في وضع الصيانة
 * 4. اختبر جيداً قبل النشر النهائي
 * 
 * طريقة الاستخدام:
 * ```bash
 * npm install -g firebase-tools
 * firebase login
 * node scripts/migrate-database.js
 * ```
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update, remove, DataSnapshot } from 'firebase/database';

// ============================================================================
// 🔧 CONFIGURATION - الإعدادات
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB3N5wtDfzBVcU5qxt7divPM7ObL56btI0",
  authDomain: "all-project-123.firebaseapp.com",
  databaseURL: "https://all-project-123-default-rtdb.firebaseio.com",
  projectId: "all-project-123",
  storageBucket: "all-project-123.firebasestorage.app",
  messagingSenderId: "1008602333230",
  appId: "1:1008602333230:web:72ce4bbe16ca96d5661fbf",
  measurementId: "G-CL0SSVRJ9L"
};

// ============================================================================
// 📊 MIGRATION MAPS - خرائط الترحيل
// ============================================================================

const MIGRATION_MAP = [
  // SYS (System Core)
  {
    old: 'EduSafa_Learning/database/users',
    new: 'sys/users',
    description: 'بيانات المستخدمين'
  },
  {
    old: 'EduSafa_Learning/database/settings',
    new: 'sys/system/settings',
    description: 'إعدادات المنصة'
  },
  {
    old: 'EduSafa_Learning/database/slider',
    new: 'sys/system/slider',
    description: 'عناصر السلايدر'
  },
  {
    old: 'EduSafa_Learning/database/banks',
    new: 'sys/system/banks',
    description: 'الحسابات البنكية'
  },
  {
    old: 'EduSafa_Learning/database/meta_data',
    new: 'sys/system/meta_data',
    description: 'البيانات الوصفية'
  },
  {
    old: 'EduSafa_Learning/database/activities',
    new: 'sys/maintenance/activities',
    description: 'سجل النشاطات'
  },
  {
    old: 'EduSafa_Learning/database/cashipay_logs',
    new: 'sys/maintenance/cashipay_logs',
    description: 'سجلات Cashipay'
  },
  {
    old: 'EduSafa_Learning/database/support_tickets',
    new: 'sys/maintenance/support_tickets',
    description: 'تذاكر الدعم'
  },
  {
    old: 'EduSafa_Learning/database/teacher_class_requests',
    new: 'sys/config/teacher_class_requests',
    description: 'طلبات انضمام المعلمين'
  },
  {
    old: 'EduSafa_Learning/database/announcements',
    new: 'sys/announcements',
    description: 'التعميمات العامة'
  },
  {
    old: 'EduSafa_Learning/database/payments',
    new: 'sys/financial/payments',
    description: 'المدفوعات'
  },
  
  // EDU (Education)
  {
    old: 'EduSafa_Learning/database/classes',
    new: 'edu/sch/classes',
    description: 'الفصول الدراسية'
  },
  {
    old: 'EduSafa_Learning/database/global_subjects',
    new: 'edu/courses',
    description: 'المواد الدراسية'
  },
  {
    old: 'EduSafa_Learning/database/assignments',
    new: 'edu/assignments',
    description: 'الواجبات'
  },
  {
    old: 'EduSafa_Learning/database/submissions',
    new: 'edu/submissions',
    description: 'تسليمات الطلاب'
  },
  {
    old: 'EduSafa_Learning/database/grades',
    new: 'edu/grades',
    description: 'الدرجات'
  },
  {
    old: 'EduSafa_Learning/database/attendance',
    new: 'edu/attendance',
    description: 'الحضور'
  },
  {
    old: 'EduSafa_Learning/database/timetable',
    new: 'edu/timetable',
    description: 'الجداول الزمنية'
  },
  {
    old: 'EduSafa_Learning/database/timetable_settings',
    new: 'edu/timetable_settings',
    description: 'إعدادات الجداول'
  },
  {
    old: 'EduSafa_Learning/database/academic_settings',
    new: 'edu/academic_settings',
    description: 'الإعدادات الأكاديمية'
  },
  {
    old: 'EduSafa_Learning/database/curricula',
    new: 'edu/curricula',
    description: 'المقررات الدراسية'
  },
  {
    old: 'EduSafa_Learning/database/live_links',
    new: 'edu/live_links',
    description: 'روابط البث المباشر'
  },
  {
    old: 'EduSafa_Learning/database/announcements_subject',
    new: 'edu/announcements_subject',
    description: 'تعميمات المواد'
  },
  
  // COMM (Communication)
  {
    old: 'EduSafa_Learning/database/chats',
    new: 'comm/chats',
    description: 'المحادثات'
  },
  {
    old: 'EduSafa_Learning/database/messages',
    new: 'comm/messages',
    description: 'الرسائل'
  },
  {
    old: 'EduSafa_Learning/database/notifications',
    new: 'comm/notifications',
    description: 'الإشعارات'
  },
];

// ============================================================================
// 🚀 MIGRATION FUNCTIONS - دوال الترحيل
// ============================================================================

/**
 * ترحيل بيانات من مسار قديم إلى مسار جديد
 */
async function migrateData(
  db: any,
  oldPath: string,
  newPath: string,
  description: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`\n📦 Migrating: ${description}`);
    console.log(`   From: ${oldPath}`);
    console.log(`   To:   ${newPath}`);
    
    const oldRef = ref(db, oldPath);
    const snapshot = await get(oldRef);
    
    if (!snapshot.exists()) {
      console.log(`   ⚠️  No data found at ${oldPath}`);
      return { success: true, message: 'No data to migrate' };
    }
    
    const data = snapshot.val();
    const newDataRef = ref(db, newPath);
    
    await set(newDataRef, data);
    console.log(`   ✅ Successfully migrated to ${newPath}`);
    
    return { success: true, message: 'Migrated successfully' };
  } catch (error: any) {
    console.error(`   ❌ Error migrating ${oldPath}:`, error.message);
    return { success: false, message: error.message };
  }
}

/**
 * التحقق من نجاح الترحيل
 */
async function verifyMigration(
  db: any,
  oldPath: string,
  newPath: string
): Promise<boolean> {
  try {
    const oldRef = ref(db, oldPath);
    const newRef = ref(db, newPath);
    
    const [oldSnapshot, newSnapshot] = await Promise.all([
      get(oldRef),
      get(newRef)
    ]);
    
    const oldExists = oldSnapshot.exists();
    const newExists = newSnapshot.exists();
    
    if (oldExists && !newExists) {
      console.error(`   ❌ Verification failed: Data not migrated`);
      return false;
    }
    
    if (!oldExists && !newExists) {
      console.log(`   ℹ️  No data in old or new path`);
      return true;
    }
    
    if (newExists) {
      console.log(`   ✅ Verification passed: Data exists in new location`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error(`   ❌ Verification error:`, error.message);
    return false;
  }
}

/**
 * تنظيف المسارات القديمة (اختياري - بعد التأكد من نجاح الترحيل)
 */
async function cleanupOldPaths(db: any, paths: string[]): Promise<void> {
  console.log('\n🧹 Cleaning up old paths...');
  
  for (const path of paths) {
    try {
      const refToDelete = ref(db, path);
      await remove(refToDelete);
      console.log(`   ✅ Removed: ${path}`);
    } catch (error: any) {
      console.error(`   ❌ Error removing ${path}:`, error.message);
    }
  }
}

// ============================================================================
// 📝 MAIN MIGRATION SCRIPT - السكربت الرئيسي
// ============================================================================

async function runMigration() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   EduSafa Learning - Database Migration Script          ║');
  console.log('║   إعادة هيكلة قاعدة البيانات                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  // Initialize Firebase
  console.log('🔧 Initializing Firebase...');
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getDatabase(app);
  console.log('✅ Firebase initialized\n');
  
  const results = {
    total: MIGRATION_MAP.length,
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  // Phase 1: Migrate all data
  console.log('📦 Phase 1: Data Migration');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  for (const mapping of MIGRATION_MAP) {
    const result = await migrateData(
      db,
      mapping.old,
      mapping.new,
      mapping.description
    );
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }
  }
  
  // Phase 2: Verify all migrations
  console.log('\n\n🔍 Phase 2: Verification');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let verificationFailed = false;
  for (const mapping of MIGRATION_MAP) {
    const verified = await verifyMigration(db, mapping.old, mapping.new);
    if (!verified) {
      verificationFailed = true;
      console.error(`   ⚠️  Verification failed for: ${mapping.old}`);
    }
  }
  
  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              MIGRATION SUMMARY                             ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║   Total Paths:    ${results.total.toString().padEnd(35)} ║`);
  console.log(`║   Successful:     ${results.success.toString().padEnd(35)} ║`);
  console.log(`║   Failed:         ${results.failed.toString().padEnd(35)} ║`);
  console.log(`║   Skipped:        ${results.skipped.toString().padEnd(35)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  if (verificationFailed) {
    console.log('⚠️  WARNING: Some verifications failed!');
    console.log('   Do NOT run cleanup until all verifications pass.\n');
  } else {
    console.log('✅ All migrations verified successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Update all code references to use new paths');
    console.log('   2. Test all features thoroughly');
    console.log('   3. Run cleanup script to remove old paths');
    console.log('   4. Deploy updated code\n');
  }
  
  // Optional: Cleanup old paths (uncomment to enable)
  // if (!verificationFailed && confirm('Do you want to remove old paths?')) {
  //   const oldPaths = MIGRATION_MAP.map(m => m.old);
  //   await cleanupOldPaths(db, oldPaths);
  // }
}

// ============================================================================
// 🏃 RUN MIGRATION - تشغيل الترحيل
// ============================================================================

runMigration()
  .then(() => {
    console.log('\n✅ Migration script completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
