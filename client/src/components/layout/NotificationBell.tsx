import React, { useEffect, useState } from 'react';
import { Bell, Package, Store, Info } from 'lucide-react';
import { useNotificationStore, AppNotification } from '../../stores/notificationStore.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { Button } from '../ui/button.js';
import { ScrollArea } from '../ui/scroll-area.js';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils.js';

import { useAuthStore } from '../../stores/authStore.js';

export const NotificationBell = () => {
  const { 
    notifications, unreadCount, startPolling, stopPolling, 
    markAsRead, markAllAsRead 
  } = useNotificationStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleNotificationClick = (notification: AppNotification) => {
    setOpen(false);
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigation logic based on notification type
    if (user?.role === 'admin') {
      if (notification.type === 'shop_approval' && notification.relatedEntityId) {
        navigate(`/shop/${notification.relatedEntityId}`);
      } else if ((notification.type === 'new_order' || notification.type === 'order_status') && notification.relatedEntityId) {
        navigate(`/order/${notification.relatedEntityId}`); 
      } else if (notification.type === 'new_visit' && notification.relatedEntityId) {
        navigate(`/admin/employee/${notification.relatedEntityId}`);
      } else {
        navigate('/admin');
      }
    } else {
      // Salesman logic
      if (notification.type === 'shop_approval' && notification.relatedEntityId) {
        navigate(`/shop/${notification.relatedEntityId}`);
      } else if ((notification.type === 'new_order' || notification.type === 'order_status') && notification.relatedEntityId) {
        navigate(`/order/${notification.relatedEntityId}`);
      } else {
        navigate('/salesman');
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'shop_approval': return <Store className="size-4 text-blue-500" />;
      case 'new_order': return <Package className="size-4 text-emerald-500" />;
      case 'order_status': return <Package className="size-4 text-orange-500" />;
      case 'new_visit': return <Info className="size-4 text-purple-500" />;
      default: return <Info className="size-4 text-slate-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-200">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white border border-[#050806] leading-none">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 border-[#1a231f] bg-[#0a0f0d] text-slate-200 mt-2 z-50">
        <div className="flex items-center justify-between p-4 border-b border-[#1a231f]">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-400">
                {unreadCount}
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="h-auto px-2 py-1 text-xs rounded-md border border-[#1a231f] bg-[#101512] text-emerald-500 hover:text-emerald-400 disabled:opacity-40 disabled:pointer-events-none hover:bg-[#1a231f] transition-all"
          >
            Mark all as read
          </Button>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex gap-3 p-4 cursor-pointer hover:bg-slate-900/40 transition-all border-b border-[#1a231f]/50 last:border-0",
                    !n.isRead ? "bg-emerald-950/10 border-l-2 border-l-emerald-500 pl-3.5" : "opacity-50 hover:opacity-90"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 shrink-0 size-8 rounded-full flex items-center justify-center border",
                    !n.isRead ? "bg-emerald-950/30 border-emerald-900/50" : "bg-slate-900 border-slate-800"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("text-sm font-medium leading-tight", !n.isRead ? "text-slate-200" : "text-slate-400")}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={cn("text-xs line-clamp-2 leading-relaxed", !n.isRead ? "text-slate-300" : "text-slate-500")}>
                      {n.message}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="shrink-0 self-center">
                      <div className="size-2 rounded-full bg-emerald-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-[#1a231f] bg-[#0c100e] text-center">
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
            className="w-full text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-[#1a231f] py-2 rounded-lg transition-all"
          >
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
