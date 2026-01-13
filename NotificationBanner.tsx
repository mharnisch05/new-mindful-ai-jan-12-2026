import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Bell } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export function NotificationBanner() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayedNotifications, setDisplayedNotifications] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const initUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        fetchNotifications(data.user.id);
      }
    };
    initUser();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          supabase.auth.getUser().then(({ data }) => {
            if (data.user && payload.new && (payload.new as any).user_id === data.user.id) {
              const notification = payload.new as any;
              
              // Show banner for 5 seconds
              if (!displayedNotifications.has(notification.id)) {
                setNotifications(prev => [notification, ...prev]);
                setDisplayedNotifications(prev => new Set(prev).add(notification.id));
                
                setTimeout(() => {
                  setNotifications(prev => prev.filter(n => n.id !== notification.id));
                }, 5000);
              }
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [displayedNotifications]);

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) setNotifications(data);
  };

  const dismissNotification = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (notification: any) => {
    if (notification.link) {
      navigate(notification.link);
    }
    dismissNotification(notification.id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <div className="container mx-auto px-4 space-y-2 pointer-events-auto">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`
              flex items-center gap-3 p-4 rounded-lg shadow-2xl backdrop-blur-sm
              transition-all duration-300 ease-in-out
              animate-in fade-in slide-in-from-top-2
              ${notification.type === 'success' ? 'bg-green-500/95 text-white' : ''}
              ${notification.type === 'error' ? 'bg-red-500/95 text-white' : ''}
              ${notification.type === 'warning' ? 'bg-yellow-500/95 text-white' : ''}
              ${notification.type === 'info' ? 'bg-blue-500/95 text-white' : ''}
            `}
          >
            <div className="relative">
              <Bell className="w-5 h-5 flex-shrink-0" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" 
                    style={{ animationDuration: '1s', animationIterationCount: '2' }} />
            </div>
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => handleClick(notification)}
            >
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-xs opacity-90">{notification.message}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notification.id);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}