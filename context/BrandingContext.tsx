import React, { createContext, useContext, useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { getDb as db } from '../services/firebase';
import { SYS } from '../constants/dbPaths';

interface Branding {
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  platformName: string;
}

interface BrandingContextType {
  branding: Branding;
  loading: boolean;
}

const defaultBranding: Branding = {
  logoUrl: '/assets/icons/icon.png',
  bannerUrl: '',
  primaryColor: '#123B5A',
  secondaryColor: '#D4AF37',
  platformName: 'EduSafa'
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load cached branding from localStorage first
    const cachedBranding = localStorage.getItem('edu_branding');
    if (cachedBranding) {
      try {
        const parsed = JSON.parse(cachedBranding);
        setBranding(prev => ({ ...prev, ...parsed }));
        // Don't set loading to false yet - still fetch fresh data
      } catch (e) {
        console.warn('Failed to parse cached branding:', e);
      }
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 2000); // Max 2 seconds wait

    if (!db) {
      console.warn('⚠️ DB not available - using default branding');
      setLoading(false);
      clearTimeout(timeoutId);
      return;
    }

    const brandingRef = ref(db, SYS.SYSTEM.BRANDING);
    const unsubscribe = onValue(brandingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Merge with defaults to ensure all fields exist
        const mergedBranding = {
          ...defaultBranding,
          ...data
        };
        setBranding(mergedBranding);
        // Cache in localStorage
        localStorage.setItem('edu_branding', JSON.stringify(mergedBranding));
      }
      setLoading(false);
      clearTimeout(timeoutId);
    }, (error) => {
      console.error('Branding load error:', error);
      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};
