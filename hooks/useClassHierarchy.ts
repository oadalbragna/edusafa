import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';

export interface ClassHierarchy {
  level: string;
  grade: string;
  classData: any;
}

/**
 * Hook to fetch and organize classes into a hierarchical structure
 * { level: { grade: classData } }
 */
export const useClassHierarchy = () => {
  const [hierarchy, setHierarchy] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const classesRef = ref(db, 'edu/sch/classes');
    
    const unsubscribe = onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        setHierarchy(snapshot.val());
      } else {
        setHierarchy({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { hierarchy, loading };
};
