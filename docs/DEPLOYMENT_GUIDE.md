# 🚀 EduSafa Learning - Deployment Guide

**Version:** 2.0.0  
**Last Updated:** 2026-04-01  
**Status:** Production Ready

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup

#### Required Tools
- [ ] Node.js v18+ installed
- [ ] npm or pnpm package manager
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Git installed

#### Environment Variables
Create `.env` file in project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# App Configuration
VITE_APP_NAME=EduSafa Learning
VITE_APP_URL=https://your-domain.com
VITE_APP_ENV=production
```

### 2. Firebase Setup

#### 2.1 Install Firebase CLI
```bash
npm install -g firebase-tools
```

#### 2.2 Login to Firebase
```bash
firebase login
```

#### 2.3 Initialize Firebase Project
```bash
firebase init
```

Select:
- ✅ Database (Realtime Database)
- ✅ Hosting
- ✅ Storage

#### 2.4 Deploy Security Rules
```bash
# Deploy database rules
firebase deploy --only database:rules

# Deploy storage rules (create storage.rules first)
firebase deploy --only storage:rules
```

#### 2.5 Enable Firebase App Check (Recommended)
1. Go to Firebase Console → Project Settings → App Check
2. Register your app
3. Add reCAPTCHA v3 provider
4. Update `firebase.ts` with App Check configuration

```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true
});
```

### 3. Database Migration

#### 3.1 Backup Existing Data
```bash
# Export database to JSON
firebase database:get / > backup-$(date +%Y%m%d).json
```

#### 3.2 Run Migration Scripts
```bash
# Migrate old paths to new structure
npx ts-node scripts/migrate-database.ts

# Verify migration
firebase database:get /sys/users
firebase database:get /edu/sch/classes
```

#### 3.3 Migrate User Passwords
Create and run password migration script:

```typescript
// scripts/migrate-passwords.ts
import { hashPassword } from '../utils/security';
import { ref, get, update } from 'firebase/database';
import { db } from '../services/firebase';
import { SYS } from '../constants/dbPaths';

async function migratePasswords() {
  const usersRef = ref(db, SYS.USERS);
  const snapshot = await get(usersRef);
  
  if (!snapshot.exists()) return;
  
  const users = snapshot.val();
  const updates: any = {};
  
  Object.entries(users).forEach(([uid, user]: [string, any]) => {
    // Only migrate plain-text passwords (not already hashed)
    if (user.password && user.password.length !== 64) {
      updates[`${SYS.USERS}/${uid}/password`] = await hashPassword(user.password);
      updates[`${SYS.USERS}/${uid}/passwordMigrated`] = true;
      updates[`${SYS.USERS}/${uid}/migratedAt`] = new Date().toISOString();
    }
  });
  
  await update(ref(db), updates);
  console.log(`Migrated ${Object.keys(updates).length / 3} passwords`);
}

migratePasswords();
```

Run migration:
```bash
npx ts-node scripts/migrate-passwords.ts
```

### 4. Build & Test

#### 4.1 Install Dependencies
```bash
npm install
```

#### 4.2 Run Development Server
```bash
npm run dev
```

Test all features:
- [ ] Login with hashed password
- [ ] Register new user
- [ ] Admin dashboard
- [ ] Teacher dashboard
- [ ] Student dashboard
- [ ] File uploads
- [ ] Chat functionality
- [ ] Payment system

#### 4.3 Build Production Bundle
```bash
npm run build
```

Expected output:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js (vendor-react-[hash].js, vendor-firebase-[hash].js, etc.)
│   └── index-[hash].css
└── ...
```

#### 4.4 Preview Production Build
```bash
npm run preview
```

Test production build:
- [ ] All routes working
- [ ] No console errors
- [ ] Performance acceptable
- [ ] No security warnings

### 5. Deploy to Production

#### Option A: Firebase Hosting

