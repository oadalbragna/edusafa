import { useState } from 'react';
import { AuthService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

export const useLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('يرجى إدخال كافة البيانات');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await AuthService.loginManual(identifier, password);

      if (res.success && res.user) {
        await login(res.user);
      } else {
        setError(res.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    error,
    loading,
    handleLogin
  };
};
