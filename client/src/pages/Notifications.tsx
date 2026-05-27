import React from 'react';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft, Bell, CheckSquare, 
  Info, Package, Store
} from 'lucide-react';
import { useNotificationStore, AppNotification } from '../stores/notificationStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent } from '../components/ui/card.js';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils.js';
import { toast } from 'sonner';
import { queryClient } from '../lib/queryClient.js';
import { PaginatedList } from '../components/ui/PaginatedList.js';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
      // Invalidate the TanStack pagination queries to refetch instantly
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Re-trigger background notifications fetch to keep unread badges synced
      fetchNotifications();
    }

    // Dynamic routing target redirection
    if (user?.role === 'admin') {
      if (n.type === 'shop_approval' && n.relatedEntityId) {
        navigate(`/shop/${n.relatedEntityId}`);
      } else if ((n.type === 'new_order' || n.type === 'order_status') && n.relatedEntityId) {
        navigate(`/order/${n.relatedEntityId}`);
      } else if (n.type === 'new_visit' && n.relatedEntityId) {
        navigate(`/admin/employee/${n.relatedEntityId}`);
      }
    } else {
      if (n.type === 'shop_approval' && n.relatedEntityId) {
        navigate(`/shop/${n.relatedEntityId}`);
      } else if ((n.type === 'new_order' || n.type === 'order_status') && n.relatedEntityId) {
        navigate(`/order/${n.relatedEntityId}`);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
      // Invalidate the TanStack pagination queries to refetch instantly
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Re-trigger background notifications fetch
      fetchNotifications();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'shop_approval': return <Store className="size-4.5 text-blue-500" />;
      case 'new_order': return <Package className="size-4.5 text-emerald-500" />;
      case 'order_status': return <Package className="size-4.5 text-orange-500" />;
      case 'new_visit': return <Info className="size-4.5 text-purple-500" />;
      default: return <Info className="size-4.5 text-slate-500" />;
    }
  };

  const emptyState = (
    <Card className="border-[#1a231f] bg-[#0c100e] p-8 text-center select-none">
      <div className="flex flex-col items-center justify-center gap-3">
        <Bell className="size-10 text-slate-600 animate-pulse" />
        <h3 className="font-semibold text-slate-300 text-sm">Catalog is empty</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          You do not have any notification records stored in your profile system.
        </p>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#050806] text-slate-100 pb-12">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-20 bg-[#050806]/85 backdrop-blur-md border-b border-[#1a231f] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="text-slate-400 hover:text-slate-200 bg-[#101512] border border-[#1a231f] h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight flex items-center gap-2">
              Notifications Control Centre
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">All Alerts & Logs</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleMarkAllAsRead}
          className="h-8 text-xs font-semibold bg-[#101512] border-[#1a231f] text-emerald-400 hover:text-emerald-300 hover:bg-[#1a231f] transition-all flex items-center gap-1.5"
        >
          <CheckSquare className="size-3.5" />
          <span>Mark All Read</span>
        </Button>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full flex flex-col gap-6">
        
        {/* Paginated List Rendering */}
        <PaginatedList<AppNotification>
          queryKeyPrefix="notifications"
          endpoint="/notifications"
          perPage={10}
          dataKey="notifications"
          emptyState={emptyState}
          itemKeyExtractor={(n) => n.id}
          renderItem={(n) => (
            <div
              onClick={() => handleNotificationClick(n)}
              className={cn(
                "flex gap-3 p-4 bg-[#0c100e] border border-[#1a231f] rounded-xl cursor-pointer hover:bg-slate-900/40 hover:border-slate-800 transition-all relative group",
                !n.isRead ? "border-l-3 border-l-emerald-500 pl-3.5 bg-[#0e1411]/40" : "opacity-60 hover:opacity-100"
              )}
            >
              {/* Icon Area */}
              <div className={cn(
                "shrink-0 size-9 rounded-xl flex items-center justify-center border transition-all mt-0.5",
                !n.isRead ? "bg-emerald-950/30 border-emerald-900/50" : "bg-slate-900 border-slate-800"
              )}>
                {getIcon(n.type)}
              </div>

              {/* Text Details Area */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex justify-between items-start gap-3">
                  <span className={cn("text-xs font-bold leading-tight group-hover:text-emerald-400 transition-colors", !n.isRead ? "text-slate-200" : "text-slate-400")}>
                    {n.title}
                  </span>
                  <span className="text-[9px] text-slate-500 whitespace-nowrap shrink-0 font-medium">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={cn("text-xs leading-relaxed font-normal mt-0.5", !n.isRead ? "text-slate-300" : "text-slate-500")}>
                  {n.message}
                </p>
              </div>

              {/* Pulsing indicator */}
              {!n.isRead && (
                <div className="shrink-0 self-center pl-1">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
          )}
        />

      </div>
    </div>
  );
};