##### 5.1 Configure firebase.json
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(png|jpg|jpeg|gif|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

##### 5.2 Deploy
```bash
firebase deploy --only hosting
```

#### Option B: Manual Deployment (VPS/Shared Hosting)

##### 5.1 Build
```bash
npm run build
```

##### 5.2 Upload to Server
```bash
# Using SCP
scp -r dist/* user@your-server:/var/www/edusafa/

# Or using FTP (use FileZilla or similar)
```

##### 5.3 Configure Web Server

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/edusafa;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SSL (use Let's Encrypt)
    # Run: certbot --nginx -d your-domain.com
}
```

**Apache Configuration:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/edusafa

    <Directory /var/www/edusafa>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript
    </IfModule>
</VirtualHost>
```

Create `.htaccess` in dist folder:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

### 6. Post-Deployment

#### 6.1 Verify Deployment
- [ ] Visit production URL
- [ ] Test login/logout
- [ ] Test registration
- [ ] Test all dashboards
- [ ] Test file uploads
- [ ] Test chat
- [ ] Test payments
- [ ] Check console for errors

#### 6.2 Performance Check
Run Lighthouse:
```bash
# Using Chrome DevTools
# Or using CLI
npm install -g lighthouse
lighthouse https://your-domain.com --view
```

Target scores:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90
- PWA: >80

#### 6.3 Security Check
- [ ] HTTPS enabled
- [ ] Security headers present
- [ ] No sensitive data in client code
- [ ] Firebase rules deployed
- [ ] App Check enabled

#### 6.4 Monitoring Setup

**Google Analytics:**
Already configured in `firebase.ts`. Verify tracking:
```bash
# Check analytics in Firebase Console
# Firebase Console → Analytics → Dashboard
```

**Error Tracking (Optional - Recommended):**
Install Sentry:
```bash
npm install @sentry/react @sentry/tracing
```

Configure in `main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
  environment: "production"
});
```

### 7. Rollback Plan

If deployment fails:

#### 7.1 Quick Rollback (Firebase Hosting)
```bash
# List previous deployments
firebase hosting:channel:list

# Rollback to previous
firebase hosting:rollback
```

#### 7.2 Manual Rollback
```bash
# Restore previous build
git checkout previous-tag
npm run build
firebase deploy --only hosting
```

#### 7.3 Database Rollback
```bash
# Restore from backup
firebase database:set / < backup-YYYYMMDD.json
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Fails
**Error:** `Module not found`
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Firebase Connection Issues
**Error:** `PERMISSION_DENIED`
```bash
# Check security rules
firebase database:rules:get

# Deploy rules again
firebase deploy --only database:rules
```

#### 3. Slow Performance
**Solution:**
```bash
# Analyze bundle
npm install -g webpack-bundle-analyzer
npm run build -- --analyze

# Check for large dependencies
```

#### 4. Login Not Working After Deployment
**Check:**
- Firebase rules allow reads
- Password migration completed
- Console for errors
- Network tab for failed requests

---

## 📊 Maintenance

### Daily Tasks
- [ ] Check error logs
- [ ] Monitor Firebase usage
- [ ] Review user feedback

### Weekly Tasks
- [ ] Security audit
- [ ] Performance check
- [ ] Backup database

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review analytics
- [ ] Plan improvements

---

## 📞 Support

### Emergency Contacts
- **Technical Lead:** [Contact Info]
- **DevOps:** [Contact Info]
- **On-Call:** [Contact Info]

### Resources
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

---

## ✅ Deployment Sign-off

| Task | Status | Completed By |
|------|--------|--------------|
| Environment Setup | ⬜ | |
| Firebase Configuration | ⬜ | |
| Security Rules Deployed | ⬜ | |
| Database Migration | ⬜ | |
| Password Migration | ⬜ | |
| Build Successful | ⬜ | |
| Testing Complete | ⬜ | |
| Production Deployed | ⬜ | |
| Monitoring Active | ⬜ | |
| Documentation Updated | ⬜ | |

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Version:** 2.0.0  
**Status:** ⬜ Success ⬜ Failed

---

**End of Deployment Guide**
