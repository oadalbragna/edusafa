# 🚀 دليل النشر - EduSafa Learning v2.0.0

## ✅ Checklist قبل النشر

### 1. إعدادات البيئة (REQUIRED)

- [ ] نسخ `.env.example` إلى `.env.production`
- [ ] ملء جميع مفاتيح Firebase من Firebase Console
- [ ] تعيين `VITE_APP_ENV=production`
- [ ] تعيين `VITE_APP_BASE_URL` إلى رابط الإنتاج الفعلي
- [ ] تعيين `VITE_SECURITY_STRICT=true`

### 2. Firebase Console Configuration

#### Authentication
- [ ] تفعيل Email/Password في Firebase Authentication
- [ ] إعداد Firebase Security Rules للـ Database

#### Realtime Database Rules
```json
{
  "rules": {
    "sys": {
      "users": {
        "$uid": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "auth != null && (auth.uid == $uid || root.child('sys/users/' + auth.uid + '/role').val() == 'admin')"
        }
      },
      "system": {
        ".read": "auth != null",
        ".write": "auth != null && root.child('sys/users/' + auth.uid + '/role').val() in ['admin', 'super_admin']"
      }
    },
    "edu": {
      "sch": {
        "classes": {
          "$classId": {
            ".read": "auth != null",
            ".write": "auth != null && root.child('sys/users/' + auth.uid + '/role').val() in ['admin', 'super_admin']"
          }
        }
      }
    },
    "comm": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

#### Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 3. بناء الإنتاج

```bash
# تثبيت الاعتماديات
npm install

# فحص TypeScript
npm run type-check

# تشغيل الاختبارات
npm run test:run

# بناء الإنتاج
npm run build:prod

# معاينة البناء
npm run preview
```

### 4. Firebase Hosting Deployment

```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login

# تهيئة المشروع (مرة واحدة)
firebase init hosting

# نشر
firebase deploy --only hosting
```

### 5. التحقق بعد النشر

- [ ] فتح رابط الإنتاج والتأكد من عمل SplashScreen
- [ ] تسجيل دخول مستخدم تجريبي
- [ ] اختبار لوحة تحكم المعلم
- [ ] اختبار لوحة تحكم الطالب
- [ ] اختبار لوحة تحكم المدير
- [ ] التحقق من عمل Firebase Security Rules
- [ ] التحقق من عدم وجود أخطاء في Console

## 🔧 Troubleshooting

### خطأ: "Missing Firebase configuration"
- تأكد من أن `.env.production` يحتوي على جميع مفاتيح `VITE_FIREBASE_*`

### خطأ: "403 Permission Denied"
- تحقق من Firebase Security Rules
- تأكد من أن المستخدم مسجل الدخول

### خطأ: "Build failed"
- تشغيل `npm run type-check` لمعرفة أخطاء TypeScript
- تشغيل `npm run lint` لمعرفة أخطاء ESLint

## 📊 Performance Checklist

- [ ] تمكين Gzip/Brotli compression على الخادم
- [ ] إعداد CDN للملفات الثابتة
- [ ] تمكين HTTP/2
- [ ] إعداد Caching headers المناسبة
- [ ] تقليل حجم صور الـ Slider

## 🔒 Security Checklist

- [ ] Firebase Security Rules مفعلة
- [ ] لا توجد مفاتيح Firebase في الكود
- [ ] CORS headers محددة
- [ ] Content-Security-Policy headers محددة
- [ ] HTTPS مفعّل
