# 📚 هيكلية المواد داخل الفصول - Class-Based Subjects Structure

## 🎯 النظرة العامة

تم تغيير هيكلية النظام من **مواد موحدة** إلى **مواد داخل كل فصل دراسي**.

---

## 🔄 المقارنة بين الهيكلين

### ❌ الهيكل القديم (مواد موحدة)

```
edu/
├── sch/classes/
│   └── {classId}/
│       └── subjects: [...]  ← مجرد قائمة مراجع
├── courses/                  ← المواد العالمية
├── materials/
│   └── {classId}/{subjectId}/{type}/
├── assignments/
│   └── {classId}/{subjectId}/
└── grades/
    └── {classId}/{subjectId}/
```

**المشاكل:**
- ❌ المواد ليست جزءاً فعلياً من الفصل
- ❌ صعوبة إدارة الصلاحيات
- ❌ البيانات موزعة في أماكن متعددة
- ❌ صعوبة نقل فصل كامل

### ✅ الهيكل الجديد (مواد داخل الفصول)

```
edu/
└── sch/classes/
    └── {classId}/
        ├── info/                    ← معلومات الفصل
        ├── students/                ← الطلاب
        └── subjects/                ← المواد (NEW!)
            └── {subjectId}/
                ├── info/            ← معلومات المادة
                ├── teacher/         ← بيانات المعلم
                ├── curricula/       ← المقررات
                ├── schedules/       ← الجداول
                ├── tests/           ← الاختبارات
                ├── materials/       ← المواد التعليمية
                │   ├── lectures/
                │   ├── summaries/
                │   ├── exams/
                │   └── recordings/
                ├── assignments/     ← الواجبات
                ├── submissions/     ← التسليمات
                ├── grades/          ← الدرجات
                ├── attendance/      ← الحضور
                ├── announcements/   ← الإعلانات
                └── live_links/      ← روابط البث
```

**المزايا:**
- ✅ كل شيء في مكان واحد
- ✅ سهولة إدارة الصلاحيات
- ✅ سهولة نقل/نسخ الفصل
- ✅ هيكل واضح ومنظم

---

## 📊 الهيكل التفصيلي

### المستوى 1: الفصل الدراسي

```typescript
edu/sch/classes/{classId}/
├── info/              // معلومات الفصل
├── students/          // الطلاب المسجلين
└── subjects/          // المواد
```

### المستوى 2: المادة داخل الفصل

```typescript
edu/sch/classes/{classId}/subjects/{subjectId}/
├── info/              // معلومات المادة
├── teacher/           // بيانات المعلم
├── curricula/         // المقررات
├── schedules/         // الجداول
├── tests/             // الاختبارات
├── materials/         // المواد التعليمية
├── assignments/       // الواجبات
├── submissions/       // التسليمات
├── grades/            // الدرجات
├── attendance/        // الحضور
├── announcements/     // الإعلانات
└── live_links/        // روابط البث
```

### المستوى 3: المحتوى الداخلي

```typescript
// المقررات
edu/sch/classes/{classId}/subjects/{subjectId}/curricula/{curriculumId}

// الجداول
edu/sch/classes/{classId}/subjects/{subjectId}/schedules/{scheduleId}

// الاختبارات
edu/sch/classes/{classId}/subjects/{subjectId}/tests/{testId}

// المواد التعليمية
edu/sch/classes/{classId}/subjects/{subjectId}/materials/{type}/{materialId}
// Types: lectures, summaries, exams, recordings

// الواجبات
edu/sch/classes/{classId}/subjects/{subjectId}/assignments/{assignmentId}

// التسليمات
edu/sch/classes/{classId}/subjects/{subjectId}/submissions/{submissionId}

// الدرجات
edu/sch/classes/{classId}/subjects/{subjectId}/grades/{studentId}

// الحضور
edu/sch/classes/{classId}/subjects/{subjectId}/attendance/{date}

// الإعلانات
edu/sch/classes/{classId}/subjects/{subjectId}/announcements/{announcementId}

// روابط البث
edu/sch/classes/{classId}/subjects/{subjectId}/live_links/{linkId}
```

---

## 🔧 كيفية الاستخدام

### إضافة مادة جديدة لفصل

```typescript
import { EDU } from './constants/dbPaths';
import { ref, push, set } from 'firebase/database';

async function addSubjectToClass(
  classId: string,
  subjectData: {
    name: string;
    teacherId: string;
    teacherName: string;
    description?: string;
  }
) {
  // إنشاء المادة داخل الفصل
  const subjectRef = push(ref(db, EDU.SCH.classSubjects(classId)));
  
  const subject = {
    id: subjectRef.key,
    ...subjectData,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  await set(subjectRef, subject);
  
  // تهيئة الأقسام الداخلية للمادة
  await initializeSubjectSections(classId, subject.id);
  
  return subject;
}

async function initializeSubjectSections(classId: string, subjectId: string) {
  const sections = {
    curricula: {},
    schedules: {},
    tests: {},
    materials: {
      lectures: {},
      summaries: {},
      exams: {},
      recordings: {}
    },
    assignments: {},
    submissions: {},
    grades: {},
    attendance: {},
    announcements: {},
    live_links: {}
  };
  
  await set(ref(db, EDU.SCH.classSubject(classId, subjectId)), {
    ...sections,
    initializedAt: new Date().toISOString()
  });
}
```

### إضافة محتوى لمادة

