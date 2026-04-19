# Parent-Student Linking System - Architecture Diagram

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STUDENT PROFILE PAGE                          │
│                          (/profile)                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  👥 دعوة ولي الأمر للربط مع الحساب                      │        │
│  │                                                          │        │
│  │  Current Code: ABC123XY  [📋 Copy]                       │        │
│  │                                                          │        │
│  │  [🔄 Regenerate]  [🔗 صفحة قبول ولي الأمر]              │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  أولياء الأمور المرتبطين (2)                            │        │
│  │                                                          │        │
│  │  👤 Father Name       father@email.com      ✅          │        │
│  │  👤 Mother Name       mother@email.com      ✅          │        │
│  └─────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Student shares code
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PARENT ACCEPTANCE PAGE                            │
│                         (/parent-accept)                             │
│                                                                      │
│  Step 1: Enter Code                                                  │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  رمز دعوة الطالب: [________]                             │        │
│  │                                                          │        │
│  │            [✓ التحقق من الرمز]                           │        │
│  └─────────────────────────────────────────────────────────┘        │
│                              │                                       │
│                              │ Validate Code                         │
│                              ▼                                       │
│  Step 2: Confirmation                                                │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  ✓ تم العثور على الطالب                                 │        │
│  │                                                          │        │
│  │  👤 Ahmad Mohammed        Email: parent@email.com       │        │
│  │                                                          │        │
│  │      [تراجع]        [تأكيد الربط →]                     │        │
│  └─────────────────────────────────────────────────────────┘        │
│                              │                                       │
│                              │ Confirm Linking                       │
│                              ▼                                       │
│  Step 3: Success                                                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                ✓ 🎉                                     │        │
│  │          تم الربط بنجاح!                                 │        │
│  │                                                          │        │
│  │  تم ربط حسابك بالطالب Ahmad Mohammed                    │        │
│  │                                                          │        │
│  │  ✓ متابعة الحضور    ✓ الاطلاع على الدرجات                │        │
│  │  ✓ متابعة الواجبات  ✓ التواصل مع المعلمين                │        │
│  │                                                          │        │
│  │         [👥 الذهاب للوحة التحكم]                         │        │
│  └─────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Navigate
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PARENT DASHBOARD                               │
│                          (/parent)                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  Ahmad Mohammed - الصف الخامس أ                         │        │
│  │                                                          │        │
│  │  📊 الحضور: 95%    📚 الدرجات    📝 الواجبات            │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
│  [Attendance Tab] [Grades Tab] [Assignments Tab] [Financial Tab]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Update Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  Code Generation                              │
│                                                               │
│  Student Profile (sys/users/{studentUid})                    │
│  ┌─────────────────────────────────────────────┐             │
│  │ parentInviteCode: "ABC123XY"                │             │
│  │ parentInviteCodes: [                        │             │
│  │   {                                         │             │
│  │     code: "ABC123XY",                       │             │
│  │     createdAt: "2026-04-03T10:00:00Z",     │             │
│  │     expiresAt: "2026-04-10T10:00:00Z",     │             │
│  │     status: "active"                        │             │
│  │   }                                         │             │
│  │ ]                                           │             │
│  └─────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘

                          ↓ Parent enters code

┌──────────────────────────────────────────────────────────────┐
│                   Linking Process                              │
│                                                               │
│  1. Validate Code → Find student with active code            │
│  2. Check Expiration → Verify code not expired               │
│  3. Check Duplicate → Ensure parent not already linked       │
│                                                               │
│  UPDATE Student Profile:                                      │
│  ┌─────────────────────────────────────────────┐             │
│  │ parentLinks: ["parent456", "parent789"]     │ ← NEW      │
│  │ parentInviteCodes: [                        │             │
│  │   {                                         │             │
│  │     code: "ABC123XY",                       │             │
│  │     status: "used",                         │ ← UPDATED  │
│  │     usedBy: "parent456",                    │ ← NEW      │
│  │     usedAt: "2026-04-03T15:30:00Z"         │ ← NEW      │
│  │   }                                         │             │
│  │ ]                                           │             │
│  │ parentUid: "parent456"          ← Legacy   │             │
│  │ parentEmail: "parent@email.com" ← Legacy   │             │
│  └─────────────────────────────────────────────┘             │
│                                                               │
│  UPDATE Parent Profile:                                       │
│  ┌─────────────────────────────────────────────┐             │
│  │ studentLink: "student123"       ← Legacy   │             │
│  │ studentLinks: ["student123"]    ← NEW      │             │
│  └─────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

```
App.tsx
  │
  ├─ ProtectedRoute (/profile)
  │    └─ Layout
  │         └─ ProfilePage ← Enhanced with Parent Invitation Section
  │              │
  │              └─ Uses: utils/parentInviteCodes.ts
  │                   ├─ generateParentInviteCode()
  │                   └─ getStudentParents()
  │
  ├─ ParentRoute (/parent-accept)
  │    └─ ParentAcceptancePage ← New standalone page
  │         │
  │         └─ Uses: utils/parentInviteCodes.ts
  │              ├─ validateParentInviteCode()
  │              └─ linkParentToStudent()
  │
  └─ ParentRoute (/parent)
       └─ Layout
            └─ ParentDashboard ← Enhanced empty state
                 │
                 └─ Links to: /parent-accept
```

