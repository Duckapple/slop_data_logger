import { useCallback, useEffect, useState } from 'react';

type State<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): State<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: true,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await run();
      setState({ data, error: null, loading: false });
    } catch (err) {
      setState({
        data: null,
        error: err instanceof Error ? err : new Error(String(err)),
        loading: false,
      });
    }
  }, [run]);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    run()
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (alive)
          setState({
            data: null,
            error: err instanceof Error ? err : new Error(String(err)),
            loading: false,
          });
      });
    return () => {
      alive = false;
    };
  }, [run]);

  return { ...state, refetch };
}
