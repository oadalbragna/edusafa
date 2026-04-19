# Parent-Student Linking System - Testing Guide

## Prerequisites

1. ✅ Application running locally
2. ✅ Firebase database connected
3. ✅ At least 1 student account created
4. ✅ At least 1 parent account created
5. ✅ Both accounts can login successfully

---

## Test Scenario 1: Student Generates Invite Code

### Steps:
1. Login as **student**
2. Navigate to `/profile`
3. Scroll down to "دعوة ولي الأمر للربط مع الحساب" section

### Expected Results:
- ✅ Purple gradient card appears
- ✅ Section title shows with Users icon
- ✅ "رمز الدعوة لولي الأمر" explanation visible
- ✅ If no code exists:
  - Shows "لم يتم إنشاء رمز دعوة بعد"
  - "إنشاء رمز جديد" button visible
- ✅ If code exists:
  - 8-character code displayed in large font
  - Copy button visible next to code
  - "إعادة إنشاء الرمز" button visible
  - "صفحة قبول ولي الأمر" link visible

### Actions:
1. Click "إنشاء رمز جديد"
2. Wait for code generation
3. Verify code appears (format: ABC123XY - 8 chars, uppercase)

### Verify in Database:
```
sys/users/{studentUid}/
  ├─ parentInviteCode: "XXXXXXXX"
  └─ parentInviteCodes: [
       {
         code: "XXXXXXXX",
         createdAt: "2026-04-03T...",
         expiresAt: "2026-04-10T...",
         status: "active"
       }
     ]
```

---

## Test Scenario 2: Student Copies Code

### Steps:
1. Click the **copy button** (📋 icon)

### Expected Results:
- ✅ Code copied to clipboard
- ✅ Button icon changes to checkmark (✓)
- ✅ Visual feedback shown
- ✅ After 2 seconds, icon reverts to copy icon

### Manual Test:
1. Paste clipboard content (Ctrl+V or long-press paste)
2. Verify code matches what's displayed

---

## Test Scenario 3: Parent Links to Student (Happy Path)

### Steps:
1. Login as **parent** (different browser/incognito)
2. Navigate to `/parent`
3. If no children linked, see enhanced empty state
4. Click "ربط حساب بابنك" button
5. Should navigate to `/parent-accept`

### Expected Results (Empty State):
- ✅ Beautiful gradient purple card
- ✅ 3 numbered steps visible
- ✅ "ربط حساب بابنك" button prominent
- ✅ "تحتاج مساعدة؟" button visible

### Linking Process:
1. Enter the 8-character code from student
2. Click "التحقق من الرمز"

### Expected Results (Validating):
- ✅ Loading spinner appears
- ✅ "جاري التحقق..." message shown

### Expected Results (Confirmation):
- ✅ Student name and avatar displayed
- ✅ Parent email shown for verification
- ✅ "تراجع" button (goes back to input)
- ✅ "تأكيد الربط" button (proceeds)

### Actions:
1. Click "تأكيد الربط"

### Expected Results (Linking):
- ✅ Loading spinner
- ✅ "جاري الربط..." message

### Expected Results (Success):
- ✅ Bouncing checkmark animation
- ✅ "تم الربط بنجاح! 🎉" message
- ✅ Student name mentioned
- ✅ 4 features listed with checkmarks
- ✅ "الذهاب للوحة التحكم" button visible

### Actions:
1. Click "الذهاب للوحة التحكم"

---

## Test Scenario 4: Verify Linking Success

### Check Student Profile:
1. Login as **student**
2. Go to `/profile`
3. Check "أولياء الأمور المرتبطين" section

### Expected Results:
- ✅ Parent appears in linked parents list
- ✅ Parent name displayed
- ✅ Parent email shown
- ✅ Green checkmark icon visible
- ✅ Count updated (e.g., "أولياء الأمور المرتبطين (1)")

### Check Parent Dashboard:
1. Login as **parent**
2. Navigate to `/parent`

### Expected Results:
- ✅ Student card displayed
- ✅ Student name and class visible
- ✅ Attendance stats shown
- ✅ Grades tab accessible
- ✅ Assignments tab accessible
- ✅ All data visible

