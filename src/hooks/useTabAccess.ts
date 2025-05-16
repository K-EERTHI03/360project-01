import { useAuth } from '../contexts/AuthContext';
import { useQuery, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { toast } from '../components/ui/use-toast';
import { Group } from '../types/Group';
import { useCallback, useEffect } from 'react';

const STALE_TIME = 30 * 60 * 1000; // 30 minutes
const CACHE_TIME = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const QUERY_KEY = 'user-groups' as const;

export const useTabAccess = (tabName: string): { hasAccess: boolean; isLoading: boolean; refetch: () => Promise<void> } => {
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

  const { data: userGroups, isError, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: () => fetchUserGroups(user?.id),
    ...queryOptions
  });

  const refreshAccess = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEY, user.id],
        queryFn: () => fetchUserGroups(user.id),
        ...queryOptions
      });
    }
  }, [user?.id, queryClient]);

  if (isAdmin) return {
    hasAccess: true,
    isLoading: false,
    refetch: refreshAccess
  };
  if (!user?.id) return {
    hasAccess: false,
    isLoading: false,
    refetch: refreshAccess
  };
  if (isLoading) return {
    hasAccess: false,
    isLoading: true,
    refetch: refreshAccess
  };
  if (isError || !userGroups) return {
    hasAccess: false,
    isLoading: false,
    refetch: refreshAccess
  };

  const hasAccess = userGroups?.some(group => 
    group.accessibleTabs.includes(tabName) &&
    isGroupValid(group)
  ) ?? false;

  return { hasAccess, isLoading: false, refetch: refreshAccess };
};

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

const fetchUserGroups = async (userId: string | undefined): Promise<Group[]> => {
  if (!userId) {
    console.warn('Attempted to fetch groups without a user ID');
    return [];
  }
  
  try {
    const response = await fetch(`/api/users/${userId}/groups`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user groups: ${response.status} - ${errorText || response.statusText}`);
    }
    
    const groups: Group[] = await response.json();
    return groups.filter(group => {
      const isValid = 
        group &&
        typeof group.id === 'string' &&
        typeof group.createdAt === 'string' &&
        typeof group.expiryDays === 'number' &&
        Array.isArray(group.accessibleTabs);
      
      if (!isValid) {
        console.warn(`Invalid group data received for group ${group?.name || group?.id || 'unknown'}:`, group);
      }
      return isValid;
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    throw error;
  }
};