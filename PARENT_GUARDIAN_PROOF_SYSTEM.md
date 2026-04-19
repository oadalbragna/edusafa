# Guardian Proof Document Verification System
# نظام التحقق من وثائق إثبات القرابة لولي الأمر

## Overview | نظرة عامة

This feature implements a comprehensive parent-student linking system with guardian proof document verification. The workflow ensures authentic parent-student relationships through a multi-step approval process with document verification.

تطبق هذه الميزة نظامًا شاملاً لربط أولياء الأمور بالطلاب مع التحقق من وثائق إثبات القرابة. تضمن سير العمل العلاقات الأصيلة بين أولياء الأمور والطلاب من خلال عملية موافقة متعددة الخطوات مع التحقق من الوثائق.

---

## Workflow Steps | خطوات سير العمل

### 1. Student Generates Invite Code | ينشئ الطالب رمز الدعوة
- Student navigates to Settings → Parent Linking
- Generates an 8-character alphanumeric invite code
- Code is valid for 7 days
- Can be shared as text or QR code

ينتقل الطالب إلى الإعدادات ← ربط ولي الأمر  
ينشئ رمز دعوة مكون من 8 أحرف  
الرمز صالح لمدة 7 أيام  
يمكن مشاركته كنص أو رمز QR

### 2. Parent Creates Account & Enters Code | ينشئ ولي الأمر حسابًا ويدخل الرمز
- Parent registers account with role "parent"
- Navigates to Parent Acceptance page
- Enters invite code or scans QR
- System validates code and displays student info

يسجل ولي الأمر حسابًا بدور "ولي الأمر"  
ينتقل إلى صفحة قبول ولي الأمر  
يدخل رمز الدعوة أو يمسح رمز QR  
يتحقق النظام من الرمز ويعرض بيانات الطالب

### 3. Parent Request Sent | يتم إرسال طلب ولي الأمر
- Parent confirms student information
- Request is created with status: `pending`
- Request stored in `sys/config/parent_link_requests`
- Student receives notification

يؤكد ولي الأمر بيانات الطالب  
يتم إنشاء الطلب بالحالة: `pending`  
يتم تخزين الطلب في `sys/config/parent_link_requests`  
يتلقى الطالب إشعارًا

### 4. Student Approves Request | يوافق الطالب على الطلب
- Student views pending requests in StudentSmartHome
- Student can approve or reject
- Upon approval, status changes to: `student_approved`
- Parent receives notification to upload proof document

يعرض الطالب الطلبات المعلقة في StudentSmartHome  
يمكن للطالب الموافقة أو الرفض  
عند الموافقة، تتغير الحالة إلى: `student_approved`  
يتلقى ولي الأمر إشعارًا لرفع وثيقة الإثبات

### 5. Parent Uploads Guardian Proof Document | يرفع ولي الأمر وثيقة إثبات القرابة
- Parent receives notification that student approved
- Parent navigates to Parent Acceptance page
- System shows proof document upload interface
- Parent selects document type:
  - `id_card` - بطاقة الهوية
  - `birth_certificate` - شهادة الميلاد
  - `family_book` - دفتر العائلة
  - `court_order` - أمر المحكمة
  - `other` - أخرى
- Parent uploads document (image or PDF, max 5MB)
- Document uploaded to Firebase Storage
- Status changes to: `proof_uploaded`

يتلقى ولي الأمر إشعارًا بموافقة الطالب  
ينتقل ولي الأمر إلى صفحة قبول ولي الأمر  
يعرض النظام واجهة رفع وثيقة الإثبات  
يختار ولي الأمر نوع الوثيقة  
يرفع ولي الأمر الوثيقة (صورة أو PDF، بحد أقصى 5 ميجابايت)  
يتم رفع الوثيقة إلى Firebase Storage  
تتغير الحالة إلى: `proof_uploaded`

### 6. Student Reviews Proof Document | يراجع الطالب وثيقة الإثبات
- Student receives notification that proof uploaded
- Student opens proof document viewer
- Can view document (image preview or PDF viewer)
- Can approve or reject with notes
- Upon approval, status changes to: `proof_reviewed_by_student`
- If rejected, status returns to `student_approved` for re-upload

