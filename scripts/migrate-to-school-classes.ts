/**
 * Migration Script: School Class System Structure Update
 * 
 * Migrates data from flat edu/sch/classes/{classId} to hierarchical edu/sch/classes/{level}/{grade}
 */

import { ref, get, set, update, serverTimestamp } from 'firebase/database';
import { db } from '../services/firebase';

interface MigrationStats {
  classesMigrated: number;
  errors: string[];
}

export async function runMigration(): Promise<MigrationStats> {
  console.log('🚀 Starting migration: edu/sch/classes/{id} → edu/sch/classes/{level}/{grade}');
  
  const stats: MigrationStats = {
    classesMigrated: 0,
    errors: []
  };
  
  try {
    const classesRef = ref(db, 'edu/sch/classes');
    const snapshot = await get(classesRef);
    
    if (!snapshot.exists()) {
      console.log('No classes found to migrate.');
      return stats;
    }
    
    const classes = snapshot.val();
    
    for (const [classId, classData] of Object.entries(classes)) {
      const cls: any = classData;
      if (!cls.level || !cls.grade) {
        stats.errors.push(`Class ${classId} missing level or grade, skipping.`);
        continue;
      }
      
      const newPath = `edu/sch/classes/${cls.level}/${cls.grade}`;
      const newClassData = {
        ...cls,
        id: cls.grade, // grade as the key
        migratedAt: serverTimestamp()
      };
      
      await set(ref(db, newPath), newClassData);
      stats.classesMigrated++;
    }
    
    console.log(`✅ Migration complete: ${stats.classesMigrated} classes migrated.`);
    return stats;
  } catch (error: any) {
    console.error('Migration failed:', error);
    throw error;
  }
}