### Verify in Database:
```
sys/users/{studentUid}/
  ├─ parentLinks: ["parentUid123"]
  ├─ parentInviteCodes: [
  │    {
  │      code: "ABC123XY",
  │      status: "used",
  │      usedBy: "parentUid123",
  │      usedAt: "2026-04-03T15:30:00Z"
  │    }
  │  ]
  ├─ parentUid: "parentUid123"  (legacy)
  └─ parentEmail: "parent@email.com"  (legacy)

sys/users/{parentUid}/
  ├─ studentLink: "studentUid123"  (legacy)
  └─ studentLinks: ["studentUid123"]
```

---

## Test Scenario 5: Invalid Code Error

### Steps:
1. As **parent**, go to `/parent-accept`
2. Enter invalid code (e.g., "INVALID1")
3. Click "التحقق من الرمز"

### Expected Results:
- ✅ Error message appears in red box
- ✅ Message: "رمز الدعوة غير صالح"
- ✅ Input field remains editable
- ✅ Can try again

---

## Test Scenario 6: Expired Code Error

### Setup:
1. As **student**, generate a code
2. Manually edit database to set `expiresAt` to past date
3. Or wait 7 days

### Steps:
1. As **parent**, enter the expired code
2. Click "التحق من الرمز"

### Expected Results:
- ✅ Error message: "رمز الدعوة غير صالح أو منتهي الصلاحية"
- ✅ Cannot proceed with linking

---

## Test Scenario 7: Regenerate Code (Student)

### Steps:
1. As **student** with existing code
2. Click "إعادة إنشاء الرمز"

### Expected Results:
- ✅ New code generated immediately
- ✅ Old code replaced
- ✅ Copy button resets

### Verify in Database:
```
sys/users/{studentUid}/parentInviteCodes: [
  {
    code: "OLDCODE1",
    status: "expired"  ← Was 'active', now expired
  },
  {
    code: "NEWCODE2",
    status: "active"  ← New active code
  }
]
```

### Test Old Code Fails:
1. Try using old code as parent
2. Should get "expired" error

---

## Test Scenario 8: Multiple Parents Link to Same Student

### Steps:
1. **Student** generates code
2. **Parent 1** uses code → Success
3. **Student** regenerates code
4. **Parent 2** uses new code → Success

### Expected Results:
- ✅ Both parents can link
- ✅ Student profile shows both parents
- ✅ Both parents can view student data

### Verify:
```
sys/users/{studentUid}/parentLinks: [
  "parent1Uid",
  "parent2Uid"
]
```

---

## Test Scenario 9: Duplicate Linking Prevention

### Steps:
1. **Student** generates code
2. **Parent 1** uses code → Success
3. Try to link same parent again (somehow)

### Expected Results:
- ✅ Error: "ولي الأمر مرتبط بالفعل بهذا الطالب"
- ✅ Cannot create duplicate link

---

## Test Scenario 10: Non-Parent Access Denied

### Steps:
1. Login as **student** (not parent)
2. Manually navigate to `/parent-accept`

### Expected Results:
- ✅ Access denied page shown
- ✅ "غير مصرح" message
- ✅ "هذه الصفحة متاحة فقط لأولياء الأمور"
- ✅ "العودة للرئيسية" button

---

## Test Scenario 11: Parent Dashboard Empty State

### Steps:
1. Login as **parent** with no linked children
2. Navigate to `/parent`

### Expected Results:
- ✅ Dashboard header shows
- ✅ Large purple gradient card
- ✅ 3 numbered steps clearly visible
- ✅ Professional design
- ✅ "ربط حساب بابنك" button works
- ✅ "تحتاج مساعدة؟" button works

---

## Mobile Responsiveness Tests

### Test on Mobile Devices:
1. ✅ Profile page responsive
2. ✅ Parent acceptance page responsive
3. ✅ Parent dashboard empty state responsive
4. ✅ Buttons accessible on touch
5. ✅ Text readable on small screens
6. ✅ Input fields usable on mobile

### Specific Checks:
- Code input auto-uppercase on mobile
- Keyboard doesn't hide input field
- Copy button works on mobile
- All touch targets are large enough (min 44x44px)

