# تحويل المنصة من نظام جامعي إلى نظام مدرسي
# Platform Conversion: University to School Class System

## ✅ المكتمل (Completed)

### 1. أنواع البيانات (Types) - `/types/index.ts`
✅ إضافة الحقول الجديدة لملف الطالب:
- `schoolId` - معرف المدرسة
- `stageId` - معرف المرحلة التعليمية (ابتدائي/متوسط/ثانوي)
- `gradeId` - معرف الصف داخل المرحلة
- `classId` - معرف الفصل/الشعبة

✅ إضافة واجهات جديدة:
- `SchoolClass` - واجه الفصل المدرسي
- `SchoolClassSubject` - واجه المادة داخل الفصل
- `SchoolClassLecture` - واجه المحاضرة داخل المادة
- `SchoolClassAssignment` - واجه الواجب
- `SchoolClassSchedule` - واجه الجدول الدراسي

### 2. لوحة الطالب الرئيسية - `/pages/Student/StudentDashboard.tsx`
✅ تحديث المتغيرات:
- `university_id` → `schoolId`
- `college_id` → `stageId`
- `department_id` → `gradeId`
- `batch_id` → `classId`
- `semester_id` → `year`

✅ تحديث مسارات قاعدة البيانات:
```typescript
// قبل:
edu/hub/${univ}/${coll}/${dept}/batches/${batch}/semesters/${sem}/courses/...

// بعد:
edu/sch/classes/${classId}/subjects/...
```

✅ تحديث الدوال الرئيسية:
- `handleNavigateToLecture` - يستخدم الآن مسارات الفصول المدرسية
- `handleSubmitAssignment` - يسلم الواجبات في المسار الصحيح
- `fetchQuickData` - يجلب البيانات من المسارات المدرسية
- `fetchArabicNames` - يجلب أسماء المراحل والصفوف بدلاً من الجامعات

## 📋 المطلوب إنجازه (TODO)

### الملفات التي تحتاج تحديث شامل:

#### 1. `/pages/Student/StudentCourses.tsx`
**التغييرات المطلوبة:**
- استبدال واجهات University/College/Department بواجهات SchoolClass
- تحديث مسارات قاعدة البيانات من `edu/hub/...` إلى `edu/sch/classes/...`
- تحديث نموذج تعديل الملف الشخصي لاستخدام قوائم منسدلة للفصول المدرسية
- تحديث منطق تصفية المواد ليطابق نظام الفصول المدرسية

**المسارات الجديدة:**
```typescript
// المواد
edu/sch/classes/{classId}/subjects

// المحاضرات
edu/sch/classes/{classId}/subjects/{subjectId}/lectures

// الواجبات
edu/sch/classes/{classId}/subjects/{subjectId}/assignments

// الجداول
edu/sch/classes/{classId}/schedule
```

#### 2. `/pages/Student/UploadLecturePage.tsx`
**التغييرات المطلوبة:**
- تحديث `uploadContext` لاستخدام الحقول الجديدة
- تحديث جميع مسارات الرفع:
```typescript
// قبل:
edu/hub/${univ}/${coll}/${dept}/batches/${batch}/semesters/${sem}/courses/${courseId}/lectures

// بعد:
edu/sch/classes/${classId}/subjects/${subjectId}/lectures
```

#### 3. `/pages/Student/AllViewPage.tsx`
**التغييرات المطلوبة:**
- تحديث مسارات التقدم:
```typescript
// قبل:
edu/learner/progress/${uid}/${contextId}/${subjectId}/...

// بعد:
edu/sch/classes/${classId}/subjects/${subjectId}/progress/${uid}/...
```

- تحديث مسارات التفاعل:
```typescript
// قبل:
comm/engagement/comments/${lessonId}

// بعد:
comm/engagement/classes/${classId}/subjects/${subjectId}/comments/${lessonId}
```

#### 4. `/pages/Student/CourseContentManager.tsx`
**التغييرات المطلوبة:**
- حذف نظام الاختيار بين University/School/Learner/Private
- الإبقاء فقط على وضع School (التعليم العام)
- تبسيط الواجهة للذهاب مباشرة إلى SchoolView

#### 5. ملفات Views داخل `/pages/Student/course-manager/views/`
**الملفات المطلوب حذفها:**
- `UniversityView.tsx` - لم يعد مطلوباً
- `LearnerView.tsx` - لم يعد مطلوباً
- `PrivateSchoolView.tsx` - لم يعد مطلوباً

**الملف المطلوب تعديله:**
- `SchoolView.tsx` - تحديثه ليعمل مع نظام الفصول المدرسية

## 🗄️ هيكل قاعدة البيانات الجديد (New Database Structure)

### الهيكل القديم (University-Based):
```
edu/
└── hub/
    └── {university_id}/
        └── {college_id}/
            └── {department_id}/
                └── batches/
                    └── {batch_id}/
                        └── semesters/
                            └── {semester_id}/
                                └── courses/
                                    └── {course_id}/
                                        ├── lectures/
                                        ├── assignments/
                                        └── ...
```