```typescript
// إضافة محاضرة
async function addLecture(classId: string, subjectId: string, lectureData: any) {
  const lectureRef = push(ref(db, EDU.SCH.classSubjectMaterials(classId, subjectId, 'lectures')));
  await set(lectureRef, {
    id: lectureRef.key,
    ...lectureData,
    createdAt: new Date().toISOString()
  });
}

// إضافة واجب
async function addAssignment(classId: string, subjectId: string, assignmentData: any) {
  const assignmentRef = push(ref(db, EDU.SCH.classSubjectAssignments(classId, subjectId)));
  await set(assignmentRef, {
    id: assignmentRef.key,
    ...assignmentData,
    createdAt: new Date().toISOString(),
    dueDate: assignmentData.dueDate,
    totalScore: assignmentData.totalScore
  });
}

// إضافة درجة لطالب
async function addGrade(classId: string, subjectId: string, studentId: string, gradeData: any) {
  const gradeRef = ref(db, EDU.SCH.classSubjectGrades(classId, subjectId, studentId));
  await set(gradeRef, {
    ...gradeData,
    updatedAt: new Date().toISOString()
  });
}

// تسجيل حضور
async function markAttendance(classId: string, subjectId: string, date: string, students: any[]) {
  const attendanceRef = ref(db, EDU.SCH.classSubjectAttendance(classId, subjectId, date));
  await set(attendanceRef, {
    date,
    students,
    recordedAt: new Date().toISOString()
  });
}
```

### جلب بيانات مادة كاملة

```typescript
async function getSubjectData(classId: string, subjectId: string) {
  const subjectRef = ref(db, EDU.SCH.classSubject(classId, subjectId));
  const snapshot = await get(subjectRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return {
    id: subjectId,
    ...snapshot.val()
  };
}

// جلب محاضرات مادة معينة
async function getLectures(classId: string, subjectId: string) {
  const lecturesRef = ref(db, EDU.SCH.classSubjectMaterials(classId, subjectId, 'lectures'));
  const snapshot = await get(lecturesRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  return Object.values(snapshot.val());
}

// جلب واجبات مادة معينة
async function getAssignments(classId: string, subjectId: string) {
  const assignmentsRef = ref(db, EDU.SCH.classSubjectAssignments(classId, subjectId));
  const snapshot = await get(assignmentsRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  return Object.values(snapshot.val());
}
```

---

## 📋 خطة الترحيل

### المرحلة 1: إنشاء الهيكل الجديد

```typescript
// قراءة الفصول الحالية
const classesSnap = await get(ref(db, EDU.SCH.CLASSES));
const classes = classesSnap.val();

for (const [classId, classData] of Object.entries(classes)) {
  // إنشاء قسم subjects داخل كل فصل
  await set(ref(db, EDU.SCH.classSubjects(classId)), {});
  
  // نقل المواد من الهيكل القديم
  const subjects = classData.subjects || [];
  for (const subject of subjects) {
    await initializeSubjectInClass(classId, subject);
  }
}
```

### المرحلة 2: ترحيل البيانات

```typescript
// ترحيل المواد التعليمية
const materialsSnap = await get(ref(db, 'edu/sch/materials'));
if (materialsSnap.exists()) {
  const materials = materialsSnap.val();
  
  for (const [classId, classMaterials] of Object.entries(materials)) {
    for (const [subjectId, subjectMaterials] of Object.entries(classMaterials)) {
      // نقل من الهيكل القديم للجديد
      for (const [type, items] of Object.entries(subjectMaterials)) {
        for (const [itemId, itemData] of Object.entries(items)) {
          await set(
            ref(db, EDU.SCH.classSubjectMaterials(classId, subjectId, type, itemId)),
            itemData
          );
        }
      }
    }
  }
}
```

### المرحلة 3: تحديث الكود

- [ ] تحديث `TeacherDashboard.tsx`
- [ ] تحديث `StudentDashboard.tsx`
- [ ] تحديث `AdminDashboard.tsx`
- [ ] تحديث جميع صفحات الإدارة
- [ ] اختبار شامل

---

## ⚠️ ملاحظات هامة

### التوافق مع الإصدارات السابقة

```typescript
// خلال فترة الانتقال، يمكن استخدام المسارات القديمة كـ fallback
const useNewStructure = true; // Config flag

if (useNewStructure) {
  // استخدام الهيكل الجديد
  path = EDU.SCH.classSubjectMaterials(classId, subjectId, type);
} else {
  // استخدام الهيكل القديم
  path = `edu/sch/materials/${classId}/${subjectId}/${type}`;
}
```

### الأداء

- ✅ البيانات مجمعة في مكان واحد
- ✅ عدد أقل من القراءات
- ✅ سهولة في الـ caching

### الصلاحيات

```typescript
// التحقق من صلاحيات المعلم
async function checkTeacherPermissions(
  uid: string,
  classId: string,
  subjectId: string
) {
  const teacherRef = ref(
    db,
    EDU.SCH.classSubject(classId, subjectId, 'teacher')
  );
  const teacherSnap = await get(teacherRef);
  
  return teacherSnap.exists() && teacherSnap.val().teacherId === uid;
}
```

---

## 🎯 الفوائد

| المعيار | الهيكل القديم | الهيكل الجديد |
|---------|--------------|--------------|
| **التنظيم** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **الصلاحيات** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **الأداء** | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **الصيانة** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **التوسع** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

**التاريخ**: 2026-04-01  
**الإصدار**: 4.0.0 - Class-Based Subjects  
**الحالة**: 🚧 قيد التطوير
