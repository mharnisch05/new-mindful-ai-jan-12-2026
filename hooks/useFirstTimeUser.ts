import { useState, useEffect } from 'react';

export function useFirstTimeUser(key: string) {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    setIsFirstTime(!stored);
    setLoading(false);
  }, [key]);

  const markAsCompleted = () => {
    localStorage.setItem(key, 'true');
    setIsFirstTime(false);
  };

  return { isFirstTime, loading, markAsCompleted };
}
