import { useState, useEffect } from 'react';
import { type LinuxData, loadLinuxData } from '@/lib/linux-data';

export function useLinuxData() {
  const [data, setData] = useState<LinuxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLinuxData()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