### الهيكل الجديد (School Class-Based):
```
edu/
└── sch/
    ├── schools/                    # قائمة المدارس
    │   └── {school_id}/
    │       ├── name: "المدرسة"
    │       ├── stages/            # المراحل التعليمية
    │       │   └── {stage_id}/
    │       │       ├── name: "المرحلة الابتدائية"
    │       │       └── grades/    # الصفوف
    │       │           └── {grade_id}/
    │       │               └── name: "الصف الخامس"
    │       └── ...
    │
    └── classes/                   # الفصول الدراسية
        └── {class_id}/
            ├── name: "الصف الخامس أ"
            ├── schoolId: "..."
            ├── stage: "primary"
            ├── grade: "5"
            ├── section: "أ"
            ├── fullName: "الصف الخامس أ"
            │
            ├── subjects/          # المواد الدراسية
            │   └── {subject_id}/
            │       ├── name: "الرياضيات"
            │       ├── teacherId: "..."
            │       │
            │       ├── lectures/  # المحاضرات
            │       │   └── {lecture_id}/
            │       │       ├── title
            │       │       ├── blocks
            │       │       └── ...
            │       │
            │       ├── assignments/ # الواجبات
            │       │   └── {assignment_id}/
            │       │
            │       └── grades/     # الدرجات
            │           └── {student_id}/
            │
            ├── schedule/           # الجدول الدراسي
            │   └── {day}/
            │       └── {time_slot}/
            │
            ├── grades/             # درجات الطلاب
            │   └── {student_id}/
            │
            └── assignments/        # الواجبات العامة
```

## 👤 ملف الطالب الجديد (New Student Profile)

### قبل (Old):
```typescript
{
  uid: "...",
  university_id: "univ_123",
  college_id: "coll_456",
  department_id: "dept_789",
  batch_id: "batch_001",
  semester_id: "sem_002"
}
```

### بعد (New):
```typescript
{
  uid: "...",
  schoolId: "school_123",
  stageId: "primary",          // أو "middle" أو "high"
  gradeId: "grade_5",          // الصف (1-12)
  classId: "class_5a",         // الفصل/الشعبة
  year: "2024-2025"            // العام الدراسي
}
```

## 🔄 نص الترحيل (Migration Script)

سيتم إنشاء نص الترحيل في:
`/scripts/migrate-to-school-classes.ts`

المهام الرئيسية للنص:
1. نقل البيانات من `edu/hub/*` إلى `edu/sch/classes/*`
2. تحويل المستخدمين من الحقول القديمة إلى الجديدة
3. تحديث جميع المسارات في قاعدة البيانات
4. الحفاظ على البيانات الموجودة

## 📝 ملاحظات هامة

### 1. التوافق العكسي (Backward Compatibility)
- يجب الاحتفاظ بالمسارات القديمة مؤقتاً أثناء فترة الانتقال
- استخدام المسارات الجديدة لجميع الميزات الجديدة فقط

### 2. تحديث الخدمات (Services Update)
يجب تحديث الملفات التالية:
- `/services/api/AdminService.ts` - دوال إدارة المدارس
- `/services/api/StudentService.ts` - دوال خدمة الطلاب
- `/services/api/TeacherService.ts` - دوال خدمة المعلمين

### 3. تحديث المكونات (Components Update)
- `/components/layout/Layout.tsx` - تحديث القوائم للتنقل
- `/components/auth/RoleSelector.tsx` - تحديث اختيار الصفوف

### 4. تحديث المسارات (Routes Update)
في `/App.tsx`:
- تحديث أي مسارات تشير إلى university إلى class
- إضافة مسارات جديدة لإدارة الفصول

## 🎯 الخطوات التالية (Next Steps)

1. **إنشاء ملف هجرة شامل** لتحويل البيانات الموجودة
2. **تحديث جميع الملفات المذكورة** باستخدام التعديلات الموضحة أعلاه
3. **اختبار شامل** للتأكد من عمل جميع الوظائف
4. **تحديث قواعد Firebase** لتعكس الهيكل الجديد
5. **تحديث التوثيق** ليعكس التغييرات

## 📚 المراحل التعليمية المعتمدة

### المرحلة الابتدائية (Primary):
- الصف الأول (Grade 1)
- الصف الثاني (Grade 2)
- الصف الثالث (Grade 3)
- الصف الرابع (Grade 4)
- الصف الخامس (Grade 5)
- الصف السادس (Grade 6)

### المرحلة المتوسطة (Middle):
- الصف الأول (Grade 7)
- الصف الثاني (Grade 8)
- الصف الثالث (Grade 9)

### المرحلة الثانوية (High):
- الصف الأول (Grade 10)
- الصف الثاني (Grade 11)
- الصف الثالث (Grade 12)

## ✨ المميزات الجديدة في النظام المدرسي

1. **بساطة الهيكل**: فصل واحد بدلاً من 5 مستويات (جامعة > كلية > قسم > دفعة > فصل)
2. **سهولة الإدارة**: إدارة مباشرة للفصول والمواد
3. **أداء أفضل**: مسارات أقصر في قاعدة البيانات
4. **ملاءمة للسياق**: نظام مدرسي بدلاً من جامعي
