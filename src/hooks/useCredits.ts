import { useEffect, useState } from 'react';
import { getCreditBalance } from '@/lib/credits';

export function useCredits(userId?: string) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(!userId);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getCreditBalance(userId).then((b) => {
      setBalance(b.balance);
      setLoading(false);
    });
  }, [userId]);

  return { balance, loading };
}


