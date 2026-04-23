import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/ToastProvider';
import { RouteErrorBoundary } from './components/routes/RouteErrorBoundary';
import {
  ProtectedRoute,
  AdminRoute,
  TeacherRoute,
  StudentRoute,
  ParentRoute,
  PendingApprovalRoute
} from './components/routes/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import Layout from './components/layout/Layout';
import UnifiedSplash from './components/common/UnifiedSplash';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/Auth/ProfilePage'));
const LegalConsent = lazy(() => import('./pages/Auth/LegalConsent'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/Teacher/TeacherDashboard'));
const TeacherDashboardPro = lazy(() => import('./pages/Teacher/TeacherDashboardPro'));
const ExamBuilder = lazy(() => import('./pages/Teacher/ExamBuilder'));
const StudentSmartHome = lazy(() => import('./pages/Student/StudentSmartHome'));
const MissingLibrariesPage = lazy(() => import('./pages/Student/MissingLibrariesPage'));
const ParentApprovalManagement = lazy(() => import('./pages/Admin/Management/ParentApprovalManagement'));
const CourseContentStudio = lazy(() => import('./pages/Admin/CourseContentStudio'));
const UsersManagement = lazy(() => import('./pages/Admin/Management/UsersManagement'));
const ClassesManagement = lazy(() => import('./pages/Admin/Management/ClassesManagement'));
const AddClassPage = lazy(() => import('./pages/Admin/Management/AddClassPage'));
const Announcements = lazy(() => import('./pages/Admin/Management/Announcements'));
const SliderManagement = lazy(() => import('./pages/Admin/Management/SliderManagement'));
const GlobalSubjects = lazy(() => import('./pages/Admin/Management/GlobalSubjects'));
const TeacherRequests = lazy(() => import('./pages/Admin/Management/TeacherRequests'));
const ActivityLogs = lazy(() => import('./pages/Admin/Management/ActivityLogs'));
const SupportMessages = lazy(() => import('./pages/Admin/Management/SupportMessages'));
const TelegramBridgePage = lazy(() => import('./pages/Admin/Management/TelegramBridgePage'));
const StudentApprovalManagement = lazy(() => import('./pages/Admin/Management/StudentApprovalManagement'));
const ParentAcceptancePage = lazy(() => import('./pages/Parent/ParentAcceptancePage'));
const IdentityDocumentReviewPage = lazy(() => import('./pages/Parent/IdentityDocumentReviewPage'));
const ParentDashboard = lazy(() => import('./pages/Parent/ParentDashboard'));
const AcademicSettings = lazy(() => import('./pages/Admin/Settings/AcademicSettings'));
const PlatformSettings = lazy(() => import('./pages/Admin/Settings/PlatformSettings'));
const ClassDetails = lazy(() => import('./pages/Common/ClassDetails'));
const ChatPage = lazy(() => import('./pages/Common/ChatPage'));
const Maintenance = lazy(() => import('./pages/Common/Maintenance'));
const LegalPage = lazy(() => import('./pages/Common/LegalPage'));
const SupportPage = lazy(() => import('./pages/Common/SupportPage'));
const AcademicCurriculum = lazy(() => import('./pages/Academic/AcademicCurriculum'));
const SchedulePage = lazy(() => import('./pages/Schedule/SchedulePage'));
const FinancialManagement = lazy(() => import('./pages/Financial/FinancialManagement'));
const CashipayPayment = lazy(() => import('./pages/Financial/CashipayPayment'));
const CashipayFullTest = lazy(() => import('./pages/Admin/Management/CashipayFullTest'));
const CourseUploadDashboard = lazy(() => import('./pages/Admin/CourseUploadDashboard'));
const PendingApproval = lazy(() => import('./pages/Teacher/PendingApproval'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <LoadingSpinner size="lg" text="جاري تحميل الصفحة..." />
  </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <ThemeProvider>
        <BrandingProvider>
          <UnifiedSplash onComplete={() => setShowSplash(false)} />
        </BrandingProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrandingProvider>
          <AuthProvider>
            <Router>
              <RouteErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes - No Layout */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/legal-consent" element={<LegalConsent />} />
                    <Route path="/register" element={<Register />} />

                    {/* Pending Approval Route */}
                    <Route
                      path="/pending-approval"
                      element={
                        <PendingApprovalRoute>
                          <PendingApproval />
                        </PendingApprovalRoute>
                      }
                    />

                    {/* Protected Routes - With Layout */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Layout><Dashboard /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Layout><ProfilePage /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin Routes - Admin Only */}
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <Layout><AdminDashboard /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/announcements"
                      element={
                        <AdminRoute>
                          <Layout><Announcements /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/slider"
                      element={
                        <AdminRoute>
                          <Layout><SliderManagement /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/classes"
                      element={
                        <AdminRoute>
                          <Layout><ClassesManagement /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/add-class"
                      element={
                        <AdminRoute>
                          <Layout><AddClassPage /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/global-subjects"
                      element={
                        <AdminRoute>
                          <Layout><GlobalSubjects /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <AdminRoute>
                          <Layout><UsersManagement /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/teacher-requests"
                      element={
                        <AdminRoute>
                          <Layout><TeacherRequests /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/student-approvals"
                      element={
                        <AdminRoute>
                          <Layout><StudentApprovalManagement /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/parent-approvals"
                      element={
                        <AdminRoute>
                          <Layout><ParentApprovalManagement /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/logs"
                      element={
                        <AdminRoute>
                          <Layout><ActivityLogs /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/support"
                      element={
                        <AdminRoute>
                          <Layout><SupportMessages /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/bridge"
                      element={
                        <AdminRoute>
                          <Layout><TelegramBridgePage /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/academic-settings"
                      element={
                        <AdminRoute>
                          <Layout><AcademicSettings /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/courses"
                      element={
                        <AdminRoute allowSupervisors={true}>
                          <Layout><CourseUploadDashboard /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/course-content"
                      element={
                        <AdminRoute allowSupervisors={true}>
                          <CourseContentStudio />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <AdminRoute>
                          <Layout><PlatformSettings /></Layout>
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/cashipay-full-test"
                      element={
                        <AdminRoute>
                          <CashipayFullTest />
                        </AdminRoute>
                      }
                    />

                    {/* Teacher Routes - Teacher Only */}
                    <Route
                      path="/teacher"
                      element={
                        <TeacherRoute>
                          <Layout><TeacherDashboard /></Layout>
                        </TeacherRoute>
                      }
                    />
                    <Route
                      path="/teacher/courses"
                      element={
                        <TeacherRoute>
                          <Layout><CourseUploadDashboard /></Layout>
                        </TeacherRoute>
                      }
                    />
                    <Route
                      path="/teacher/pro"
                      element={
                        <TeacherRoute>
                          <TeacherDashboardPro />
                        </TeacherRoute>
                      }
                    />
                    <Route
                      path="/teacher/exam/new"
                      element={
                        <TeacherRoute>
                          <ExamBuilder />
                        </TeacherRoute>
                      }
                    />
                    <Route
                      path="/teacher/exam/:id"
                      element={
                        <TeacherRoute>
                          <ExamBuilder />
                        </TeacherRoute>
                      }
                    />

                    {/* Student Routes - Student Only */}
                    <Route
                      path="/student"
                      element={
                        <StudentRoute>
                          <Layout><StudentSmartHome /></Layout>
                        </StudentRoute>
                      }
                    />
                    <Route
                      path="/student/missing-libraries"
                      element={
                        <StudentRoute>
                          <MissingLibrariesPage />
                        </StudentRoute>
                      }
                    />

                    {/* Parent Routes - Parent Only */}
                    <Route
                      path="/parent-accept"
                      element={
                        <ParentRoute>
                          <ParentAcceptancePage />
                        </ParentRoute>
                      }
                    />
                    <Route
                      path="/parent"
                      element={
                        <ParentRoute>
                          <Layout><ParentDashboard /></Layout>
                        </ParentRoute>
                      }
                    />

                    {/* Admin Routes - Identity Document Review */}
                    <Route
                      path="/admin/identity-documents/review/:parentUid/:documentId"
                      element={
                        <AdminRoute>
                          <Layout><IdentityDocumentReviewPage /></Layout>
                        </AdminRoute>
                      }
                    />

                    {/* Common Protected Features */}
                    <Route
                      path="/class/:id"
                      element={
                        <ProtectedRoute>
                          <Layout><ClassDetails /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <Layout><ChatPage /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/maintenance"
                      element={
                        <ProtectedRoute>
                          <Layout><Maintenance /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/academic"
                      element={
                        <ProtectedRoute>
                          <Layout><AcademicCurriculum /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/schedule"
                      element={
                        <ProtectedRoute>
                          <Layout><SchedulePage /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/financial"
                      element={
                        <ProtectedRoute>
                          <Layout><FinancialManagement /></Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/support"
                      element={
                        <ProtectedRoute>
                          <Layout><SupportPage /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* Payment Route - Authenticated Users */}
                    <Route
                      path="/cashipay-payment"
                      element={
                        <ProtectedRoute>
                          <CashipayPayment />
                        </ProtectedRoute>
                      }
                    />

                    {/* Legal Pages - Public */}
                    <Route path="/terms" element={<LegalPage />} />
                    <Route path="/privacy" element={<LegalPage />} />

                    {/* 404 Page - Redirect to home (ProtectedRoute handles auth check) */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </RouteErrorBoundary>
            </Router>
          </AuthProvider>
        </BrandingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
