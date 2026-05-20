import { useState, useEffect, useCallback, useMemo } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const useCountdown = (target: string | number | Date | undefined) => {
  const targetDate = useMemo(() => {
    if (!target) return null;
    return target instanceof Date ? target : new Date(target);
  }, [target]);

  const calculateTimeLeft = useCallback((): TimeLeft => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    const difference = targetDate.getTime() - Date.now();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isExpired, setIsExpired] = useState(timeLeft.total <= 0);

  // Synchronize when calculateTimeLeft or targetDate changes
  useEffect(() => {
    if (!targetDate) return;

    const fresh = calculateTimeLeft();
    setTimeLeft(fresh);
    setIsExpired(fresh.total <= 0);

    // Only start timer if not already expired
    if (fresh.total <= 0) return;

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.total <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, targetDate]);

  return { timeLeft, isExpired };
};
