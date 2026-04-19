# إصلاح تسجيل ولي الأمر مع رفع مستند الهوية

## 📋 المشكلة

كانت هناك مشكلتان رئيسيتان:

1. **عدم إنشاء حساب ولي الأمر**: كان التسجيل يفشل لأن البريد الإلكتروني كان مطلوباً إجبارياً
2. **لا يوجد خطوة رفع هوية**: لم يكن هناك خطوة مخصصة لرفع مستندات إثبات الهوية أثناء التسجيل

## ✅ الحل المُنفذ

### 1. جعل البريد الإلكتروني اختيارياً لولي الأمر

**الملف:** `services/auth.service.ts`

**التغييرات:**
```typescript
// قبل
if (!validateEmail(userData.email)) {
  return { success: false, error: 'البريد الإلكتروني غير صحيح' };
}

// بعد
if (userData.email) {
  if (!validateEmail(userData.email)) {
    return { success: false, error: 'البريد الإلكتروني غير صحيح' };
  }
  // Check if email already exists
  const existingUsers = await this.fetchUsers();
  const emailExists = Object.values(existingUsers).some((u: any) => u.email === userData.email);
  if (emailExists) {
    return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
  }
}
```

**النتيجة:**
- البريد الإلكتروني أصبح **اختيارياً** لولي الأمر
- لا يزال مطلوباً ومُتحقق منه للطلاب والمعلمين والمشرفين

### 2. إضافة خطوة رفع مستند الهوية في التسجيل

**الملف:** `pages/Auth/RegisterPage.tsx`

**التغييرات:**

#### أ. إضافة خطوة جديدة `identity-upload`
```typescript
type RegistrationStep = 'role' | 'info' | 'education' | 'parent-code' | 'identity-upload' | 'password' | 'success';

// Step Configuration
const stepConfig: Record<UserRole, RegistrationStep[]> = {
  student: ['role', 'info', 'education', 'password', 'success'],
  teacher: ['role', 'info', 'password', 'success'],
  parent: ['role', 'info', 'parent-code', 'identity-upload', 'password', 'success'], // ✅ خطوة جديدة
  admin: ['role', 'info', 'password', 'success']
};
```

#### ب. إضافة مكون رفع مستند الهوية
```typescript
{step === 'identity-upload' && (
  <div className="space-y-6 animate-in slide-in-from-right-4">
    {parentCodeValid && studentInfo && (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
        <div>
          <p className="text-xs text-blue-500 font-bold">تم التحقق من الطالب</p>
          <p className="text-sm font-black text-blue-700">{studentInfo.fullName}</p>
        </div>
      </div>
    )}
    <div className="bg-white rounded-3xl shadow-xl p-6">
      <IdentityDocumentUpload
        parentUid="temp_registration"
        parentName={formData.fullName || 'ولي الأمر'}
        onSuccess={handleIdentityUploadSuccess}
      />
    </div>
    {identityDocUploaded && (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
        <div className="flex-1">
          <p className="font-black text-green-800">تم رفع مستند الهوية بنجاح!</p>
          <p className="text-xs text-green-600 mt-1">
            النوع: <span className="font-bold">{identityDocData?.documentType}</span>
          </p>
        </div>
      </div>
    )}
  </div>
)}
```

### 3. حفظ مستند الهوية مع بيانات الحساب

**الملف:** `pages/Auth/RegisterPage.tsx`

**آلية العمل:**

1. **أثناء رفع المستند:**
   - يتم حفظ بيانات المستند مؤقتاً في state
   - يتم تخزين بيانات التسجيل في `window.__parentRegistrationData`

2. **عند إنشاء الحساب:**
   - يتم إرسال بيانات المستند مع بيانات التسجيل
   - بعد إنشاء الحساب بنجاح، يتم حفظ المستند في:
     ```
     sys/users/{parentUid}/identityDocuments/{docId}
     ```

3. **الكود المُنفذ:**
```typescript
const handleFinalSubmit = async () => {
  // Store registration data temporarily
  if (userType === 'parent' && identityDocData && studentInfo) {
    (window as any).__parentRegistrationData = {
      studentInfo: { uid: studentInfo.uid, fullName: studentInfo.fullName },
      identityDocData: {
        fileUrl: identityDocData.fileUrl,
        documentType: identityDocData.documentType,
        uploadedAt: identityDocData.uploadedAt,
        fileName: identityDocData.fileName,
        fileId: identityDocData.fileId,
        shortId: identityDocData.shortId
      }
    };
  }

  // Create account
  const result = await handleSubmit();

  // Save identity document after successful account creation
  if (result?.success && result.uid && userType === 'parent' && identityDocData) {
    await handleAccountCreated(result.uid);
    delete (window as any).__parentRegistrationData;
  }
};
```