يتلقى الطالب إشعارًا برفع الوثيقة  
يفتح الطالب عارض الوثائق  
يمكنه معاينة الوثيقة (معاينة الصورة أو عارض PDF)  
يمكنه الموافقة أو الرفض مع ملاحظات  
عند الموافقة، تتغير الحالة إلى: `proof_reviewed_by_student`  
إذا رُفضت، تعود الحالة إلى `student_approved` لإعادة الرفع

### 7. Admin Final Review | المراجعة النهائية من الإدارة
- Admin receives request with status `proof_reviewed_by_student`
- Admin views complete request including:
  - Parent information
  - Student information
  - Proof document
  - Student review notes
- Admin can:
  - Approve: Links parent to student permanently
  - Reject: With reason sent to parent
- Upon approval, status changes to: `admin_approved`
- Parent account status changes to: `approved`

يتلقى الإدارة طلبًا بالحالة `proof_reviewed_by_student`  
تعرض الإدارة الطلب الكامل بما في ذلك:  
  - معلومات ولي الأمر
  - معلومات الطالب
  - وثيقة الإثبات
  - ملاحظات مراجعة الطالب
يمكن للإدارة:  
  - الموافقة: ربط ولي الأمر بالطالب بشكل دائم
  - الرفض: مع إرسال السبب لولي الأمر
عند الموافقة، تتغير الحالة إلى: `admin_approved`  
تتغير حالة حساب ولي الأمر إلى: `approved`

### 8. Linking Complete | اكتمال الربط
- Parent is now officially linked to student
- Parent can access student's grades, attendance, etc.
- Both parties receive confirmation notifications
- Invite code marked as used

تم ربط ولي الأمر بالطالب رسميًا  
يمكن لولي الأمر الوصول إلى درجات الطالب وحضوره وغيرها  
يتلقى كلا الطرفين إشعارات تأكيد  
يتم تحديد رمز الدعوة كمستخدم

---

## Database Schema | مخطط قاعدة البيانات

### Parent Link Request Structure
### هيكل طلب ربط ولي الأمر

```typescript
{
  id: string;                              // Unique request ID
  studentUid: string;                      // Student's UID
  studentName: string;                     // Student's full name
  studentEmail: string;                    // Student's email
  parentUid: string;                       // Parent's UID
  parentName: string;                      // Parent's full name
  parentEmail: string;                     // Parent's email
  parentPhone?: string;                    // Parent's phone (optional)
  inviteCode: string;                      // Used invite code
  
  // Workflow Status
  status: 'pending' |                      // Initial request
          'student_approved' |             // Student approved, waiting for proof
          'proof_uploaded' |               // Proof uploaded, waiting for student review
          'proof_reviewed_by_student' |    // Student approved proof, waiting for admin
          'admin_approved' |               // Fully approved and linked
          'rejected';                      // Request rejected
  
  // Timestamps
  requestedAt: string;                     // When request was created
  studentRespondedAt?: string;             // When student responded
  adminRespondedAt?: string;               // When admin responded
  
  // Rejection info
  rejectionReason?: string | null;         // Reason for rejection
  respondedBy?: string;                    // UID of who rejected
  
  // Guardian Proof Document Fields
  proofDocumentUrl?: string;               // Firebase Storage URL
  proofDocumentType?: 'id_card' |          // Type of document
                       'birth_certificate' |
                       'family_book' |
                       'court_order' |
                       'other';
  proofUploadedAt?: string;                // When proof was uploaded
  proofReviewedByStudent?: boolean;        // Did student review proof?
  proofStudentReviewNotes?: string;        // Student's notes on proof
  proofReviewedAt?: string;                // When student reviewed proof
  adminReviewNotes?: string;               // Admin's review notes
  
  expiresAt: string;                       // Request expiration date
}
```

---

## Request Status Flow Diagram
### مخطط تدفق حالة الطلب

