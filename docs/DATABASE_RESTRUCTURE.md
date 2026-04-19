# 🗄️ EduSafa Learning - Database Restructuring Plan

## 📋 Overview

إعادة هيكلة شاملة لقاعدة بيانات مشروع EduSafa_Learning لتكون منظمة، قابلة للتوسع، وسهلة الصيانة.

---

## 🎯 الأهداف

1. **تبسيط الهيكل**: تقليل التعقيد من خلال 3 تفرعات رئيسية فقط
2. **الحفاظ على البيانات**: لا فقدان لأي بيانات حالية
3. **عدم كسر النظام**: جميع الميزات تعمل بدون مشاكل
4. **تحسين الأداء**: تنظيم المسارات لتحسين سرعة الوصول
5. **توحيد التسمية**: Naming Convention موحد وواضح

---

## 🏗️ الهيكل الجديد

```
EduSafa_Learning/database/
│
├── sys/          # System Core - البيانات الحساسة والإدارية
├── edu/          # Education - العملية التعليمية
└── comm/         # Communication - التفاعل الاجتماعي
```

---

## 📁 التصنيف التفصيلي

### 1️⃣ sys (System Core)

```
sys/
├── users/                    # جميع المستخدمين (طلاب، معلمين، إداريين، أولياء أمور)
├── system/
│   ├── settings/             # إعدادات المنصة العامة
│   │   ├── branding/         # الهوية البصرية
│   │   ├── maskingActive     # حالة التمويه
│   │   ├── allowRegistration # السماح بالتسجيل
│   │   └── maintenanceMode   # وضع الصيانة
│   ├── slider/               # عناصر السلايدر
│   ├── banks/                # الحسابات البنكية
│   └── meta_data/
│       └── safe_links/       # روابط الملفات الآمنة
├── maintenance/
│   ├── activities/           # سجل النشاطات (was: activities)
│   ├── cashipay_logs/        # سجلات Cashipay
│   └── support_tickets/      # تذاكر الدعم
├── logs/                     # السجلات الإضافية
├── indices/                  # الفهارس
├── config/
│   └── teacher_class_requests/  # طلبات انضمام المعلمين
└── announcements/            # التعميمات العامة
```

**المسارات المشمولة:**
- `users` → `sys/users`
- `settings` → `sys/system/settings`
- `branding` → `sys/system/settings/branding`
- `slider` → `sys/system/slider`
- `banks` → `sys/system/banks`
- `meta_data` → `sys/system/meta_data`
- `activities` → `sys/maintenance/activities`
- `cashipay_logs` → `sys/maintenance/cashipay_logs`
- `support_tickets` → `sys/maintenance/support_tickets`
- `teacher_class_requests` → `sys/config/teacher_class_requests`
- `announcements` → `sys/announcements`

---

### 2️⃣ edu (Education)

```
edu/
├── sch/                      # Schools - المدارس
│   ├── classes/              # الفصول الدراسية
│   ├── classes_meta/         # بيانات الفصول الإضافية
│   └── schedules/            # الجداول
├── courses/                  # المواد الدراسية (was: global_subjects)
├── lessons/                  # الدروس
├── assignments/              # الواجبات
├── submissions/              # التسليمات
├── grades/                   # الدرجات
├── exams/                    # الامتحانات
├── results/                  # النتائج
├── attendance/               # الحضور
├── timetable/                # الجداول الزمنية
├── timetable_settings/       # إعدادات الجداول
├── academic_settings/        # الإعدادات الأكاديمية
├── curricula/                # المقررات الدراسية
├── live_links/               # روابط البث المباشر
└── announcements_subject/    # تعميمات المواد
```

**المسارات المشمولة:**
- `classes` → `edu/sch/classes`
- `global_subjects` → `edu/courses`
- `assignments` → `edu/assignments`
- `submissions` → `edu/submissions`
- `grades` → `edu/grades`
- `attendance` → `edu/attendance`
- `timetable` → `edu/timetable`
- `timetable_settings` → `edu/timetable_settings`
- `academic_settings` → `edu/academic_settings`
- `curricula` → `edu/curricula`
- `live_links` → `edu/live_links`
- `announcements_subject` → `edu/announcements_subject`

---

### 3️⃣ comm (Communication)