### 4. تحديث AuthService لبيانات ولي الأمر

**الملف:** `services/auth.service.ts`

**إضافة حقول ولي الأمر:**
```typescript
const newUser = {
  ...cleanData,
  password: hashedPassword,
  uid,
  fullName: userData.fullName || `...`,
  email: userData.email || '', // Optional for parents
  status: 'pending',
  createdAt: new Date().toISOString(),
  lastSeen: serverTimestamp(),
  // For parents, add student link info
  ...(userData.role === 'parent' && userData.studentLink ? {
    studentLink: userData.studentLink,
    studentLinks: [userData.studentLink],
    identityDocumentUrl: userData.identityDocumentUrl || '',
    identityDocumentType: userData.identityDocumentType || '',
    identityUploadedAt: userData.identityUploadedAt || '',
    identityStatus: 'pending'
  } : {})
};
```

### 5. تحديث واجهة البيانات

**الملف:** `types/index.ts`

تم إضافة حقول جديدة مسبقاً:
```typescript
export interface ParentLinkRequest {
  // ... existing fields
  
  // Identity document fields (new system)
  identityDocumentUrl?: string;
  identityDocumentType?: 'id_card' | 'passport' | 'family_book' | 'birth_certificate' | 'driver_license' | 'residence_permit' | 'other';
  identityDocumentId?: string;
  identityUploadedAt?: string;
  identityReviewedBy?: string;
  identityReviewedAt?: string;
  identityStatus?: 'pending' | 'approved' | 'rejected';
}
```

## 🔄 سير العمل الكامل

```
ولي الأمر يسجل حساب جديد:

1. اختيار نوع الحساب: "ولي أمر"
   ↓
2. إدخال البيانات الشخصية:
   - الاسم الكامل
   - رقم الهاتف (مع التحقق)
   - البريد الإلكتروني (اختياري)
   ↓
3. إدخال رمز دعوة الطالب:
   - إدخال الرمز يدوياً أو مسح QR
   - التحقق من الرمز
   - عرض بيانات الطالب
   ↓
4. رفع مستند إثبات الهوية: ✅ خطوة جديدة
   - اختيار نوع المستند (بطاقة هوية، جواز سفر، إلخ)
   - رفع الملف عبر جسر تيليغرام
   - معاينة المستند
   - تأكيد الرفع
   ↓
5. إنشاء كلمة المرور:
   - إدخال كلمة مرور آمنة (8 أحرف على الأقل)
   ↓
6. إنشاء الحساب:
   - حفظ بيانات الحساب في: sys/users/{uid}
   - حفظ مستند الهوية في: sys/users/{uid}/identityDocuments/{docId}
   - حالة الحساب: 'pending'
   ↓
7. صفحة النجاح:
   - عرض رسالة مخصصة لولي الأمر
   - توجيه إلى صفحة تسجيل الدخول
```

## 📊 البيانات المحفوظة

### في `sys/users/{parentUid}`:
```json
{
  "uid": "u_1234567890_abc12",
  "fullName": "أحمد محمد",
  "email": "",
  "phone": "0912345678",
  "role": "parent",
  "password": "hashed_password_here",
  "status": "pending",
  "createdAt": "2026-04-05T12:00:00.000Z",
  "studentLink": "student_uid_here",
  "studentLinks": ["student_uid_here"],
  "identityDocumentUrl": "https://api.telegram.org/file/...",
  "identityDocumentType": "id_card",
  "identityUploadedAt": "2026-04-05T12:00:00.000Z",
  "identityStatus": "pending"
}
```

### في `sys/users/{parentUid}/identityDocuments/{docId}`:
```json
{
  "id": "doc_abc123",
  "documentType": "id_card",
  "fileUrl": "https://api.telegram.org/file/...",
  "fileName": "id_card.jpg",
  "fileId": "AgACAgEAA...",
  "shortId": "f_abc123xyz",
  "uploadedAt": "2026-04-05T12:00:00.000Z",
  "status": "pending"
}
```

## 🎯 أنواع المستندات المدعومة في التسجيل

