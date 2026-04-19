# 🔄 Database Restructuring - Migration Progress

## ✅ Files Updated (Core Services)

### Services
- [x] `services/auth.service.ts` - Updated to use `SYS.USERS` and `SYS.CONFIG.TEACHER_CLASS_REQUESTS`
- [x] `services/telegram.service.ts` - Updated to use `SYS.SYSTEM.MASKING_ACTIVE` and `SYS.META_DATA`
- [x] `services/cashipay.service.ts` - Updated to use `SYS.MAINTENANCE.CASHIPAY_LOGS`

### Context
- [x] `context/AuthContext.tsx` - Updated to use `SYS.user(uid)`
- [x] `context/BrandingContext.tsx` - Updated to use `SYS.SYSTEM.BRANDING`

### Utils
- [x] `utils/activityLogger.ts` - Updated to use `SYS.MAINTENANCE.ACTIVITIES`

### Hooks
- [x] `hooks/useRegister.ts` - Updated to use `SYS.SYSTEM.ALLOW_REGISTRATION`

### API
- [x] `api/media.ts` - Updated to use new paths in Firebase URL

### Constants
- [x] `constants/dbPaths.ts` - **NEW FILE** - All path constants defined here

### Scripts
- [x] `scripts/migrate-database.ts` - **NEW FILE** - Migration script for Firebase data

### Documentation
- [x] `DATABASE_RESTRUCTURE.md` - **NEW FILE** - Complete restructuring documentation

---

## 📋 Remaining Files to Update

### Pages (High Priority - User Facing)
These files contain database references that need to be updated:

#### Admin Pages
- `pages/Admin/AdminDashboard.tsx` - Uses: classes, users, support_tickets
- `pages/Admin/Management/ClassesManagement.tsx` - Uses: classes, curricula
- `pages/Admin/Management/StudentApprovalManagement.tsx` - Uses: users, classes, notifications
- `pages/Admin/Management/TeacherRequests.tsx` - Uses: teacher_class_requests
- `pages/Admin/Management/ActivityLogs.tsx` - Uses: activities
- `pages/Admin/Management/SupportMessages.tsx` - Uses: support_tickets
- `pages/Admin/Management/Announcements.tsx` - Uses: announcements
- `pages/Admin/Management/GlobalSubjects.tsx` - Uses: global_subjects
- `pages/Admin/Settings/PlatformSettings.tsx` - Uses: settings, branding, classes, banks
- `pages/Admin/Settings/AcademicSettings.tsx` - Uses: academic_settings
- `pages/Admin/Management/SliderManagement.tsx` - Uses: slider
- `pages/Admin/Management/UsersManagement.tsx` - Uses: users
- `pages/Admin/Management/TelegramBridgePage.tsx` - Uses: settings
- `pages/Admin/Management/CashipayFullTest.tsx` - Uses: cashipay_logs, payments
- `pages/Admin/Actions/*.tsx` - Various forms

#### Student Pages
- `pages/Student/StudentDashboard.tsx` - Uses: branding, settings, academic_settings, announcements, global_subjects, slider, classes, timetable, grades, assignments, submissions
- `pages/Schedule/SchedulePage.tsx` - Uses: classes, users, timetable, timetable_settings

#### Teacher Pages
- `pages/Teacher/TeacherDashboard.tsx` - Uses: academic_settings, slider, announcements, branding, submissions, classes, teacher_class_requests, global_subjects, users, attendance, assignments, grades, announcements_subject, live_links
- `pages/Teacher/PendingApproval.tsx` - Uses: users, support_tickets

#### Common Pages
- `pages/Common/ChatPage.tsx` - Uses: users, chats, classes, messages
- `pages/Common/ClassDetails.tsx` - Uses: classes
- `pages/Common/LegalPage.tsx` - Uses: settings
- `pages/Common/SupportPage.tsx` - Uses: support_tickets
- `pages/Common/Maintenance.tsx` - Uses: settings

#### Financial Pages
- `pages/Financial/FinancialManagement.tsx` - Uses: messages, chats, payments, users, classes, settings, banks
- `pages/Financial/CashipayPayment.tsx` - Uses: cashipay_logs

#### Parent Pages
- `pages/Parent/ParentDashboard.tsx` - Uses: users, attendance, grades, assignments, payments

