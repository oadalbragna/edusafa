import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { ref, onValue, push, set, remove, limitToLast, query, get } from 'firebase/database';
import { SYS, EDU } from '../../constants/dbPaths';
import { cache } from '../../services/cache.service';
import { useAuth } from '../../context/AuthContext';

export const useAdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, pendingStudents: 0, pendingRequests: 0, supportMessages: 0, onlineUsers: 0 });
  const [classes, setClasses] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const refs = {
      classes: ref(db, EDU.SCH.CLASSES),
      users: ref(db, SYS.USERS),
      activities: query(ref(db, SYS.MAINTENANCE.ACTIVITIES), limitToLast(6)),
      todos: ref(db, `${SYS.CONFIG.ROOT}/admin_todos/${user.uid}`),
      support: ref(db, SYS.MAINTENANCE.SUPPORT_TICKETS)
    };

    const unsubClasses = onValue(refs.classes, (snap) => snap.exists() && setClasses(Object.values(snap.val())));
    const unsubUsers = onValue(refs.users, (snap) => {
        if (snap.exists()) {
            const arr = Object.values(snap.val()) as any[];
            setAllUsers(arr);
            setStats(prev => ({ ...prev, students: arr.filter(u => u.role === 'student').length, teachers: arr.filter(u => u.role === 'teacher').length }));
        }
    });
    
    const unsubActivities = onValue(refs.activities, (snap) => snap.exists() && setRecentActivities(Object.values(snap.val()).reverse()));
    const unsubTodos = onValue(refs.todos, (snap) => setTodos(snap.exists() ? Object.values(snap.val()) : []));
    const unsubSupport = onValue(refs.support, (snap) => snap.exists() && setStats(prev => ({ ...prev, supportMessages: Object.keys(snap.val()).length })));

    setLoading(false);
    return () => { unsubClasses(); unsubUsers(); unsubActivities(); unsubTodos(); unsubSupport(); };
  }, [user]);

  const processGrowthData = (users: any[], timeRange: string, setChartData: Function) => {
    const periods = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '6m' ? 6 : 12;
    const isMonthly = timeRange === '6m' || timeRange === '1y';
    let chartPoints: any[] = [];
    if (!isMonthly) {
      for (let i = periods - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        chartPoints.push({ name: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), value: 0, rawDate: dateStr });
      }
      users.forEach(u => {
        const uDate = u.createdAt?.split('T')[0];
        const point = chartPoints.find(p => p.rawDate === uDate);
        if (point) point.value++;
      });
    } else {
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const currentMonth = new Date().getMonth();
      for (let i = periods - 1; i >= 0; i--) {
        const mIdx = (currentMonth - i + 12) % 12;
        chartPoints.push({ name: months[mIdx], value: 0, mIdx });
      }
      users.forEach(u => {
        if (u.createdAt) {
          const m = new Date(u.createdAt).getMonth();
          const point = chartPoints.find(p => p.mIdx === m);
          if (point) point.value++;
        }
      });
    }
    let total = 0;
    setChartData(chartPoints.map(p => { total += p.value; return { ...p, value: total }; }));
  };

  const processInteractionData = (activities: any[], timeRange: string, setChartData: Function) => {
    const days = timeRange === '7d' ? 7 : 30;
    let chartPoints: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartPoints.push({ name: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), value: 0, rawDate: dateStr });
    }
    activities.forEach(a => {
      const aDate = a.createdAt?.split('T')[0];
      const point = chartPoints.find(p => p.rawDate === aDate);
      if (point) point.value++;
    });
    setChartData(chartPoints);
  };

  const processFinancialData = (payments: any[], timeRange: string, setChartData: Function) => {
    const isMonthly = timeRange === '6m' || timeRange === '1y';
    let chartPoints: any[] = [];
    if (!isMonthly) {
      const days = timeRange === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartPoints.push({ name: d.toLocaleDateString('ar-EG', { day: 'numeric' }), value: 0, rawDate: d.toISOString().split('T')[0] });
      }
      payments.forEach(p => {
        const pDate = p.createdAt?.split('T')[0];
        const point = chartPoints.find(pt => pt.rawDate === pDate);
        if (point) point.value += Number(p.amount || 0);
      });
    } else {
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const currentMonth = new Date().getMonth();
      const periods = timeRange === '6m' ? 6 : 12;
      for (let i = periods - 1; i >= 0; i--) {
        const mIdx = (currentMonth - i + 12) % 12;
        chartPoints.push({ name: months[mIdx], value: 0, mIdx });
      }
      payments.forEach(p => {
        if (p.createdAt) {
          const m = new Date(p.createdAt).getMonth();
          const point = chartPoints.find(pt => pt.mIdx === m);
          if (point) point.value += Number(p.amount || 0);
        }
      });
    }
    setChartData(chartPoints);
  };

  const processAcademicData = (submissions: any[], setChartData: Function) => {
    const types = { 'assignment': 'واجبات', 'quiz': 'اختبارات', 'project': 'مشاريع' };
    let dataMap: any = { 'واجبات': 0, 'اختبارات': 0, 'مشاريع': 0 };
    submissions.forEach(s => {
      const type = (s.type || 'assignment') as keyof typeof types;
      const label = types[type] || 'أخرى';
      if (!dataMap[label]) dataMap[label] = 0;
      dataMap[label]++;
    });
    setChartData(Object.entries(dataMap).map(([name, value]) => ({ name, value })));
  };

  return { loading, stats, classes, recentActivities, todos, allUsers, processGrowthData, processInteractionData, processFinancialData, processAcademicData };
};