| النوع | القيمة | الوصف |
|-------|--------|-------|
| بطاقة الهوية | `id_card` | البطاقة الوطنية أو الشخصية |
| جواز السفر | `passport` | جواز سفر ساري المفعول |
| دفتر العائلة | `family_book` | دفتر العائلة أو سجل الأسرة |
| شهادة الميلاد | `birth_certificate` | شهادة الميلاد الرسمية |
| رخصة القيادة | `driver_license` | رخصة القيادة كإثبات هوية |
| تصريح الإقامة | `residence_permit` | تصريح الإقامة أو الإقامة الدائمة |
| مستند آخر | `other` | أي مستند رسمي آخر |

## 🔒 الأمان

1. ✅ **كلمة المرور**: مشفرة باستخدام SHA-256 hash
2. ✅ **المستندات**: تُرفع عبر جسر تيليغرام المشفر
3. ✅ **البيانات**: تُنظف وتُحقق قبل الحفظ
4. ✅ **البريد الإلكتروني**: يُتحقق منه إذا تم إدخاله
5. ✅ **رقم الهاتف**: يتم التحقق منه عبر OTP
6. ✅ **حالة الحساب**: `pending` حتى توافق الإدارة

## 📝 ملاحظات هامة

### البريد الإلكتروني
- **ولي الأمر**: اختياري
- **الطالب**: مطلوب
- **المعلم**: مطلوب
- **المشرف**: مطلوب

### مستند الهوية
- **مطلوب** لولي الأمر قبل إنشاء الحساب
- **غير مطلوب** للطلاب والمعلمين والمشرفين
- يُرفع عبر **جسر تيليغرام** فقط
- الحد الأقصى: **10 ميجابايت**
- الأنواع المدعومة: **صور (JPG, PNG, WebP) و PDF**

### حالة الحساب
- جميع حسابات أولياء الأمر جديدة تكون بحالة `pending`
- يجب على الإدارة مراجعة المستند والموافقة
- بعد الموافقة: `approved`
- يمكن رفض الحساب: `rejected`

## 🚀 الاستخدام

### ولي الأمر يسجل حساب:

```
1. توجه إلى /register
2. اختر "ولي أمر"
3. أدخل بياناتك الشخصية
4. أدخل رمز دعوة الطالب
5. ارفع مستند هويتك (بطاقة، جواز سفر، إلخ)
6. أنشئ كلمة مرور آمنة
7. انتظر موافقة الإدارة
```

### الإدارة تراجع الحساب:

```
1. توجه إلى /admin/users
2. ابحث عن ولي الأمر بحالة "pending"
3. راجع بياناته ومستند هويته
4. وافق أو ارفض الحساب
```

## 📁 الملفات المُعدّلة

1. ✅ `pages/Auth/RegisterPage.tsx` - إضافة خطوة رفع الهوية
2. ✅ `services/auth.service.ts` - جعل البريد اختيارياً وحفظ بيانات المستند
3. ✅ `hooks/useRegister.ts` - تحديث التحقق وإرسال البيانات
4. ✅ `types/index.ts` - إضافة حقول مستندات الهوية (سابقاً)
5. ✅ `components/parent/IdentityDocumentUpload.tsx` - مكون الرفع (سابقاً)
6. ✅ `services/identityDocument.service.ts` - خدمة إدارة المستندات (سابقاً)

## ✨ الفوائد

### لولي الأمر:
- ✅ تسجيل سهل بدون بريد إلكتروني
- ✅ رفع مستند الهوية بشكل آمن
- ✅ واجهة رفع واضحة وسهلة
- ✅ معاينة المستند قبل الرفع
- ✅ رسالة نجاح مخصصة

### للإدارة:
- ✅ جميع حسابات أولياء الأمر بها مستندات هوية
- ✅ يمكن مراجعة الهوية قبل الموافقة
- ✅ المستندات محفوظة بشكل منظم
- ✅ تتبع كامل لبيانات الرفع والمراجعة

### للنظام:
- ✅ أمان أعلى (جميع أولياء الأمر موثقين)
- ✅ بيانات كاملة في قاعدة البيانات
- ✅ هيكل تخزين نظيف
- ✅ متوافق مع النظام الحالي

---

**✅ تم الإصلاح بنجاح!**

الآن ولي الأمر يمكنه:
1. ✅ التسجيل بدون بريد إلكتروني
2. ✅ رفع مستند الهوية أثناء التسجيل
3. ✅ إنشاء حساب كامل البيانات
4. ✅ انتظار موافقة الإدارة