---

## Browser Compatibility Tests

### Test Each Browser:
- ✅ Chrome Desktop
- ✅ Firefox Desktop
- ✅ Safari Desktop (Mac)
- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)
- ✅ Edge Desktop

---

## Performance Tests

### Code Generation Speed:
1. Generate code as student
2. Measure time (should be < 2 seconds)

### Code Validation Speed:
1. Enter code as parent
2. Measure validation time (should be < 2 seconds)

### Linking Speed:
1. Click "تأكيد الربط"
2. Measure completion time (should be < 3 seconds)

### Database Queries:
- Monitor Firebase read/write operations
- Ensure no infinite loops
- Check for redundant reads

---

## Error Recovery Tests

### Network Failure:
1. Disable network
2. Try to generate code
3. Re-enable network
4. Should work normally

### Invalid State Recovery:
1. Try various invalid inputs
2. System should not crash
3. Should show appropriate errors
4. Should allow retry

---

## Accessibility Tests

### Keyboard Navigation:
- ✅ Tab through all elements
- ✅ Enter/Space activates buttons
- ✅ Focus visible on all interactive elements
- ✅ Skip to content works

### Screen Reader:
- ✅ All labels read correctly
- ✅ Error messages announced
- ✅ Success messages announced
- ✅ Form validation feedback clear

### Visual:
- ✅ Sufficient color contrast
- ✅ Icons have text alternatives
- ✅ No color-only information
- ✅ Focus indicators visible

---

## Security Tests

### Code Brute Force:
1. Try many random codes
2. Should fail gracefully
3. No information leakage

### Unauthorized Access:
1. Try accessing `/parent-accept` as student → Blocked
2. Try accessing as teacher → Blocked
3. Only parents should access

### Data Integrity:
1. Linking updates both profiles atomically
2. No partial updates
3. Rollback on failure

---

## Cross-Account Tests

### Student → Parent Flow:
1. Student A generates code
2. Parent B enters code
3. Parent B linked to Student A ✓

### Multiple Students:
1. Parent has studentLinks array
2. Can potentially link multiple students
3. Dashboard shows selector

### Role Changes:
1. Link parent to student
2. Change parent role to teacher
3. Verify behavior

---

## Regression Tests

### Existing Features:
- ✅ Student profile still works
- ✅ Parent dashboard still works
- ✅ Other profile fields editable
- ✅ Photo upload still works
- ✅ All existing routes accessible

### Backward Compatibility:
- ✅ Old parentUid field still works
- ✅ Old studentLink field still works
- ✅ Old parentEmail field still works
- ✅ Existing parent-student links unaffected

---

## Test Results Template

```
Test Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

┌─────────────────────────────────────────────┐
│ Scenario │ Status  │ Notes                   │
├─────────────────────────────────────────────┤
│    1     │ ☐ PASS  │                         │
│          │ ☐ FAIL  │                         │
├─────────────────────────────────────────────┤
│    2     │ ☐ PASS  │                         │
│          │ ☐ FAIL  │                         │
├─────────────────────────────────────────────┤
│    3     │ ☐ PASS  │                         │
│          │ ☐ FAIL  │                         │
├─────────────────────────────────────────────┤
│   ...    │         │                         │
└─────────────────────────────────────────────┘

Overall Status: ☐ All Pass  ☐ Issues Found

Critical Issues:
1. 

Minor Issues:
1. 

Recommendations:
1. 
```

---

## Quick Smoke Test (5 Minutes)

1. **Student generates code** (1 min)
2. **Parent copies code** (30 sec)
3. **Parent navigates to /parent-accept** (30 sec)
4. **Parent enters code** (30 sec)
5. **Parent confirms linking** (1 min)
6. **Verify parent sees student in dashboard** (1 min)
7. **Verify student sees parent in profile** (1 min)

If all above work → **System is functional** ✅

---

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser & version
5. Device & OS
6. Screenshots/video
7. Console errors
8. Database state

---

**Status**: Ready for QA Testing
**Priority**: High
**Estimated Test Time**: 2-3 hours (full suite)
