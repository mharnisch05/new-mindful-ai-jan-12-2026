import { useState, useEffect } from 'react';

export function useClientPortalFirstTime() {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = 'client_portal_first_visit';
    const stored = localStorage.getItem(key);
    setIsFirstTime(!stored);
    setLoading(false);
  }, []);

  const markAsCompleted = () => {
    const key = 'client_portal_first_visit';
    localStorage.setItem(key, 'true');
    setIsFirstTime(false);
  };

  return { isFirstTime, loading, markAsCompleted };
}
