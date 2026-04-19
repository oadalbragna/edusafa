# 📖 EduSafa Learning - Developer Quick Reference

**Version:** 2.0.0  
**Last Updated:** 2026-04-01

---

## 🚀 Quick Start

### 1. Setup Development Environment
```bash
# Clone repository
git clone <repository-url>
cd ed4-1

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Project Structure
```
ed4-1/
├── components/          # Reusable UI components
│   ├── common/         # Shared components (Loading, Modal, etc.)
│   ├── layout/         # Layout components (Layout, Sidebar, etc.)
│   ├── auth/           # Authentication components
│   └── admin/          # Admin-specific components
├── pages/              # Page components
│   ├── Admin/          # Admin pages
│   ├── Teacher/        # Teacher pages
│   ├── Student/        # Student pages
│   ├── Parent/         # Parent pages
│   ├── Auth/           # Auth pages
│   └── Common/         # Shared pages
├── services/           # Business logic
│   ├── auth.service.ts
│   ├── cache.service.ts
│   └── firebase.ts
├── hooks/              # Custom React hooks
│   ├── useData.ts
│   ├── useLogin.ts
│   └── useRegister.ts
├── context/            # React Context providers
│   ├── AuthContext.tsx
│   └── BrandingContext.tsx
├── utils/              # Utility functions
│   ├── security.ts
│   ├── errorHandler.ts
│   └── cn.ts
├── constants/          # Constants
│   └── dbPaths.ts
├── types/              # TypeScript types
│   └── index.ts
└── App.tsx            # Main app component
```

---

## 🔐 Security Utilities

### Password Hashing
```typescript
import { hashPassword, verifyPassword, validatePasswordStrength } from '@utils/security';

// Hash password
const hashed = await hashPassword('mySecurePassword123!');

// Verify password
const isValid = await verifyPassword('mySecurePassword123!', hashed);

// Validate password strength
const result = validatePasswordStrength('weak');
// { valid: false, errors: [...], strength: 'weak' }
```

### Input Validation
```typescript
import { 
  validateEmail, 
  validateYemenPhone, 
  sanitizeHTML,
  validateRequired,
  validateFileType,
  validateFileSize
} from '@utils/security';

// Validate email
const isValidEmail = validateEmail('user@example.com');

// Sanitize HTML (prevent XSS)
const clean = sanitizeHTML('<script>alert("xss")</script>');

// Validate file
const isValidFile = validateFileType(file, ['image/jpeg', 'image/png']);
const isValidSize = validateFileSize(file, 5); // 5MB max
```

### Rate Limiting
```typescript
import { RateLimiter } from '@utils/security';

const limiter = new RateLimiter(5, 60000); // 5 attempts per minute

const result = limiter.check('user-id');
if (!result.allowed) {
  alert(`Try again in ${Math.ceil(result.resetIn / 1000)} seconds`);
}
```

---

## 📡 Data Fetching

### Using useData Hook
```typescript
import { useData } from '@hooks/useData';

// Basic usage
const { data, loading, error, refresh } = useData({
  path: 'sys/users',
  enableCache: true,
  enableRealtime: true
});

// With transformation
const { data: users } = useData({
  path: 'sys/users',
  transform: (data) => Object.values(data),
  enableCache: true
});

// Without realtime (one-time fetch)
const { data: logs } = useData({
  path: 'sys/maintenance/activities',
  enableRealtime: false,
  staleTime: 60000
});
```

### Specialized Hooks
```typescript
import {
  useUsers,
  useClasses,
  useAnnouncements,
  useSystemSettings,
  useTeacherRequests,
  useStudentApprovals,
  useFinancialData,
  useActivityLogs,
  useSupportMessages,
  useSlider,
  useGlobalSubjects
} from '@hooks/useData';

// Example usage
function AdminDashboard() {
  const { data: users, loading } = useUsers();
  const { data: classes } = useClasses();
  const { data: announcements } = useAnnouncements('admin');
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      <h1>Users: {users.length}</h1>
      <h1>Classes: {classes.length}</h1>
    </div>
  );
}
```

### Multiple Data Fetching
```typescript
import { useMultipleData } from '@hooks/useData';