#### Academic Pages
- `pages/Academic/AcademicCurriculum.tsx` - Uses: curricula, classes, global_subjects, users

#### Auth Pages
- `pages/Auth/Login.tsx` - Uses: users
- `pages/Auth/ProfilePage.tsx` - Uses: users
- `pages/Auth/AccountPage.tsx` - Uses: users
- `pages/Auth/LegalConsent.tsx` - Uses: settings

#### Dashboard
- `pages/Dashboard/Dashboard.tsx` - Uses: database root

#### Other
- `TelegramBridge.tsx` - Uses: settings
- `copy/*.tsx` - Legacy copies (may not be in use)

---

## 📊 Statistics

| Category | Total Files | Updated | Remaining |
|----------|-------------|---------|-----------|
| Services | 4 | 4 | 0 |
| Context | 2 | 2 | 0 |
| Utils | 1 | 1 | 0 |
| Hooks | 2 | 1 | 1 |
| API | 1 | 1 | 0 |
| Pages | ~35 | 0 | ~35 |
| **Total** | **~45** | **9** | **~36** |

| Database References | Count |
|---------------------|-------|
| Total references in codebase | ~220 |
| Updated in core files | ~25 |
| Remaining in pages | ~195 |

---

## 🎯 Next Steps

### Phase 1: Core Infrastructure (✅ COMPLETE)
- [x] Create path constants file
- [x] Update authentication services
- [x] Update context providers
- [x] Update utility functions
- [x] Create migration script
- [x] Create documentation

### Phase 2: Page Updates (IN PROGRESS)
Priority order:
1. **Login/Auth** - Critical for user access
2. **Admin Dashboard** - Main management interface
3. **Student Dashboard** - Primary user experience
4. **Teacher Dashboard** - Teacher features
5. **Financial** - Payment processing
6. **Communication** - Chat and notifications
7. **Academic** - Educational content
8. **Settings** - Configuration pages

### Phase 3: Testing
- [ ] Test user registration flow
- [ ] Test login flow
- [ ] Test admin features
- [ ] Test student features
- [ ] Test teacher features
- [ ] Test financial features
- [ ] Test communication features

### Phase 4: Data Migration
- [ ] Backup production database
- [ ] Run migration script in staging
- [ ] Verify all data migrated correctly
- [ ] Run migration script in production
- [ ] Monitor for errors

### Phase 5: Cleanup
- [ ] Remove old path references
- [ ] Update documentation
- [ ] Remove legacy code
- [ ] Optimize bundle size

---

## 🔧 Quick Reference

### Path Mapping Examples

```typescript
// Old way (❌ Don't use)
ref(db, 'EduSafa_Learning/database/users')
ref(db, `EduSafa_Learning/database/users/${uid}`)
ref(db, 'EduSafa_Learning/database/settings/branding')

// New way (✅ Use this)
import { SYS, EDU, COMM } from '../constants/dbPaths';

ref(db, SYS.USERS)
ref(db, SYS.user(uid))
ref(db, SYS.SYSTEM.BRANDING)
```

### Common Paths

```typescript
// Users
SYS.USERS                          // sys/users
SYS.user(uid)                      // sys/users/{uid}

// Classes
EDU.SCH.CLASSES                    // edu/sch/classes
EDU.SCH.class(classId)             // edu/sch/classes/{classId}

// Settings
SYS.SYSTEM.SETTINGS                // sys/system/settings
SYS.SYSTEM.BRANDING                // sys/system/settings/branding
SYS.SYSTEM.MASKING_ACTIVE          // sys/system/settings/maskingActive

// Communication
COMM.CHATS                         // comm/chats
COMM.MESSAGES                      // comm/messages
COMM.NOTIFICATIONS                 // comm/notifications

// Education
EDU.COURSES                        // edu/courses (was: global_subjects)
EDU.ASSIGNMENTS                    // edu/assignments
EDU.GRADES                         // edu/grades
EDU.ATTENDANCE                     // edu/attendance
```

---

## 📝 Notes

1. **Backward Compatibility**: The old paths will continue to work until the data is actually migrated in Firebase
2. **Gradual Rollout**: Updates are being done gradually to minimize risk
3. **Testing Required**: Each updated file needs thorough testing
4. **Rollback Plan**: Keep the old code until migration is verified

---

**Last Updated**: 2026-04-01  
**Status**: Phase 1 Complete, Phase 2 In Progress