```
comm/
├── chats/                    # المحادثات
├── messages/                 # الرسائل
├── notifications/            # الإشعارات
├── groups/                   # المجموعات
└── feeds/                    # المنشورات
```

**المسارات المشمولة:**
- `chats` → `comm/chats`
- `messages` → `comm/messages`
- `notifications` → `comm/notifications`
- `support_tickets` → `sys/maintenance/support_tickets` (نُقل إلى sys)

---

## 🔄 Migration Map (دليل التحويل)

### جدول التحويل الكامل

| المسار القديم | المسار الجديد | الحالة |
|--------------|--------------|--------|
| `EduSafa_Learning/database/users` | `sys/users` | ✅ نقل مباشر |
| `EduSafa_Learning/database/classes` | `edu/sch/classes` | ✅ نقل مباشر |
| `EduSafa_Learning/database/global_subjects` | `edu/courses` | ✅ إعادة تسمية |
| `EduSafa_Learning/database/assignments` | `edu/assignments` | ✅ نقل مباشر |
| `EduSafa_Learning/database/submissions` | `edu/submissions` | ✅ نقل مباشر |
| `EduSafa_Learning/database/grades` | `edu/grades` | ✅ نقل مباشر |
| `EduSafa_Learning/database/attendance` | `edu/attendance` | ✅ نقل مباشر |
| `EduSafa_Learning/database/timetable` | `edu/timetable` | ✅ نقل مباشر |
| `EduSafa_Learning/database/timetable_settings` | `edu/timetable_settings` | ✅ نقل مباشر |
| `EduSafa_Learning/database/academic_settings` | `edu/academic_settings` | ✅ نقل مباشر |
| `EduSafa_Learning/database/curricula` | `edu/curricula` | ✅ نقل مباشر |
| `EduSafa_Learning/database/live_links` | `edu/live_links` | ✅ نقل مباشر |
| `EduSafa_Learning/database/announcements_subject` | `edu/announcements_subject` | ✅ نقل مباشر |
| `EduSafa_Learning/database/chats` | `comm/chats` | ✅ نقل مباشر |
| `EduSafa_Learning/database/messages` | `comm/messages` | ✅ نقل مباشر |
| `EduSafa_Learning/database/notifications` | `comm/notifications` | ✅ نقل مباشر |
| `EduSafa_Learning/database/settings` | `sys/system/settings` | ✅ نقل مباشر |
| `EduSafa_Learning/database/branding` | `sys/system/settings/branding` | ✅ دمج |
| `EduSafa_Learning/database/slider` | `sys/system/slider` | ✅ نقل مباشر |
| `EduSafa_Learning/database/banks` | `sys/system/banks` | ✅ نقل مباشر |
| `EduSafa_Learning/database/meta_data` | `sys/system/meta_data` | ✅ نقل مباشر |
| `EduSafa_Learning/database/activities` | `sys/maintenance/activities` | ✅ نقل مباشر |
| `EduSafa_Learning/database/cashipay_logs` | `sys/maintenance/cashipay_logs` | ✅ نقل مباشر |
| `EduSafa_Learning/database/support_tickets` | `sys/maintenance/support_tickets` | ✅ نقل مباشر |
| `EduSafa_Learning/database/teacher_class_requests` | `sys/config/teacher_class_requests` | ✅ نقل مباشر |
| `EduSafa_Learning/database/announcements` | `sys/announcements` | ✅ نقل مباشر |
| `EduSafa_Learning/database/payments` | `sys/financial/payments` | ✅ نقل مباشر |

---

## 📝 ملاحظات هامة

### 🔸 البيانات التي تحتاج معالجة خاصة

1. **`branding`**: كان يُحفظ كـ `settings/branding`، الآن يصبح `sys/system/settings/branding`
2. **`global_subjects`**: يُعاد تسميته إلى `courses` لوضوح أكثر
3. **`payments`**: يُنقل إلى `sys/financial/payments` للوضوح

### 🔸 المسارات المشتركة

بعض المسارات قد تُستخدم في أكثر من سياق، مثال:
- `announcements` العامة → `sys/announcements`
- `announcements_subject` → `edu/announcements_subject`

---

## 🚀 خطة التنفيذ

### المرحلة 1: التحضير
- [ ] إنشاء نسخة احتياطية كاملة من قاعدة البيانات
- [ ] توثيق جميع المسارات الحالية
- [ ] إعداد ملف Migration Script

