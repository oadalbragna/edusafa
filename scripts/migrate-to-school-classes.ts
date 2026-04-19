/**
 * Migration Script: University to School Class System
 * 
 * This script converts the database structure from university-based hierarchy
 * to school class-based hierarchy.
 * 
 * OLD: edu/hub/{university}/{college}/{department}/batches/{batch}/semesters/{semester}/...
 * NEW: edu/sch/classes/{classId}/subjects/...
 * 
 * Run this script once to migrate all existing data.
 */

import { ref, get, set, update, remove, push, serverTimestamp } from 'firebase/database';
import { db } from '../services/firebase';

// ============================================================================
// Types
// ============================================================================

interface OldHierarchy {
  university_id: string;
  college_id: string;
  department_id: string;
  batch_id: string;
  semester_id: string;
}

interface NewHierarchy {
  schoolId: string;
  stageId: string;
  gradeId: string;
  classId: string;
  year?: string;
}

interface MigrationStats {
  usersMigrated: number;
  coursesMigrated: number;
  lecturesMigrated: number;
  assignmentsMigrated: number;
  submissionsMigrated: number;
  gradesMigrated: number;
  schedulesMigrated: number;
  errors: string[];
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map old university hierarchy to new school class hierarchy
 * This is a placeholder - customize based on your actual data
 */
async function mapUniversityToSchool(oldData: OldHierarchy): Promise<NewHierarchy | null> {
  try {
    // Example mapping logic - customize for your institution
    // You may need to create a manual mapping table
    
    // For now, we'll create a simple mapping based on common patterns
    const schoolId = oldData.university_id; // University becomes School
    
    // Map college to stage
    const stageMapping: Record<string, string> = {
      'college_engineering': 'high',
      'college_science': 'high',
      'college_arts': 'high',
      'primary_education': 'primary',
      'middle_education': 'middle',
    };
    const stageId = stageMapping[oldData.college_id] || 'high';
    
    // Map department to grade
    const gradeId = `grade_${oldData.department_id}`;
    
    // Map batch/semester to class
    const classId = `class_${oldData.batch_id}_${oldData.semester_id}`;
    
    return {
      schoolId,
      stageId,
      gradeId,
      classId,
      year: oldData.semester_id
    };
  } catch (error) {
    console.error('Error mapping university to school:', error);
    return null;
  }
}

/**
 * Build old path
 */
function buildOldPath(oldData: OldHierarchy, suffix: string = ''): string {
  return `edu/hub/${oldData.university_id}/${oldData.college_id}/${oldData.department_id}/batches/${oldData.batch_id}/semesters/${oldData.semester_id}/${suffix}`;
}

/**
 * Build new path
 */
function buildNewPath(newData: NewHierarchy, suffix: string = ''): string {
  return `edu/sch/classes/${newData.classId}/${suffix}`;
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate courses from university hub to school classes
 */
async function migrateCourses(stats: MigrationStats): Promise<void> {
  console.log('📚 Migrating courses...');
  
  try {
    // Get all universities
    const universitiesRef = ref(db, 'edu/hub');
    const universitiesSnap = await get(universitiesRef);
    
    if (!universitiesSnap.exists()) {
      console.log('  No university data found, skipping course migration');
      return;
    }
    
    const universities = universitiesSnap.val();
    
    for (const [univId, univData] of Object.entries(universities)) {
      const colleges: any = univData;
      
      for (const [collId, collData] of Object.entries(colleges)) {
        const departments: any = collData;
        
        for (const [deptId, deptData] of Object.entries(departments)) {
          const batches: any = deptData?.batches || {};
          
          for (const [batchId, batchData] of Object.entries(batches)) {
            const semesters: any = batchData?.semesters || {};
            
            for (const [semId, semData] of Object.entries(semesters)) {
              const courses: any = semData?.courses || {};
              
              if (Object.keys(courses).length === 0) continue;
              
              // Map to new hierarchy
              const mapping = await mapUniversityToSchool({
                university_id: univId,
                college_id: collId,
                department_id: deptId,
                batch_id: batchId,
                semester_id: semId
              });
              
              if (!mapping) {
                stats.errors.push(`Failed to map ${univId}/${collId}/${deptId}/${batchId}/${semId}`);
                continue;
              }
              
              // Migrate each course
              for (const [courseId, courseData] of Object.entries(courses)) {
                const newCoursePath = `edu/sch/classes/${mapping.classId}/subjects/${courseId}`;
                
                await set(ref(db, newCoursePath), {
                  ...courseData,
                  id: courseId,
                  classId: mapping.classId,
                  schoolId: mapping.schoolId,
                  stageId: mapping.stageId,
                  gradeId: mapping.gradeId,
                  migratedFrom: buildOldPath({
                    university_id: univId,
                    college_id: collId,
                    department_id: deptId,
                    batch_id: batchId,
                    semester_id: semId
                  }, `courses/${courseId}`),
                  migratedAt: serverTimestamp()
                });
                
                stats.coursesMigrated++;
              }
            }
          }
        }
      }
    }
    
    console.log(`  ✓ Migrated ${stats.coursesMigrated} courses`);
  } catch (error) {
    console.error('Error migrating courses:', error);
    stats.errors.push(`Course migration error: ${error}`);
  }
}

/**
 * Migrate lectures from university to school classes
 */
async function migrateLectures(stats: MigrationStats): Promise<void> {
  console.log('📖 Migrating lectures...');
  
  try {
    // Get all lectures from old structure
    const lecturesRef = ref(db, 'edu/lectures');
    const lecturesSnap = await get(lecturesRef);
    
    if (lecturesSnap.exists()) {
      const lectures = lecturesSnap.val();
      
      for (const [courseId, courseLectures] of Object.entries(lectures)) {
        const lecturesData: any = courseLectures;
        
        for (const [lectureId, lectureData] of Object.entries(lecturesData)) {
          // Try to find the course mapping
          const courseRef = ref(db, `edu/sch/classes/*/subjects/${courseId}`);
          const courseSnap = await get(courseRef);
          
          if (courseSnap.exists()) {
            // Find the classId from the course
            const courseData = courseSnap.val();
            const classId = courseData.classId;
            
            await set(
              ref(db, `edu/sch/classes/${classId}/subjects/${courseId}/lectures/${lectureId}`),
              {
                ...lectureData,
                id: lectureId,
                courseId,
                classId,
                migratedFrom: `edu/lectures/${courseId}/${lectureId}`,
                migratedAt: serverTimestamp()
              }
            );
            
            stats.lecturesMigrated++;
          }
        }
      }
    }
    
    console.log(`  ✓ Migrated ${stats.lecturesMigrated} lectures`);
  } catch (error) {
    console.error('Error migrating lectures:', error);
    stats.errors.push(`Lecture migration error: ${error}`);
  }
}

/**
 * Migrate assignments from university to school classes
 */
async function migrateAssignments(stats: MigrationStats): Promise<void> {
  console.log('📝 Migrating assignments...');
  
  try {
    const assignmentsRef = ref(db, 'edu/assignments');
    const assignmentsSnap = await get(assignmentsRef);
    
    if (assignmentsSnap.exists()) {
      const assignments = assignmentsSnap.val();
      
      for (const [assignmentId, assignmentData] of Object.entries(assignments)) {
        const data: any = assignmentData;
        
        // Try to find the class mapping
        if (data.classId) {
          await set(
            ref(db, `edu/sch/classes/${data.classId}/assignments/${assignmentId}`),
            {
              ...data,
              id: assignmentId,
              migratedFrom: `edu/assignments/${assignmentId}`,
              migratedAt: serverTimestamp()
            }
          );
          
          stats.assignmentsMigrated++;
        }
      }
    }
    
    console.log(`  ✓ Migrated ${stats.assignmentsMigrated} assignments`);
  } catch (error) {
    console.error('Error migrating assignments:', error);
    stats.errors.push(`Assignment migration error: ${error}`);
  }
}

/**
 * Migrate student profiles from university to school structure
 */
async function migrateUsers(stats: MigrationStats): Promise<void> {
  console.log('👥 Migrating user profiles...');
  
  try {
    const studentsRef = ref(db, 'sys/users/students');
    const studentsSnap = await get(studentsRef);
    
    if (!studentsSnap.exists()) {
      console.log('  No student data found');
      return;
    }
    
    const students = studentsSnap.val();
    const updates: Record<string, any> = {};
    
    for (const [uid, studentData] of Object.entries(students)) {
      const student: any = studentData;
      
      // Check if student has old university structure
      if (student.university_id || student.college_id || student.department_id) {
        // Map to new structure
        const mapping = await mapUniversityToSchool({
          university_id: student.university_id || '',
          college_id: student.college_id || '',
          department_id: student.department_id || student.departmentId || '',
          batch_id: student.batch || student.batch_id || '',
          semester_id: student.semester || student.semester_id || ''
        });
        
        if (mapping) {
          // Add new fields
          updates[`sys/users/students/${uid}/schoolId`] = mapping.schoolId;
          updates[`sys/users/students/${uid}/stageId`] = mapping.stageId;
          updates[`sys/users/students/${uid}/gradeId`] = mapping.gradeId;
          updates[`sys/users/students/${uid}/classId`] = mapping.classId;
          updates[`sys/users/students/${uid}/year`] = mapping.year;
          
          // Keep old fields for backward compatibility (optional)
          // updates[`sys/users/students/${uid}/_old_university_id`] = student.university_id;
          
          stats.usersMigrated++;
        }
      }
    }
    
    // Apply all updates in one go
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
      console.log(`  ✓ Migrated ${stats.usersMigrated} user profiles`);
    } else {
      console.log('  No users needed migration');
    }
  } catch (error) {
    console.error('Error migrating users:', error);
    stats.errors.push(`User migration error: ${error}`);
  }
}

/**
 * Migrate grades from old structure to new
 */
async function migrateGrades(stats: MigrationStats): Promise<void> {
  console.log('📊 Migrating grades...');
  
  try {
    const gradesRef = ref(db, 'edu/grades');
    const gradesSnap = await get(gradesRef);
    
    if (gradesSnap.exists()) {
      const grades = gradesSnap.val();
      
      for (const [classId, classGrades] of Object.entries(grades)) {
        const gradesData: any = classGrades;
        
        for (const [studentId, studentGrades] of Object.entries(gradesData)) {
          await set(
            ref(db, `edu/sch/classes/${classId}/grades/${studentId}`),
            {
              ...studentGrades,
              migratedFrom: `edu/grades/${classId}/${studentId}`,
              migratedAt: serverTimestamp()
            }
          );
          
          stats.gradesMigrated++;
        }
      }
    }
    
    console.log(`  ✓ Migrated ${stats.gradesMigrated} grade records`);
  } catch (error) {
    console.error('Error migrating grades:', error);
    stats.errors.push(`Grade migration error: ${error}`);
  }
}

/**
 * Migrate schedules from old structure to new
 */
async function migrateSchedules(stats: MigrationStats): Promise<void> {
  console.log('📅 Migrating schedules...');
  
  try {
    const scheduleRef = ref(db, 'edu/schedule');
    const scheduleSnap = await get(scheduleRef);
    
    if (scheduleSnap.exists()) {
      const schedules = scheduleSnap.val();
      
      for (const [batchId, scheduleData] of Object.entries(schedules)) {
        // Try to find the corresponding classId
        const schedule: any = scheduleData;
        
        if (schedule.classId) {
          await set(
            ref(db, `edu/sch/classes/${schedule.classId}/schedule`),
            {
              ...schedule,
              migratedFrom: `edu/schedule/${batchId}`,
              migratedAt: serverTimestamp()
            }
          );
          
          stats.schedulesMigrated++;
        }
      }
    }
    
    console.log(`  ✓ Migrated ${stats.schedulesMigrated} schedules`);
  } catch (error) {
    console.error('Error migrating schedules:', error);
    stats.errors.push(`Schedule migration error: ${error}`);
  }
}

// ============================================================================
// Main Migration Runner
// ============================================================================

/**
 * Run the complete migration
 */
export async function runMigration(): Promise<MigrationStats> {
  console.log('🚀 Starting migration: University → School Class System');
  console.log('=' .repeat(60));
  
  const stats: MigrationStats = {
    usersMigrated: 0,
    coursesMigrated: 0,
    lecturesMigrated: 0,
    assignmentsMigrated: 0,
    submissionsMigrated: 0,
    gradesMigrated: 0,
    schedulesMigrated: 0,
    errors: []
  };
  
  try {
    // Step 1: Migrate users first (they need to exist before we can migrate their data)
    await migrateUsers(stats);
    
    // Step 2: Migrate courses
    await migrateCourses(stats);
    
    // Step 3: Migrate lectures
    await migrateLectures(stats);
    
    // Step 4: Migrate assignments
    await migrateAssignments(stats);
    
    // Step 5: Migrate grades
    await migrateGrades(stats);
    
    // Step 6: Migrate schedules
    await migrateSchedules(stats);
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Migration Complete!');
    console.log('=' .repeat(60));
    console.log(`👥 Users Migrated: ${stats.usersMigrated}`);
    console.log(`📚 Courses Migrated: ${stats.coursesMigrated}`);
    console.log(`📖 Lectures Migrated: ${stats.lecturesMigrated}`);
    console.log(`📝 Assignments Migrated: ${stats.assignmentsMigrated}`);
    console.log(`📊 Grades Migrated: ${stats.gradesMigrated}`);
    console.log(`📅 Schedules Migrated: ${stats.schedulesMigrated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
    
    return stats;
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration (remove migrated data from new structure)
 * WARNING: This will delete all data in the new school class structure
 */
export async function rollbackMigration(): Promise<void> {
  console.log('⚠️  Rolling back migration...');
  console.log('WARNING: This will remove all data from the new school class structure');
  
  const confirm = window.confirm('Are you sure you want to rollback the migration? This cannot be undone.');
  if (!confirm) return;
  
  try {
    await remove(ref(db, 'edu/sch'));
    console.log('✅ Rollback complete');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Verify migration integrity
 */
export async function verifyMigration(): Promise<{ valid: boolean; issues: string[] }> {
  console.log('🔍 Verifying migration integrity...');
  
  const issues: string[] = [];
  
  try {
    // Check if new structure exists
    const schRef = ref(db, 'edu/sch');
    const schSnap = await get(schRef);
    
    if (!schSnap.exists()) {
      issues.push('New school class structure does not exist');
      return { valid: false, issues };
    }
    
    // Check if classes have subjects
    const classesRef = ref(db, 'edu/sch/classes');
    const classesSnap = await get(classesRef);
    
    if (classesSnap.exists()) {
      const classes = classesSnap.val();
      
      for (const [classId, classData] of Object.entries(classes)) {
        const classObj: any = classData;
        
        if (!classObj.schoolId) {
          issues.push(`Class ${classId} missing schoolId`);
        }
        if (!classObj.stageId) {
          issues.push(`Class ${classId} missing stageId`);
        }
        if (!classObj.gradeId) {
          issues.push(`Class ${classId} missing gradeId`);
        }
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ Migration verification passed');
      return { valid: true, issues: [] };
    } else {
      console.log(`⚠️  Verification found ${issues.length} issues`);
      return { valid: false, issues };
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { valid: false, issues: [`Verification error: ${error}`] };
  }
}

// Export for use in your app
export default {
  runMigration,
  rollbackMigration,
  verifyMigration
};
