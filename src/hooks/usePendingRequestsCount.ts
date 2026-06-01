import { useState, useEffect } from 'react';
import { getSession, getUserByEmail, getPendingRequests } from '../services/api';

export function usePendingRequestsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCount();
    
    // Recargar cada 30 segundos (opcional)
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCount = async () => {
    try {
      const email = await getSession();
      if (email) {
        const user = await getUserByEmail(email);
        if (user && user.phone) {
          const requests = await getPendingRequests(user.phone);
          const pending = requests.filter(r => r.status === 'solicitado').length;
          setCount(pending);
        }
      }
    } catch (error) {
      console.error('Error loading pending count:', error);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading, refresh: loadCount };
}