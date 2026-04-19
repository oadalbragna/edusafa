/**
 * Cache Management Utility - أداة إدارة الكاش
 *
 * Clears ALL cached data for the platform with a single button press
 */

// Cache version - increment this when schema changes
export const CACHE_VERSION = 'v2.1.0';

/**
 * Clear ALL platform cache - مسح جميع بيانات المنصة
 * This removes EVERYTHING stored by the platform in the browser
 */
export function clearAllPlatformCache(): void {
  console.group('🗑️ === مسح جميع بيانات المنصة ===');
  console.log('بدء مسح الكاش...');

  try {
    // ========================================
    // 1. CLEAR ALL localStorage
    // ========================================
    console.log('📦 مسح localStorage...');
    
    // Get all keys first for logging
    const allLocalStorageKeys = Object.keys(localStorage);
    console.log(`   تم العثور على ${allLocalStorageKeys.length} عنصر في localStorage`);
    
    // Remove ALL localStorage items
    allLocalStorageKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   ✅ تم حذف: ${key}`);
    });

    // ========================================
    // 2. CLEAR ALL sessionStorage
    // ========================================
    console.log('📋 مسح sessionStorage...');
    const allSessionStorageKeys = Object.keys(sessionStorage);
    console.log(`   تم العثور على ${allSessionStorageKeys.length} عنصر في sessionStorage`);
    
    allSessionStorageKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`   ✅ تم حذف: ${key}`);
    });

    // ========================================
    // 3. CLEAR ALL COOKIES (for current domain)
    // ========================================
    console.log('🍪 مسح Cookies...');
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      console.log(`   ✅ تم حذف Cookie: ${cookieName}`);
    });

    // ========================================
    // 4. CLEAR SERVICE WORKER CACHE (if exists)
    // ========================================
    if ('caches' in window) {
      console.log('🔄 مسح Service Worker Cache...');
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log(`   ✅ تم حذف Cache: ${cacheName}`);
        });
      }).catch(err => {
        console.warn('   ⚠️ لا يمكن حذف Service Worker Cache:', err);
      });
    }

    console.log('✅ === تم مسح جميع بيانات المنصة بنجاح ===');
    console.groupEnd();
    
    // Show success message
    showNotification('تم مسح جميع البيانات بنجاح! جاري إعادة التحميل...', 'success');
    
  } catch (error) {
    console.error('❌ خطأ أثناء مسح الكاش:', error);
    console.groupEnd();
    showNotification('حدث خطأ أثناء مسح البيانات', 'error');
  }
}

/**
 * Clear specific EduSafa-related cache (legacy function)
 */
export function clearEduCache(): void {
  console.log('🗑️ مسح بيانات EduSafa...');
  
  // All known EduSafa keys
  const eduKeys = [
    'edu_user_profile',
    'edu_branding',
    'edu_cache_version',
    'edu_theme',
    'edu_darkMode',
    'edu_login_attempts',
    'edu_tg_upload_history',
    'edu_preferences',
    'edu_settings',
    'edu_notifications',
    'edu_announcements',
    'edu_classes',
    'edu_subjects',
    'edu_schedule',
    'edu_grades',
    'edu_attendance',
    'edu_chat_messages',
    'edu_user_settings',
    'edu_parent_codes',
    'edu_parent_requests',
    'edu_documents',
    'edu_uploads',
    'edu_drafts'
  ];
  
  eduKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('✅ تم مسح بيانات EduSafa');
}

/**
 * Show notification message
 */
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease-out;
    direction: rtl;
    text-align: center;
    max-width: 90%;
    font-family: 'IBM Plex Sans Arabic', sans-serif;
  `;
  
  if (type === 'success') {
    notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    notification.style.color = '#fff';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    notification.style.color = '#fff';
  } else {
    notification.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    notification.style.color = '#fff';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Add animation keyframes
  if (!document.getElementById('cache-clear-animations')) {
    const style = document.createElement('style');
    style.id = 'cache-clear-animations';
    style.textContent = `
      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 20px); opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translate(-50%, 20px); opacity: 1; }
        to { transform: translate(-50%, -100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Remove after delay
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-out forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

/**
 * Force refresh by clearing all cache and reloading
 */
export function forceFullRefresh(): void {
  console.log('🔄 إعادة تحميل كاملة...');
  clearAllPlatformCache();
  
  // Force reload bypassing cache
  window.location.reload(true);
}

/**
 * Get complete cache status
 */
export function getFullCacheStatus(): {
  localStorageItems: number;
  sessionStorageItems: number;
  cookies: number;
  serviceWorkerCaches: string[];
  eduCacheVersion: string | null;
  hasUserProfile: boolean;
  hasBranding: boolean;
} {
  const result = {
    localStorageItems: localStorage.length,
    sessionStorageItems: sessionStorage.length,
    cookies: document.cookie.split(';').length,
    serviceWorkerCaches: [] as string[],
    eduCacheVersion: localStorage.getItem('edu_cache_version'),
    hasUserProfile: !!localStorage.getItem('edu_user_profile'),
    hasBranding: !!localStorage.getItem('edu_branding')
  };
  
  // Get service worker cache names
  if ('caches' in window) {
    caches.keys().then(names => {
      result.serviceWorkerCaches = names;
    }).catch(() => {
      result.serviceWorkerCaches = [];
    });
  }
  
  return result;
}

// Export all functions
export const CacheManager = {
  clearAllCache: clearAllPlatformCache,
  clearEduCache,
  forceRefresh: forceFullRefresh,
  getCacheStatus: getFullCacheStatus,
  CACHE_VERSION
};

export default CacheManager;
