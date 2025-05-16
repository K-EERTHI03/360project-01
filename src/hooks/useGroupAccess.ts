import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../components/ui/use-toast';
import { groupService } from '../services/groupService';
import { Group } from '../types/Group';
import { useCallback, useEffect } from 'react';

const STALE_TIME = 30 * 60 * 1000; // 30 minutes
const CACHE_TIME = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const QUERY_KEY = 'user-groups' as const;

export interface GroupAccess {
  groups: Group[];
  isLoading: boolean;
  hasAccess: boolean;
  refetch: () => Promise<void>;
}

export const useGroupAccess = (tabName?: string): GroupAccess => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const queryOptions = {
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex: number) => Math.min(BASE_RETRY_DELAY * 2 ** attemptIndex, MAX_RETRY_DELAY),
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
    onError: (err: Error) => {
      console.error('Failed to fetch user groups:', err);
      toast({
        title: 'Access Error',
        description: err instanceof Error 
          ? `Access verification failed: ${err.message}` 
          : 'Failed to verify access permissions. Please try again later.',
        variant: 'destructive'
      });
    }
  } as const;

  const { data: groups = [], isError, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: () => groupService.getUserGroups(user?.id!),
    ...queryOptions
  });

  const refreshAccess = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEY, user.id],
        queryFn: () => groupService.getUserGroups(user.id!),
        ...queryOptions
      });
    }
  }, [user?.id, queryClient]);

  const isGroupValid = (group: Group): boolean => {
    if (!group?.createdAt || typeof group.expiryDays !== 'number') {
      console.warn('Invalid group data:', group);
      return false;
    }

    try {
      const expiryDate = new Date(group.createdAt);
      if (isNaN(expiryDate.getTime())) {
        console.warn('Invalid date format for group:', group.id);
        return false;
      }
      expiryDate.setDate(expiryDate.getDate() + group.expiryDays);
      return new Date() < expiryDate;
    } catch (error) {
      console.error('Error validating group expiry:', error);
      return false;
    }
  };

  const hasAccess = isAdmin || (!tabName ? true : groups.some(group => 
    group.accessibleTabs.includes(tabName) && isGroupValid(group)
  ));

  return {
    groups: groups.filter(isGroupValid),
    isLoading,
    hasAccess,
    refetch: refreshAccess
  };
};