function Dashboard() {
  const { data, loading } = useMultipleData({
    users: 'sys/users',
    classes: 'edu/sch/classes',
    announcements: 'sys/announcements'
  });
  
  // data.users, data.classes, data.announcements
}
```

---

## 🎨 UI Components

### Loading States
```typescript
import { 
  LoadingSpinner, 
  LoadingSkeleton, 
  PageLoader, 
  InlineLoader 
} from '@components/common/LoadingSpinner';

// Simple spinner
<LoadingSpinner size="md" />

// With text
<LoadingSpinner size="lg" text="جاري التحميل..." />

// Full screen
<LoadingSpinner fullScreen text="جاري تهيئة المنصة..." />

// Skeleton loader
<LoadingSkeleton type="card" count={3} />
<LoadingSkeleton type="list" count={5} />
<LoadingSkeleton type="table" count={3} />

// Page loader
<PageLoader message="جاري تحميل البيانات..." />

// Inline loader
<InlineLoader text="جاري الحفظ..." />
```

### Empty States
```typescript
import { 
  EmptyState,
  NoDataEmptyState,
  NoResultsEmptyState,
  NoPermissionsEmptyState,
  NoNotificationsEmptyState,
  NoMessagesEmptyState
} from '@components/common/EmptyState';

// Generic empty state
<EmptyState
  icon={Users}
  title="لا يوجد طلاب"
  description="لم يتم إضافة أي طلاب بعد"
  actionLabel="إضافة طالب"
  onAction={() => navigate('/admin/add-student')}
/>

// Pre-configured states
<NoDataEmptyState onRefresh={() => refresh()} />
<NoResultsEmptyState onClear={() => setSearch('')} />
<NoPermissionsEmptyState />
<NoNotificationsEmptyState />
<NoMessagesEmptyState />
```

---

## 🔀 Database Paths

### Using Constants
```typescript
import { SYS, EDU, COMM } from '@constants/dbPaths';

// Users
SYS.USERS              // 'sys/users'
SYS.user(uid)          // 'sys/users/{uid}'
SYS.userStatus(uid)    // 'sys/users/{uid}/status'

// System
SYS.SYSTEM.SETTINGS    // 'sys/system/settings'
SYS.SYSTEM.BRANDING    // 'sys/system/settings/branding'
SYS.SLIDER             // 'sys/system/slider'

// Education
EDU.SCH.CLASSES        // 'edu/sch/classes'
EDU.SCH.class(classId) // 'edu/sch/classes/{classId}'
EDU.COURSES            // 'edu/courses'

// Communication
COMM.CHATS             // 'comm/chats'
COMM.MESSAGES          // 'comm/messages'
```

---

## 🧩 Context Usage

### Auth Context
```typescript
import { useAuth } from '@context/AuthContext';