### المرحلة 2: إنشاء الهيكل الجديد
- [ ] إنشاء المسارات الجديدة فارغة
- [ ] اختبار الوصول للمسارات الجديدة

### المرحلة 3: ترحيل البيانات
- [ ] نسخ البيانات من المسارات القديمة إلى الجديدة
- [ ] التحقق من سلامة البيانات المنقولة

### المرحلة 4: تحديث الكود
- [ ] تحديث جميع المراجع في ملفات TypeScript/TSX
- [ ] تحديث خدمات Firebase
- [ ] اختبار كل ميزة على حدة

### المرحلة 5: الاختبار
- [ ] اختبار تسجيل الدخول
- [ ] اختبار إدارة الفصول
- [ ] اختبار الدردشة والإشعارات
- [ ] اختبار النظام المالي
- [ ] اختبار تقارير النشاطات

### المرحلة 6: التنظيف
- [ ] إزالة المسارات القديمة بعد التأكد من عدم استخدامها
- [ ] توثيق التغييرات النهائية

---

## 📊 الإحصائيات

| الفئة | عدد المسارات | النسبة |
|-------|-------------|--------|
| sys | 12 | 45% |
| edu | 14 | 50% |
| comm | 3 | 5% |
| **الإجمالي** | **29** | **100%** |

---

## ✅ قائمة التحقق

### قبل الترحيل
- [ ] نسخة احتياطية مكتملة
- [ ] فريق التطوير على علم بالتغييرات
- [ ] خطة تراجع جاهزة (Rollback Plan)

### بعد الترحيل
- [ ] جميع المستخدمين يمكنهم تسجيل الدخول
- [ ] الفصول الدراسية تعمل بشكل صحيح
- [ ] نظام الدردشة يعمل
- [ ] الإشعارات تصل بشكل صحيح
- [ ] النظام المالي يعمل
- [ ] سجل النشاطات يسجل بشكل صحيح
- [ ] إعدادات المنصة قابلة للتعديل
- [ ] الهويات البصرية تعمل

---

## 🔧 الملفات التي تحتاج تحديث

### Services
- `services/firebase.ts` - إضافة ثوابت المسارات
- `services/auth.service.ts` - تحديث مسارات المستخدمين
- `services/telegram.service.ts` - تحديث مسار الإعدادات

### API
- `api/media.ts` - تحديث مسار meta_data

### Context
- `context/AuthContext.tsx` - تحديث مسار users
- `context/BrandingContext.tsx` - تحديث مسار branding

### Hooks
- `hooks/useRegister.ts` - تحديث مسار settings
- `hooks/useLogin.ts` - تحديث مسار users

### Pages (جميع الصفحات)
- جميع ملفات `pages/**/*.tsx` - تحديث 200+ مرجع

### Utils
- `utils/activityLogger.ts` - تحديث مسار activities

---

## 📖 معايير التسمية (Naming Convention)

### ✅ المبادئ
1. **أسماء واضحة**: استخدام أسماء تصف المحتوى بوضوح
2. **تسلسل هرمي**: من العام إلى الخاص
3. **تجنب التكرار**: عدم تكرار نفس الاسم في مستويات مختلفة
4. **اتساق**: استخدام نفس النمط في جميع المسارات

### 📝 الأنماط
```
✅ صحيح:
  sys/users
  sys/system/settings
  edu/sch/classes
  edu/courses
  comm/messages

❌ خاطئ:
  sys/user_data
  edu/school/classes/list
  comm/chat/messages
```

---

## 🎯 النتائج المتوقعة

1. **هيكل أنظف**: 3 تفرعات رئيسية فقط بدلاً من 25+ مسار عشوائي
2. **صيانة أسهل**: أي مطور يمكنه فهم الهيكل بسرعة
3. **أداء أفضل**: تنظيم المسارات يحسن سرعة الوصول
4. **قابلية التوسع**: إضافة ميزات جديدة تصبح أسهل
5. **أمان محسّن**: فصل البيانات الحساسة في sys

---

## 📞 الدعم

لأي استفسارات حول إعادة الهيكلة، يرجى فتح تذكرة دعم فني أو مراجعة التوثيق الكامل.

---

**آخر تحديث**: 2026-04-01  
**الحالة**: مسودة  
**المراجعة القادمة**: بعد اكتمال الترحيل