```
┌─────────────┐
│   Parent    │
│  Enters     │
│    Code     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Request   │
│  Created    │
│ (pending)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Student    │
│  Approves   │
│(student_approved)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Parent     │
│ Uploads     │
│   Proof     │
│(proof_uploaded)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Student    │
│  Reviews    │
│   Proof     │
│(proof_reviewed_by_student)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Admin     │
│  Final      │
│  Review     │
│(admin_approved)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Linked    │
│ Successfully│
└─────────────┘
```

---

## File Structure | هيكل الملفات

### New Files Created | ملفات جديدة تم إنشاؤها

```
components/parent/
├── ProofDocumentUpload.tsx          # Parent upload interface
└── ProofDocumentViewer.tsx          # Review interface for students/admins

services/
└── documentUpload.service.ts        # Firebase Storage upload logic

utils/
└── parentLinkRequests.ts            # Updated with proof document functions

pages/Parent/
└── ParentAcceptancePage.tsx         # Updated with proof upload steps

pages/Student/
└── StudentSmartHome.tsx             # Updated with proof review UI

pages/Admin/Management/
└── ParentApprovalManagement.tsx     # Updated with proof viewer

types/
└── index.ts                         # Updated ParentLinkRequest interface
```

---

## Key Features | الميزات الرئيسية

### 1. Document Upload | رفع الوثائق
- Drag & drop interface
- File validation (type & size)
- Image preview before upload
- Supports: JPG, PNG, PDF
- Max size: 5MB
- Uploaded to Firebase Storage

واجهة السحب والإفلات  
التحقق من الملف (النوع والحجم)  
معاينة الصورة قبل الرفع  
يدعم: JPG, PNG, PDF  
الحجم الأقصى: 5 ميجابايت  
يتم الرفع إلى Firebase Storage

### 2. Document Viewer | عارض الوثائق
- Full-screen modal viewer
- Image preview for images
- PDF viewer (iframe) for PDFs
- Download option for all files
- Open in new tab option
- Review notes interface

عارض بملء الشاشة  
معاينة الصورة للصور  
عارض PDF (iframe) لملفات PDF  
خيار التحميل لجميع الملفات  
خيار الفتح في تبويب جديد  
واجهة ملاحظات المراجعة

### 3. Multi-Step Approval | الموافقة متعددة الخطوات
- Student initial approval
- Parent proof upload
- Student proof review
- Admin final approval
- Notifications at each step

موافقة الطالب الأولية  
رفع ولي الأمر للوثيقة  
مراجعة الطالب للوثيقة  
الموافقة النهائية من الإدارة  
إشعارات في كل خطوة

### 4. Status Tracking | تتبع الحالة
- Real-time status updates
- Visual timeline for parents
- Status badges in UI
- Automatic notifications

تحديثات الحالة في الوقت الفعلي  
جدول زمني مرئي لأولياء الأمور  
شارات الحالة في واجهة المستخدم  
إشعارات تلقائية

---

## API Functions | دوال API

### Parent Link Requests Utils
### أدوات طلبات ربط ولي الأمر

```typescript
// Create new link request
createParentLinkRequest(parentUid, parentName, parentEmail, parentPhone, inviteCode, studentUid, studentName, studentEmail)

// Student responds to request
studentRespondToRequest(requestId, response, rejectionReason?)

// Student reviews proof document
studentReviewProofDocument(requestId, approved, notes?)

// Upload proof document URL
uploadProofDocumentToRequest(requestId, documentUrl, documentType)

// Admin responds to request
adminRespondToRequest(requestId, adminUid, response, rejectionReason?, reviewNotes?)

// Get requests for admin review
getPendingAdminParentRequests()

// Get student's parent requests
getStudentParentRequests(studentUid)

// Get parent's pending requests
getParentPendingRequests(parentUid)
```

### Document Upload Service
### خدمة رفع الوثائق

```typescript
// Upload document to Firebase Storage
uploadProofDocument(file, requestId, parentUid)

// Validate document type
isValidProofDocumentType(type)

// Get Arabic label for document type
getProofDocumentTypeLabel(type)
```

---

## Usage Guide | دليل الاستخدام

### For Students | للطلاب

1. **Generate Invite Code**
   ```
   Settings → Parent Linking → Generate Code
   ```

2. **Approve Parent Request**
   ```
   Settings → Parent Linking → Pending Requests → Approve
   ```