---

## Utility Functions Architecture

```
utils/parentInviteCodes.ts
│
├─ generateInviteCode()
│   └─ Creates random 8-char alphanumeric code
│
├─ generateParentInviteCode(studentUid, validDays)
│   ├─ Fetches student profile
│   ├─ Expires old active codes
│   ├─ Creates new code with expiration
│   └─ Updates student profile
│
├─ validateParentInviteCode(code)
│   ├─ Searches all users for code
│   ├─ Checks expiration date
│   ├─ Verifies status is 'active'
│   └─ Returns student info if valid
│
├─ linkParentToStudent(parentUid, parentEmail, code)
│   ├─ Validates code
│   ├─ Checks for duplicate linking
│   ├─ Updates student: parentLinks array
│   ├─ Updates student: marks code as 'used'
│   ├─ Updates parent: studentLink(s)
│   └─ Returns success status
│
├─ getStudentParents(studentUid)
│   ├─ Fetches student's parentLinks
│   ├─ Retrieves parent details
│   └─ Returns parent array
│
└─ revokeParentInviteCode(studentUid, code)
    ├─ Finds code in history
    ├─ Marks as 'expired'
    └─ Clears parentInviteCode if active
```

---

## User Permissions Matrix

```
┌─────────────────────────────────────────────────────────────┐
│ Action                  │ Student │ Parent  │ Teacher │ Admin│
├─────────────────────────────────────────────────────────────┤
│ Generate invite code    │    ✓    │    ✗    │    ✗    │  ✓   │
│ View linked parents     │    ✓    │    ✗    │    ✗    │  ✓   │
│ Regenerate code         │    ✓    │    ✗    │    ✗    │  ✓   │
│ Enter invite code       │    ✗    │    ✓    │    ✗    │  ✗   │
│ Link to student         │    ✗    │    ✓    │    ✗    │  ✗   │
│ View child data         │    ✗    │    ✓    │    ✗    │  ✓   │
│ Revoke parent access    │    ✗    │    ✗    │    ✗    │  ✓   │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Lifecycle

```
┌──────────────┐
│   Generated  │ ◄── Student creates code
│   (active)   │
└──────┬───────┘
       │
       ├─ Not used within 7 days
       ▼
┌──────────────┐
│   Expired    │ ◄── Auto-expired by system
│   (expired)  │
└──────────────┘

       OR

       ├─ Parent enters code
       ▼
┌──────────────┐
│    Used      │ ◄── Successfully linked
│   (used)     │
└──────┬───────┘
       │
       └─ Student can regenerate
```

---

## Error States & Messages

```
┌──────────────────────────────────────────────────────────┐
│ Error Scenario              │ Message (Arabic)           │
├──────────────────────────────────────────────────────────┤
│ Invalid code                │ رمز الدعوة غير صالح        │
│ Expired code                │ رمز الدعوة غير صالح        │
│                             │ أو منتهي الصلاحية          │
│ Already linked              │ ولي الأمر مرتبط بالفعل     │
│                             │ بهذا الطالب                │
│ Student not found           │ الطالب غير موجود           │
│ Parent account not found    │ حساب ولي الأمر غير موجود   │
│ Network error               │ حدث خطأ أثناء التحقق       │
│                             │ من الرمز                   │
│ Linking error               │ حدث خطأ أثناء ربط الحساب  │
└──────────────────────────────────────────────────────────┘
```

---

## Security Checklist

✅ Code expiration (7 days default)
✅ Single-use codes (marked as 'used' after linking)
✅ Auto-invalidation on regeneration
✅ Duplicate linking prevention
✅ Role-based access control
✅ Input validation & sanitization
✅ Error handling without data leakage
✅ Database atomicity (both profiles updated)
✅ Audit trail (full code history)
✅ No sensitive data in URLs
✅ HTTPS required for production

---

## Performance Considerations

- **Lazy Loading**: ParentAcceptancePage loaded on demand
- **Efficient Queries**: Direct user lookup by code
- **Minimal Re-renders**: Proper React state management
- **Optimistic Updates**: UI updates before server confirmation
- **Caching**: Parent list cached after initial fetch
- **Pagination Ready**: Can handle large parent lists

---

## Browser Compatibility

✅ Chrome/Edge (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Mobile browsers (iOS Safari, Chrome Mobile)
✅ Termux WebView (if used in app)

---

## Accessibility

✅ Keyboard navigation support
✅ Screen reader compatible
✅ High contrast UI elements
✅ Clear visual feedback
✅ Error announcements
✅ Focus management
✅ RTL layout support

---

Status: ✅ PRODUCTION READY
