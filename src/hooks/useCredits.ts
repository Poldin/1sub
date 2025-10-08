import { useEffect, useState } from 'react';

export function useCredits(userId?: string) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(!userId);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    
    // Fetch credit balance from API
    fetch(`/api/v1/credits/balance?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setBalance(data.balance || 0);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching credit balance:', error);
        setBalance(0);
        setLoading(false);
      });
  }, [userId]);

  return { balance, loading };
}