function MyComponent() {
  const { profile, user, loading, logout } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      <p>Welcome, {profile?.fullName}</p>
      <p>Role: {profile?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Branding Context
```typescript
import { useBranding } from '@context/BrandingContext';

function MyComponent() {
  const { branding, loading } = useBranding();
  
  return (
    <div style={{ color: branding.primaryColor }}>
      <img src={branding.logoUrl} alt="Logo" />
    </div>
  );
}
```

---

## 🛠️ Error Handling

### Using Error Handler
```typescript
import { errorHandler, ErrorType, withErrorHandling } from '@utils/errorHandler';

// Manual error handling
try {
  await someOperation();
} catch (error) {
  const appError = errorHandler.handle(error, { context: 'operation' });
  alert(errorHandler.getUserMessage(appError));
}

// With wrapper
const result = await withErrorHandling(
  () => fetchSomeData(),
  defaultValue,
  { operation: 'fetch' }
);

// Add error listener
useEffect(() => {
  const unsubscribe = errorHandler.addListener((error) => {
    console.error('Global error:', error);
    // Show notification, send to Sentry, etc.
  });
  
  return unsubscribe;
}, []);
```

### Firebase Error Handling
```typescript
import { handleFirebaseError } from '@utils/errorHandler';

try {
  const snapshot = await get(ref(db, 'some/path'));
} catch (error) {
  const appError = handleFirebaseError(error, 'fetching data');
  alert(appError.message);
}
```

---

## 📝 Type Definitions

### Common Types
```typescript
import type { 
  UserProfile, 
  UserRole, 
  UserPermissions,
  Payment,
  Class,
  Subject,
  Message,
  Chat
} from '@types/index';

// Example usage
const user: UserProfile = {
  uid: 'u_123',
  email: 'user@example.com',
  role: 'student',
  firstName: 'Ahmed',
  status: 'approved',
  createdAt: new Date().toISOString()
};
```

---

## 🧪 Testing

### Running Tests (When implemented)
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/utils/security.test.ts

# Watch mode
npm test -- --watch
```

### Writing Tests
```typescript
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@utils/security';

describe('Security Utilities', () => {
  it('should hash password', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toHaveLength(64);
  });
  
  it('should verify password', async () => {
    const hash = await hashPassword('test123');
    const isValid = await verifyPassword('test123', hash);
    expect(isValid).toBe(true);
  });
});
```

---

## 🚦 Commands Reference

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test            # Run tests
```

### Firebase
```bash
firebase login                    # Login to Firebase
firebase init                     # Initialize Firebase project
firebase deploy                   # Deploy everything
firebase deploy --only hosting    # Deploy hosting only
firebase deploy --only database   # Deploy database rules
firebase deploy --only storage    # Deploy storage rules
```

---

## 🐛 Debugging

### Enable Debug Mode
```typescript
// In firebase.ts
import { setLogLevel } from 'firebase/database';
setLogLevel('debug');
```

### Check Cache
```typescript
import { cache } from '@services/cache.service';

// View cache stats
console.log(cache.getStats());

// Clear cache
cache.clear();
```

### Check Login Attempts
```javascript
// In browser console
console.log(localStorage.getItem('login_attempts'));

// Reset attempts
localStorage.removeItem('login_attempts');
```

---

## 📚 Additional Resources

- [COMPREHENSIVE_AUDIT_REPORT.md](./COMPREHENSIVE_AUDIT_REPORT.md) - Full audit report
- [IMPROVEMENT_IMPLEMENTATION_REPORT.md](./IMPROVEMENT_IMPLEMENTATION_REPORT.md) - Implementation details
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
- [DATABASE_RESTRUCTURE.md](./DATABASE_RESTRUCTURE.md) - Database structure
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Path reference

---

## 💡 Tips & Best Practices

### 1. Always Use Hooks for Data Fetching
```typescript
// ✅ Good
const { data: users } = useUsers();

// ❌ Bad
const [users, setUsers] = useState([]);
useEffect(() => {
  get(ref(db, SYS.USERS)).then(...);
}, []);
```

### 2. Use Cache for Better Performance
```typescript
// ✅ Good - with caching
const { data } = useData({ path: 'sys/users', enableCache: true });

// ❌ Bad - no caching
const [data, setData] = useState();
onValue(ref(db, 'sys/users'), (snap) => setData(snap.val()));
```

### 3. Handle Errors Properly
```typescript
// ✅ Good
try {
  await operation();
} catch (error) {
  errorHandler.handle(error, { context: 'operation' });
  alert(errorHandler.getUserMessage(error));
}

// ❌ Bad
try {
  await operation();
} catch (error) {
  console.error(error);
  alert('Error occurred');
}
```

### 4. Use Loading States
```typescript
// ✅ Good
if (loading) return <LoadingSpinner text="جاري التحميل..." />;
if (error) return <EmptyState title="حدث خطأ" description={error} />;
if (!data) return <NoDataEmptyState onRefresh={refresh} />;

// ❌ Bad
if (!data) return <div>Loading...</div>;
```

### 5. Sanitize User Input
```typescript
// ✅ Good
const cleanName = sanitizeHTML(userInput);

// ❌ Bad
const name = userInput; // XSS vulnerability
```

---

**Happy Coding! 🚀**
