import { create } from 'zustand';
import { apiClient } from '../api/client.js';
import { useAppStore } from './appStore.js';
import { toast } from 'sonner';
import { onlineManager } from '@tanstack/react-query';

export interface QueuedAction {
  id: string;
  type: 'ADD_SHOP' | 'ADD_VISIT' | 'ADD_ORDER';
  payload: any;
  tempId?: string;
  createdAt: string;
  error?: string;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedAction[];
  setOnline: (online: boolean) => void;
  queueAction: (type: 'ADD_SHOP' | 'ADD_VISIT' | 'ADD_ORDER', payload: any, tempId?: string) => void;
  syncQueue: () => Promise<void>;
  clearQueue: () => void;
}

// Safely access localStorage to support private browsing modes or restricted environments
const getSavedQueue = (): QueuedAction[] => {
  try {
    const saved = localStorage.getItem('sales-app-offline-queue');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('LocalStorage is not available for reading offline queue. Using memory-only queue.', e);
    return [];
  }
};

const saveQueue = (queue: QueuedAction[]) => {
  try {
    localStorage.setItem('sales-app-offline-queue', JSON.stringify(queue));
  } catch (e) {
    console.warn('LocalStorage is not available for writing offline queue.', e);
  }
};

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof window !== 'undefined' ? onlineManager.isOnline() : true,
  queue: getSavedQueue(),

  setOnline: (online) => {
    const wasOffline = !get().isOnline;
    set({ isOnline: online });
    if (online && wasOffline) {
      toast.success('Network connection restored. Syncing offline data...');
      get().syncQueue();
    }
  },

  queueAction: (type, payload, tempId) => {
    const newAction: QueuedAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      tempId,
      createdAt: new Date().toISOString(),
    };
    const updatedQueue = [...get().queue, newAction];
    set({ queue: updatedQueue });
    saveQueue(updatedQueue);
  },

  clearQueue: () => {
    set({ queue: [] });
    saveQueue([]);
  },

  syncQueue: async () => {
    const activeQueue = [...get().queue];
    if (activeQueue.length === 0) return;

    let syncFailed = false;

    for (let i = 0; i < activeQueue.length; i++) {
      const action = activeQueue[i];
      
      try {
        if (action.type === 'ADD_SHOP') {
          const response = await apiClient.post('/shops', action.payload);
          const realShop = response.data;
          const realShopId = realShop.id;

          // Replace tempId with the real ID in the local appStore
          if (action.tempId) {
            useAppStore.setState((state) => ({
              shops: state.shops.map((s) => (s.id === action.tempId ? realShop : s)),
              visits: state.visits.map((v) => (v.shopId === action.tempId ? { ...v, shopId: realShopId, shopName: realShop.name } : v)),
              orders: state.orders.map((o) => (o.shopId === action.tempId ? { ...o, shopId: realShopId } : o)),
            }));

            // Resolve tempId in subsequent queue items
            for (let j = i + 1; j < activeQueue.length; j++) {
              const nextAction = activeQueue[j];
              if (nextAction.payload && nextAction.payload.shopId === action.tempId) {
                nextAction.payload.shopId = realShopId;
              }
            }
          }
        } 
        
        else if (action.type === 'ADD_VISIT') {
          const response = await apiClient.post('/visits', action.payload);
          const realVisit = response.data;
          
          if (action.tempId) {
            useAppStore.setState((state) => ({
              visits: state.visits.map((v) => (v.id === action.tempId ? realVisit : v)),
            }));
          }
        } 
        
        else if (action.type === 'ADD_ORDER') {
          const response = await apiClient.post('/orders', action.payload);
          const realOrder = response.data;

          if (action.tempId) {
            useAppStore.setState((state) => ({
              orders: state.orders.map((o) => (o.id === action.tempId ? realOrder : o)),
            }));
          }
        }

        // Successfully synced. Remove it from our temporary active list and save progress
        activeQueue.splice(i, 1);
        set({ queue: activeQueue });
        saveQueue(activeQueue);
        i--; // Adjust index since we removed an item
      } 
      
      catch (error: any) {
        console.error(`Sync failed for action ${action.id}:`, error);

        const isValidationError = error.response?.status === 400 || 
                                  error.response?.status === 422 ||
                                  error.response?.status === 403 ||
                                  error.response?.status === 404;

        if (isValidationError) {
          // Permanent failure due to validation/client error. 
          // 1. Alert the salesman
          const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Validation failed';
          toast.error(`Sync failed permanently for ${action.type}: ${errorMsg}. Skipping action.`);

          // 2. Remove the failing item
          activeQueue.splice(i, 1);
          
          // 3. Cascade cancellation for downstream items that depend on this temp shop ID (if ADD_SHOP failed)
          if (action.type === 'ADD_SHOP' && action.tempId) {
            toast.error(`Cascade canceling all queued orders & visits depending on Shop '${action.payload.name || 'Unknown'}'`);
            
            // Remove optimistic shop, visits and orders
            useAppStore.setState((state) => ({
              shops: state.shops.filter((s) => s.id !== action.tempId),
              visits: state.visits.filter((v) => v.shopId !== action.tempId),
              orders: state.orders.filter((o) => o.shopId !== action.tempId),
            }));

            // Filter out downstream visits and orders from the queue
            for (let j = 0; j < activeQueue.length; j++) {
              const nextAction = activeQueue[j];
              if (nextAction.payload && nextAction.payload.shopId === action.tempId) {
                activeQueue.splice(j, 1);
                j--; // adjust index after removal
              }
            }
          } else if (action.tempId) {
            // Remove other optimistic failed items
            useAppStore.setState((state) => ({
              visits: state.visits.filter((v) => v.id !== action.tempId),
              orders: state.orders.filter((o) => o.id !== action.tempId),
            }));
          }

          set({ queue: activeQueue });
          saveQueue(activeQueue);
          i--; // Adjust index
        } else {
          // Network error or 5xx Server error. Retain item in queue, pause sync and try again later.
          syncFailed = true;
          toast.error('Sync paused due to connection error. Will retry when connection stabilizes.');
          break;
        }
      }
    }
  },
}));

// Listen for browser online/offline events via TanStack Query's onlineManager
if (typeof window !== 'undefined') {
  onlineManager.subscribe((online) => {
    useOfflineStore.getState().setOnline(online);
  });
}
