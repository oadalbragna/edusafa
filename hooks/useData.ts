/**
 * EduSafa Learning - Custom Hooks for Data Fetching
 * 
 * Optimized hooks with caching, error handling, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, get, query as firebaseQuery } from 'firebase/database';
import { getDb as db } from '../services/firebase';
import { cache, generateCacheKey, getTTLOrPath } from '../services/cache.service';
import { handleFirebaseError } from '../utils/errorHandler';

interface UseDataOptions<T> {
  path: string;
  transform?: (data: any) => T;
  enableCache?: boolean;
  enableRealtime?: boolean;
  staleTime?: number;
}

interface UseDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Generic hook for fetching data from Firebase with caching
 */
export function useData<T = any>(options: UseDataOptions<T>): UseDataReturn<T> {
  const {
    path,
    transform,
    enableCache = true,
    enableRealtime = true,
    staleTime = 5000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const cacheKey = generateCacheKey(path);
      
      // Check cache first
      if (enableCache) {
        const cached = cache.get<T>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch from Firebase
      const dataRef = ref(db, path);
      const snapshot = await get(dataRef);

      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const transformedData = transform ? transform(rawData) : rawData;
        
        setData(transformedData);
        
        // Update cache
        if (enableCache) {
          const ttl = getTTLOrPath(path);
          cache.set(cacheKey, transformedData, ttl);
        }
      } else {
        setData(null);
      }
      
      setError(null);
    } catch (err) {
      const appError = handleFirebaseError(err, path);
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [path, transform, enableCache]);

  useEffect(() => {
    fetchData();

    // Set up real-time listener if enabled
    if (!enableRealtime) return;

    const dataRef = ref(db, path);
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const transformedData = transform ? transform(rawData) : rawData;
          setData(transformedData);
          
          // Update cache
          if (enableCache) {
            const cacheKey = generateCacheKey(path);
            const ttl = getTTLOrPath(path);
            cache.set(cacheKey, transformedData, ttl);
          }
        }
        setLoading(false);
      },
      (err) => {
        const appError = handleFirebaseError(err, path);
        setError(appError.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [path, transform, enableRealtime, enableCache, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData
  };
}

/**
 * Hook for fetching multiple paths in parallel
 */
export function useMultipleData<T extends Record<string, any>>(paths: Record<string, string>): UseDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const promises = Object.entries(paths).map(async ([key, path]) => {
        const cacheKey = generateCacheKey(path);
        
        // Check cache
        const cached = cache.get(cacheKey);
        if (cached) {
          return { key, data: cached };
        }

        // Fetch from Firebase
        const dataRef = ref(db, path);
        const snapshot = await get(dataRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          cache.set(cacheKey, data, getTTLOrPath(path));
          return { key, data };
        }
        
        return { key, data: null };
      });

      const results = await Promise.all(promises);
      const resultData = results.reduce((acc, { key, data }) => {
        acc[key] = data;
        return acc;
      }, {} as T);

      setData(resultData);
      setError(null);
    } catch (err) {
      const appError = handleFirebaseError(err, 'multiple paths');
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(paths)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

/**
 * Hook for user data with specific optimizations
 */
export function useUsers() {
  return useData({
    path: 'sys/users',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data);
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for classes data
 */
export function useClasses() {
  return useData({
    path: 'edu/sch/classes',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data);
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for announcements
 */
export function useAnnouncements(target?: string) {
  return useData({
    path: 'sys/announcements',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data)
        .filter((a: any) => {
          if (!target) return true;
          return a.target === 'all' || a.target === target;
        })
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for system settings
 */
export function useSystemSettings() {
  return useData({
    path: 'sys/system/settings',
    enableCache: true,
    enableRealtime: true,
    staleTime: 60000 // 1 minute
  });
}

/**
 * Hook for teacher class requests
 */
export function useTeacherRequests() {
  return useData({
    path: 'sys/config/teacher_class_requests',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data);
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for student approvals
 */
export function useStudentApprovals() {
  return useData({
    path: 'sys/users',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data).filter((u: any) => 
        u.role === 'student' && (u.status === 'pending' || !u.status)
      );
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for financial data
 */
export function useFinancialData() {
  return useData({
    path: 'sys/financial/payments',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data);
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for activity logs
 */
export function useActivityLogs(limit = 50) {
  return useData({
    path: 'sys/maintenance/activities',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data)
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limit);
    },
    enableCache: true,
    enableRealtime: false // Logs don't need real-time
  });
}

/**
 * Hook for support messages
 */
export function useSupportMessages() {
  return useData({
    path: 'sys/maintenance/support_tickets',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for slider items
 */
export function useSlider(assignedTo?: string) {
  return useData({
    path: 'sys/system/slider',
    transform: (data: any) => {
      if (!data) return [];
      return Object.values(data)
        .filter((s: any) => {
          if (!s.active) return false;
          if (!assignedTo) return true;
          if (s.assignedTo === 'all' || !s.assignedTo) return true;
          return Array.isArray(s.assignedTo) && s.assignedTo.includes(assignedTo);
        })
        .sort((a: any, b: any) => a.order - b.order);
    },
    enableCache: true,
    enableRealtime: true
  });
}

/**
 * Hook for global subjects (courses)
 */
export function useGlobalSubjects(level?: string) {
  return useData({
    path: 'edu/courses',
    transform: (data: any) => {
      if (!data) return [];
      const subjects = Object.values(data);
      if (level) {
        return subjects.filter((s: any) => s.level === level);
      }
      return subjects;
    },
    enableCache: true,
    enableRealtime: true
  });
}

export default useData;
