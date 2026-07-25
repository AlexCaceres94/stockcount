import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { QueryClient } from '@tanstack/react-query';

import { flushQueue, getQueueLength } from '../offline/syncQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  return { isOnline };
}

export function useSyncOnReconnect(queryClient: QueryClient) {
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!online) {
        wasOffline.current = true;
        return;
      }

      if (online && wasOffline.current) {
        wasOffline.current = false;
        const pending = await getQueueLength();
        if (pending > 0) {
          const result = await flushQueue();
          console.log(`[sync] reconnected: synced ${result.synced}, ${result.remaining} still pending`);
        }
        queryClient.invalidateQueries({ queryKey: ['items'] });
      }
    });

    return () => unsubscribe();
  }, [queryClient]);
}
