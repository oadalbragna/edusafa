import React, { createContext, useContext, useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';
import { SYS } from '../constants/dbPaths';
import { AuthService } from '../services/auth.service';
import { logActivity } from '../utils/activityLogger';
import type { UserProfile } from '../types';

// Cache version - increment when schema changes to force refresh
const CACHE_VERSION = 'v2.0.1';

interface AuthContext_Type {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (userData: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  isStudentPending: boolean;
}

const AuthContext = createContext<AuthContext_Type>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isStudentPending: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStudentPending, setIsStudentPending] = useState(false);

  // Initialize from localStorage for instant UI
  useEffect(() => {
    const initAuth = async () => {
      // Check cache version and clear if outdated
      const cachedVersion = localStorage.getItem('edu_cache_version');
      if (!cachedVersion || cachedVersion !== CACHE_VERSION) {
        console.log('🔄 Cache version mismatch - clearing old cache');
        localStorage.removeItem('edu_user_profile');
        localStorage.removeItem('edu_branding');
        localStorage.setItem('edu_cache_version', CACHE_VERSION);
      }

      const savedProfile = localStorage.getItem('edu_user_profile');
      if (savedProfile) {
        try {
          const profileData = JSON.parse(savedProfile) as UserProfile;

          if (db) {
            // Verify with DB to get latest status/permissions
            const userRef = ref(db, SYS.user(profileData.uid));
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
              const latestData = snapshot.val() as UserProfile;
              
              // Merge with defaults to ensure all new fields exist
              const mergedProfile: UserProfile = {
                uid: latestData.uid || profileData.uid,
                email: latestData.email || profileData.email || '',
                role: latestData.role || profileData.role,
                firstName: latestData.firstName,
                lastName: latestData.lastName,
                fullName: latestData.fullName,
                secondName: latestData.secondName,
                phone: latestData.phone,
                eduLevel: latestData.eduLevel,
                grade: latestData.grade,
                schoolId: latestData.schoolId,
                stageId: latestData.stageId,
                gradeId: latestData.gradeId,
                classId: latestData.classId,
                year: latestData.year,
                inviteCode: latestData.inviteCode,
                parentInviteCode: latestData.parentInviteCode,
                parentInviteCodes: latestData.parentInviteCodes || [],
                studentLink: latestData.studentLink,
                studentLinks: latestData.studentLinks || [],
                parentLinks: latestData.parentLinks || [],
                parentUid: latestData.parentUid,
                parentEmail: latestData.parentEmail,
                address: latestData.address,
                photoURL: latestData.photoURL,
                createdAt: latestData.createdAt || profileData.createdAt,
                status: latestData.status,
                lastSeen: latestData.lastSeen,
                classRequests: latestData.classRequests,
                permissions: latestData.permissions,
                blockedClasses: latestData.blockedClasses,
                blockedSubjects: latestData.blockedSubjects
              };

              setProfile(mergedProfile);
              setUser(mergedProfile);
              localStorage.setItem('edu_user_profile', JSON.stringify(mergedProfile));

              // Check if student account is pending
              setIsStudentPending(mergedProfile.role === 'student' && (mergedProfile.status === 'pending' || !mergedProfile.status));

              // Update status to online
              try {
                await AuthService.updateStatus(mergedProfile.uid, 'online');
              } catch (e) {
                console.error("Status update failed", e);
              }
            } else {
              // User no longer exists in DB
              handleLogout();
            }
          } else {
            // DB not available - use cached data with defaults
            const profileWithDefaults = {
              ...profileData,
              parentInviteCodes: profileData.parentInviteCodes || [],
              studentLinks: profileData.studentLinks || [],
              parentLinks: profileData.parentLinks || [],
              blockedClasses: profileData.blockedClasses || [],
              blockedSubjects: profileData.blockedSubjects || []
            };
            setProfile(profileWithDefaults);
            setUser(profileWithDefaults);
            setIsStudentPending(profileData.role === 'student' && (profileData.status === 'pending' || !profileData.status));
          }
        } catch (e) {
          console.error("Auth initialization failed", e);
          localStorage.removeItem('edu_user_profile');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = async (userData: UserProfile) => {
    setProfile(userData);
    setUser(userData);
    localStorage.setItem('edu_user_profile', JSON.stringify(userData));
    await AuthService.updateStatus(userData.uid, 'online');
    await logActivity({
      type: 'user_login',
      userId: userData.uid,
      userName: userData.fullName || userData.firstName || 'User',
      details: 'قام بتسجيل الدخول إلى المنصة'
    });
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await AuthService.updateStatus(user.uid, 'offline');
      } catch (err) {
        console.error("Logout status update failed", err);
      }
    }
    localStorage.removeItem('edu_user_profile');
    setProfile(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login: handleLogin, logout: handleLogout, isStudentPending }}>
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          color: '#2563eb',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #2563eb',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: '20px', fontWeight: 'bold' }}>جاري تهيئة المنصة التعليمية...</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
