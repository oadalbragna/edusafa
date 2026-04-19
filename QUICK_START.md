# 🚀 Quick Start Guide
# دليل البدء السريع

## ✅ Application Status: READY ✓

The application has been successfully built and is ready to run!

---

## 🎯 Running the Application

### Option 1: Development Mode (Recommended for Testing)

```bash
cd /data/data/com.termux/files/home/projects/edu/3
npm run dev
```

**What happens:**
- Vite dev server starts on `http://localhost:5173` (or configured port)
- Hot module replacement enabled (changes reflect instantly)
- Console shows server URL
- Open browser and navigate to the URL

### Option 2: Production Build & Preview

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

**What happens:**
- Creates optimized `dist/` folder
- Preview server starts on `http://localhost:4173`
- Shows production-like behavior

---

## 📋 First-Time Setup

### 1. Install Dependencies (if not done)
```bash
npm install
```

### 2. Configure Environment (Optional)
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env
```

**Required Firebase variables:**
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Start the App
```bash
npm run dev
```

---

## 🧪 Testing the Application

### Without Firebase (Basic Testing)
The app will run without Firebase configuration, but:
- ✅ UI/UX testing works
- ✅ Navigation works
- ✅ Forms and validation work
- ❌ Real-time features won't work
- ❌ Authentication won't persist

### With Firebase (Full Testing)
1. Set up Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Enable Storage
4. Copy config to `.env` file
5. Run the app

---

## 📱 Quick Test Flow

### 1. Open App
```
http://localhost:5173
```

### 2. Create Test Accounts

#### Create Student Account
1. Click "إنشاء حساب جديد" (Create Account)
2. Select role: طالب (Student)
3. Fill in:
   - First name: Test
   - Last name: Student
   - Education level: Primary/Middle/High
   - Class: Any available
4. Set password: `Test12345!`
5. Complete OTP (test code: `12345`)
6. Accept terms
7. Submit

#### Create Parent Account
1. Logout or open new incognito window
2. Create account
3. Select role: ولي أمر (Parent)
4. Fill in:
   - Full name: Test Parent
   - Email: parent@test.com
   - Phone: +1234567890
5. Set password: `Test12345!`
6. Submit

#### Create Admin Account
1. Use existing admin credentials OR
2. Manually create in Firebase with role: `admin`

### 3. Test Parent Linking

**As Student:**
1. Login as student
2. Go to Settings (gear icon)
3. Click "ربط ولي الأمر" (Parent Linking) tab
4. Click "إنشاء رمز دعوة" (Generate Code)
5. Copy the 8-character code

**As Parent:**
1. Login as parent
2. Navigate to: `http://localhost:5173/parent-accept`
3. Paste the invite code
4. Click "التحقق من الرمز" (Verify Code)
5. Confirm student info
6. Click "إرسال الطلب" (Submit Request)

**As Student:**
1. Go back to Settings → Parent Linking
2. See pending request
3. Click "موافقة" (Approve)

**As Parent:**
1. Return to `/parent-accept`
2. Upload interface appears
3. Select document type
4. Upload a test image (JPG/PNG < 5MB)
5. Click "رفع الوثيقة" (Upload Document)

**As Student:**
1. See "وثائق بحاجة لمراجعتك" section
2. Click "مراجعة الوثيقة" (Review Document)
3. View document
4. Click "اعتماد الوثيقة" (Approve Document)

**As Admin:**
1. Login as admin
2. Go to `/admin/parent-approvals`
3. See request in list
4. Click "مراجعة الوثيقة" (Review Document)
5. Click "اعتماد" (Approve)

**As Parent:**
1. Dashboard now shows linked student
2. Can view student's info, grades, etc.

---

## 🎨 UI/UX Quick Check

### Visual Elements to Verify
- [ ] RTL layout (Arabic text right-aligned)
- [ ] Branding colors and logo
- [ ] Toast notifications appear
- [ ] Loading spinners show
- [ ] Error messages display
- [ ] Forms validate input
- [ ] Buttons have hover effects
- [ ] Modals open/close correctly
- [ ] Navigation sidebar works

