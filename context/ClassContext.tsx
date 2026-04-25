import React, { createContext, useContext, useState, useEffect } from 'react';

const ClassContext = createContext<any>(null);

export const ClassProvider = ({ children }: any) => {
  const [activeClass, setActiveClass] = useState<any>(null);
  
  // حفظ الاختيار في localStorage
  useEffect(() => {
    const saved = localStorage.getItem('edu_active_class');
    if (saved) setActiveClass(JSON.parse(saved));
  }, []);

  const setClass = (cls: any) => {
    setActiveClass(cls);
    localStorage.setItem('edu_active_class', JSON.stringify(cls));
  };

  return (
    <ClassContext.Provider value={{ activeClass, setClass }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => useContext(ClassContext);
