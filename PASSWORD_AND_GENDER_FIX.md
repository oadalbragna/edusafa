# ✅ إصلاح مشاكل كلمة السر والجنس

## 🎯 المشاكل المحلولة

### 1. ❌ **مربع تأكيد كلمة السر لا يظهر**
**قبل:** كان هناك مربع واحد فقط لكلمة السر  
**الآن:** ✅ يظهر مربعين - كلمة السر + تأكيد كلمة السر

### 2. ❌ **اختيار الجنس غير موجود للطلاب والمشرفين**
**قبل:** لا يوجد خيار اختيار الجنس  
**الآن:** ✅ يظهر خيار اختيار الجنس (ذكر / أنثى) للطلاب والمشرفين

### 3. ❌ **مربع إدخال كلمة السر لا يظهر**
**قبل:** المشكلة كانت في الـ OTP الذي يمنع الوصول لخطوة كلمة السر  
**الآن:** ✅ كلمة السر تظهر بشكل صحيح بعد إزالة OTP

---

## 🔧 الإصلاحات المطبقة

### 1. ✅ `hooks/useRegister.ts`

#### إضافة حقل الجنس للـ formData:
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  gender: '' as 'male' | 'female' | ''  // ✅ جديد
});
```

#### تحديث validate() للتحقق من الجنس:
```typescript
const validate = () => {
  if (!formData.password) return 'كلمة المرور مطلوبة';
  if (formData.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';  // ✅ جديد
  if (formData.password !== formData.confirmPassword) return 'كلمات المرور غير متطابقة';

  if (userType === 'student') {
    // ... existing checks
    if (!formData.gender) return 'يرجى اختيار الجنس';  // ✅ جديد
  } else if (userType === 'admin') {
    // ... existing checks
    if (!formData.gender) return 'يرجى اختيار الجنس';  // ✅ جديد
  }
  
  return null;
};
```

### 2. ✅ `pages/Auth/RegisterPage.tsx`

#### إضافة state لإظهار/إخفاء تأكيد كلمة السر:
```typescript
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);  // ✅ جديد
```

#### إضافة تحقق من تطابق كلمتي السر في handleFinalSubmit:
```typescript
const handleFinalSubmit = async () => {
  // ... existing checks
  if (formData.password !== formData.confirmPassword) {
    setErrorBanner('كلمتا المرور غير متطابقتين');  // ✅ جديد
    return;
  }
};
```

#### إضافة تحقق في nextStep:
```typescript
if (step === 'password') {
  if (!formData.password) {
    setErrorBanner('يرجى إدخال كلمة المرور');
    return;
  }
  if (formData.password.length < 8) {
    setErrorBanner('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    setErrorBanner('كلمتا المرور غير متطابقتين');
    return;
  }
  if ((userType === 'student' || userType === 'admin') && !formData.gender) {
    setErrorBanner('يرجى اختيار الجنس');
    return;
  }
}
```

#### إضافة مربع تأكيد كلمة السر في UI:
```tsx
{/* Confirm Password Field */}
<div>
  <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
    <Lock className="w-4 h-4 text-green-500" /> تأكيد كلمة المرور
  </label>
  <div className="relative">
    <input
      type={showConfirmPassword ? 'text' : 'password'}
      name="confirmPassword"
      value={formData.confirmPassword}
      onChange={handleInputChange}
      className={`w-full px-5 py-4 bg-white border-2 rounded-2xl ... ${
        formData.confirmPassword && formData.confirmPassword !== formData.password
          ? 'border-red-300 ...'  // أحمر إذا غير متطابق
          : formData.confirmPassword && formData.confirmPassword === formData.password
          ? 'border-green-300 ...'  // أخضر إذا متطابق
          : 'border-slate-200 ...'  // عادي
      }`}
      dir="ltr"
      placeholder="••••••••"
      required
    />
    <button onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
      {showConfirmPassword ? <EyeOff /> : <Eye />}
    </button>
    {formData.confirmPassword && formData.confirmPassword === formData.password && (
      <CheckCircle className="w-5 h-5 text-green-500 ..." />  // ✓ علامة صح
    )}
  </div>
</div>
```

#### إضافة اختيار الجنس في UI:
```tsx
{/* Gender Selection - For Students and Admins */}
{(userType === 'student' || userType === 'admin') && (
  <div>
    <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2">
      <User className="w-4 h-4 text-purple-500" /> الجنس
    </label>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => handleInputChange({ target: { name: 'gender', value: 'male' } })}
        className={`py-4 rounded-2xl font-bold text-sm border-2 ... ${
          formData.gender === 'male'
            ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md'
            : 'border-slate-200 bg-white text-slate-500 ...'
        }`}
      >
        <User className="w-5 h-5" />
        ذكر
      </button>
      <button
        type="button"
        onClick={() => handleInputChange({ target: { name: 'gender', value: 'female' } })}
        className={`py-4 rounded-2xl font-bold text-sm border-2 ... ${
          formData.gender === 'female'
            ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-md'
            : 'border-slate-200 bg-white text-slate-500 ...'
        }`}
      >
        <User className="w-5 h-5" />
        أنثى
      </button>
    </div>
  </div>
)}
```

---

## 📊 مقارنة قبل وبعد

| العنصر | قبل الإصلاح | بعد الإصلاح |
|--------|-------------|-------------|
| **مربع كلمة السر** | مربع واحد فقط ❌ | مربعين (كلمة السر + تأكيد) ✅ |
| **إظهار/إخفاء كلمة السر** | يعمل جزئياً ❌ | يعمل بشكل كامل ✅ |
| **تأكيد كلمة السر** | غير موجود ❌ | موجود مع تطابق بصري ✅ |
| **اختيار الجنس** | غير موجود ❌ | موجود للطلاب والمشرفين ✅ |
| **التحقق من التطابق** | لا يوجد ❌ | تحقق مع علامة خضراء ✅ |
| **رسائل الخطأ** | عامة ❌ | واضحة ومحددة ✅ |

---

## 🎨 الميزات البصرية الجديدة

### 1. **تأكيد كلمة السر**
- 🔴 **حد أحمر** إذا كانت غير متطابقة
- 🟢 **حد أخضر** إذا كانت متطابقة
- ✓ **علامة صح خضراء** عند التطابق التام

### 2. **اختيار الجنس**
- 🔵 **زر أزرق** للذكر (عند الاختيار)
- 🩷 **زر وردي** للأنثى (عند الاختيار)
- ⚪ **زر أبيض** عند عدم الاختيار

---

## 🧪 اختبار السيناريوهات

### سيناريو 1: إنشاء حساب طالب
1. اختر نوع: طالب
2. املأ البيانات الشخصية
3. اختر المرحلة والفصل
4. **في خطوة كلمة السر:**
   - أدخل كلمة المرور (8 أحرف على الأقل)
   - ✅ **يظهر مربع تأكيد كلمة السر**
   - ✅ **يظهر اختيار الجنس (ذكر / أنثى)**
5. اضغط "إنشاء الحساب"

### سيناريو 2: إنشاء حساب مشرف
1. اختر نوع: مشرف
2. املأ البيانات الشخصية
3. **في خطوة كلمة السر:**
   - أدخل كلمة المرور
   - ✅ **يظهر مربع تأكيد كلمة السر**
   - ✅ **يظهر اختيار الجنس (ذكر / أنثى)**
4. اضغط "إنشاء الحساب"

### سيناريو 3: كلمات سر غير متطابقة
1. أدخل كلمة سر: `password123`
2. أدخل تأكيد: `password456`
3. ✅ **يظهر الحد باللون الأحمر**
4. ✅ **رسالة خطأ: "كلمتا المرور غير متطابقتين"**

### سيناريو 4: كلمات سر متطابقة
1. أدخل كلمة سر: `password123`
2. أدخل تأكيد: `password123`
3. ✅ **يظهر الحد باللون الأخضر**
4. ✅ **تظهر علامة صح خضراء**

### سيناريو 5: عدم اختيار الجنس
1. املأ كل البيانات بما فيها كلمة السر
2. ✅ **رسالة خطأ: "يرجى اختيار الجنس"**

---

## 📁 الملفات المعدلة

1. ✅ `hooks/useRegister.ts`
   - إضافة `gender` للـ formData
   - تحديث `validate()` للتحقق من الجنس
   - إضافة التحقق من طول كلمة السر

2. ✅ `pages/Auth/RegisterPage.tsx`
   - إضافة `showConfirmPassword` state
   - إضافة مربع تأكيد كلمة السر
   - إضافة اختيار الجنس للطلاب والمشرفين
   - إضافة تحقق في `nextStep()` و `handleFinalSubmit()`

---

## 🎯 النتيجة النهائية

**✅ جميع المشاكل تم إصلاحها!**

- ✓ يظهر مربع كلمة السر بشكل صحيح
- ✓ يظهر مربع تأكيد كلمة السر
- ✓ التحقق من تطابق كلمتي السر
- ✓ اختيار الجنس متاح للطلاب والمشرفين
- ✓ رسائل خطأ واضحة
- ✓ مؤشرات بصرية (أحمر/أخضر)
- ✓ الـ Build يعمل بدون أخطاء

---

**التاريخ:** 5 أبريل 2025  
**الحالة:** ✅ مكتمل  
**تم الاختبار:** ✅ نعم - Build ناجح
