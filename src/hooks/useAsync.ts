import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

interface UseAsyncOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  module?: string;
}

export function useAsync<T = any>(options: UseAsyncOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (promise: Promise<T>, context?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await promise;
      setData(result);
      if (options.onSuccess) options.onSuccess(result);
      if (context) logger.success(options.module || 'useAsync', context, result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Ocurrió un error';
      setError(errorMessage);
      if (options.onError) options.onError(err);
      if (context) logger.error(options.module || 'useAsync', context, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { loading, error, data, execute, reset, setLoading, setError };
}