### Responsive Design
Test on different screen sizes:
- [ ] Mobile (320px - 480px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1280px+)

---

## 🔍 Common Pages to Test

| URL | Description | Access |
|-----|-------------|--------|
| `/login` | Login page | Public |
| `/register` | Registration page | Public |
| `/student` | Student dashboard | Student only |
| `/parent` | Parent dashboard | Parent only |
| `/parent-accept` | Parent acceptance | Parent only |
| `/admin` | Admin dashboard | Admin only |
| `/admin/parent-approvals` | Parent approvals | Admin only |
| `/profile` | User profile | All logged in |
| `/chat` | Chat page | All logged in |
| `/schedule` | Schedule page | All logged in |

---

## 🐛 If Something Goes Wrong

### App Won't Start
```bash
# Check Node version (need 16+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Blank Page / White Screen
- Check browser console for errors (F12)
- Verify `.env` file exists
- Check if Firebase config is valid
- Try hard refresh (Ctrl+Shift+R)

### Routing Issues
- Ensure you're using correct role for route
- Check if user is authenticated
- Look at ProtectedRoute guards in code

### Firebase Errors
```
Error: Firebase: Error (auth/invalid-api-key)
→ Check VITE_FIREBASE_API_KEY in .env

Error: Firebase: Index not defined
→ Need to create indexes in Firebase console

Error: Permission denied
→ Check Firebase database rules
```

---

## 📊 Performance Tips

### For Development
- Use Chrome DevTools Performance tab
- Enable "Disable cache" in Network tab
- Use React DevTools for component inspection

### For Production
- Run `npm run build` for optimized bundle
- Enable gzip compression on server
- Use CDN for static assets
- Implement service worker caching

---

## 🎓 Learning Resources

### Understanding the Codebase
1. **Routing**: Check `App.tsx` for all routes
2. **Authentication**: See `context/AuthContext.tsx`
3. **Firebase**: See `services/firebase.ts`
4. **Types**: See `types/index.ts`
5. **Database Paths**: See `constants/dbPaths.ts`

### Key Concepts
- **React Router v6**: Route guards and navigation
- **Firebase RTDB**: Real-time data synchronization
- **Context API**: Global state management
- **Lazy Loading**: Code splitting for performance
- **TypeScript**: Type safety throughout app

---

## 📞 Support

If you encounter issues:

1. **Check Documentation:**
   - `TESTING_GUIDE.md` - Complete testing checklist
   - `PARENT_GUARDIAN_PROOF_SYSTEM.md` - Parent linking docs
   - `README.md` - Project overview

2. **Check Logs:**
   - Browser console (F12)
   - Terminal output
   - Firebase console logs

3. **Debug Mode:**
   ```bash
   # Run with verbose logging
   DEBUG=true npm run dev
   ```

---

## ✅ Success Indicators

You'll know the app is working when:

✅ Login page displays with Arabic RTL layout  
✅ Can create accounts for different roles  
✅ Role-based dashboards load correctly  
✅ Navigation between pages works  
✅ Parent can enter invite code  
✅ Student can approve parent requests  
✅ Parent can upload proof documents  
✅ Student can review proofs  
✅ Admin can approve/reject requests  
✅ Toast notifications appear on actions  
✅ No console errors on page load  

---

## 🎉 Next Steps

After verifying basic functionality:

1. **Customize Branding**
   - Update logo and colors
   - Change platform name
   - Add custom terms/privacy

2. **Configure Firebase**
   - Set up production project
   - Configure database rules
   - Enable authentication
   - Set up storage buckets

3. **Deploy to Production**
   - Build optimized: `npm run build`
   - Deploy to hosting (Vercel, Netlify, Firebase Hosting)
   - Configure custom domain
   - Enable SSL/HTTPS

4. **Monitor & Maintain**
   - Set up error tracking (Sentry)
   - Monitor Firebase usage
   - Regular backups
   - Update dependencies

---

**Ready to launch?** 🚀

```bash
npm run dev
```

Then open your browser and start testing!

---

**Status**: ✅ READY  
**Build**: ✅ SUCCESSFUL  
**Last Updated**: April 5, 2026