3. **Review Proof Document**
   ```
   When notification received → Open request → Review document
   → Approve/Reject with notes
   ```

### For Parents | لأولياء الأمور

1. **Enter Invite Code**
   ```
   Parent Acceptance Page → Enter code or scan QR
   ```

2. **Upload Proof Document**
   ```
   After student approval → Upload interface appears
   → Select document type → Upload file → Submit
   ```

3. **Track Request Status**
   ```
   View timeline showing all approval steps
   ```

### For Admins | للمشرفين

1. **View Pending Requests**
   ```
   Admin Dashboard → Parent Approval Management
   ```

2. **Review Proof Documents**
   ```
   Click "Review Document" → View in modal
   → Check student's review notes
   ```

3. **Final Approval**
   ```
   Approve: Links parent to student permanently
   Reject: Sends reason to parent
   ```

---

## Security Considerations | اعتبارات الأمان

### File Upload Security
- File type validation (whitelist)
- File size limit (5MB)
- Firebase Storage rules apply
- Unique storage paths per request

### Data Privacy
- Documents only accessible to:
  - The parent who uploaded
  - The linked student
  - Admin reviewers
- Documents stored securely in Firebase Storage
- No public access to documents

### Approval Integrity
- Cannot skip steps in workflow
- Student must approve before proof upload
- Student must review proof before admin
- Admin has final authority
- All actions logged with timestamps

---

## Testing Checklist | قائمة الاختبار

### Complete Workflow Test
- [ ] Student generates invite code
- [ ] Parent enters code and creates request
- [ ] Student approves request
- [ ] Parent receives notification
- [ ] Parent uploads proof document
- [ ] Student receives notification
- [ ] Student reviews and approves proof
- [ ] Admin receives request
- [ ] Admin reviews and approves
- [ ] Parent account activated
- [ ] Both parties receive confirmation

### Edge Cases
- [ ] Parent rejects after student approval
- [ ] Student rejects proof document
- [ ] Admin rejects with reason
- [ ] Expired invite code
- [ ] Already used code
- [ ] Invalid file type upload
- [ ] File too large
- [ ] Network interruption during upload

---

## Future Enhancements | التحسينات المستقبلية

1. **Push Notifications**
   - Real-time push notifications via Firebase Cloud Messaging
   - Instant alerts for each workflow step

2. **Email Notifications**
   - Email summaries for request status changes
   - Document upload confirmations

3. **Multiple Document Upload**
   - Allow parents to upload multiple proof documents
   - Supporting documents for stronger verification

4. **Document Verification API**
   - Integration with government APIs for document validation
   - Automatic authenticity checking

5. **Audit Trail**
   - Complete history of all actions
   - Who did what and when
   - Reason for each decision

6. **Analytics Dashboard**
   - Request statistics
   - Average processing time
   - Rejection rates and reasons

---

## Trouleshooting | استكشاف الأخطاء

### Parent Cannot Upload Document
**Issue:** Upload fails or shows error  
**Solutions:**
- Check file type (must be JPG, PNG, or PDF)
- Check file size (max 5MB)
- Verify Firebase Storage is configured
- Check internet connection

### Student Cannot See Proof Document
**Issue:** No "Review Document" button appears  
**Solutions:**
- Verify parent actually uploaded document
- Check request status is `proof_uploaded`
- Refresh the page
- Check browser console for errors

### Admin Cannot Approve
**Issue:** Approve button disabled or fails  
**Solutions:**
- Verify status is `proof_reviewed_by_student`
- Check student has actually reviewed proof
- Verify Firebase Database rules allow updates
- Check admin has proper permissions

---

## Support | الدعم

For issues or questions:
- Check this documentation
- Review Firebase console for request status
- Check browser console for errors
- Contact system administrator

للمشاكل أو الأسئلة:  
- راجع هذه الوثائق  
- راجع وحدة تحكم Firebase لحالة الطلب  
- راجع وحدة تحكم المتصفح للأخطاء  
- اتصل بمسؤول النظام

---

**Version:** 2.0.0  
**Last Updated:** April 5, 2026  
**Status:** Production Ready ✅
