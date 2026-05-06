import { useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { dataService } from '@/src/services/dataService';

export function PresenceListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Initial check-in
    dataService.updateUserPresence(user.id);

    // Heartbeat every 2 minutes
    const interval = setInterval(() => {
      dataService.updateUserPresence(user.id);
    }, 2 * 60 * 1000);

    // Set offline when tab closes (not perfectly reliable in Firestore but good practice)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dataService.updateUserPresence(user.id);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      // We don't explicitly set to false here so it survives page refreshes 
      // but let the timeout logic handle it
    };
  }, [user?.id]);

  return null;
}
