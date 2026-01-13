import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { TutorialDialog } from "@/components/onboarding/TutorialDialog";
import { supabase } from "@/integrations/supabase/client";

export function UnifiedNotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [showTutorialNotification, setShowTutorialNotification] = useState(false);
  const [hasMigrationNotification, setHasMigrationNotification] = useState(false);
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    checkTutorialStatus();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('unified-notifications-changes')
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
              setNotifications(prev => [payload.new as any, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Auto-dismiss info notifications after 5 seconds
              if ((payload.new as any).type === 'info') {
                setTimeout(() => {
                  dismissNotification((payload.new as any).id);
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
  }, []);

  useEffect(() => {
    if ((showTutorialNotification || unreadCount > 0) && blinkCount < 2) {
      const interval = setInterval(() => {
        setBlinkCount(prev => prev + 1);
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [showTutorialNotification, unreadCount, blinkCount]);

  const checkTutorialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!data || (!data.tutorial_completed && !data.tutorial_dismissed)) {
        setShowTutorialNotification(true);
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error);
    }
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      const migrationNotif = data.find(n => n.type === 'migration');
      setHasMigrationNotification(!!migrationNotif);
      setUnreadCount(data.length + (showTutorialNotification ? 1 : 0));
    }
  };

  const dismissNotification = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    // Log notification dismissal for audit trail
    if (user) {
      const notification = notifications.find(n => n.id === id);
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: `NOTIFICATION_DISMISSED_${notification?.type?.toUpperCase() || 'UNKNOWN'}`,
        entity_type: 'notification',
        entity_id: id,
        success: true,
      });
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const dismissTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_onboarding")
        .upsert({
          user_id: user.id,
          tutorial_dismissed: true,
        });

      setShowTutorialNotification(false);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error dismissing tutorial:", error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Log click for audit trail
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: `NOTIFICATION_CLICKED_${notification.type?.toUpperCase() || 'UNKNOWN'}`,
        entity_type: 'notification',
        entity_id: notification.id,
        success: true,
      });
    }
    
    // Handle migration notification specially
    if (notification.type === 'migration' && notification.link) {
      navigate(notification.link);
      await dismissNotification(notification.id);
      return;
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
    await dismissNotification(notification.id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const totalUnread = unreadCount + (showTutorialNotification ? 1 : 0);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-full">
            <Bell className="w-5 h-5" />
            {totalUnread > 0 && (
              <>
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground animate-in zoom-in"
                >
                  {totalUnread > 9 ? '9+' : totalUnread}
                </Badge>
                {blinkCount < 2 && (
                  <span 
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full animate-ping opacity-75"
                    style={{ animationDuration: '1s', animationIterationCount: '2' }}
                  />
                )}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-96">
          <div className="px-3 py-2 font-semibold">Notifications</div>
          <DropdownMenuSeparator />
          
          {/* Tutorial Notification */}
          {showTutorialNotification && (
            <>
              <DropdownMenuItem onClick={() => setTutorialDialogOpen(true)}>
                <div className="flex gap-3 w-full">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    ℹ
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Setup Tutorial Available</p>
                    <p className="text-xs text-muted-foreground">Get started with Mindful AI</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={dismissTutorial}>
                <span className="text-xs text-muted-foreground">Dismiss tutorial</span>
              </DropdownMenuItem>
              {notifications.length > 0 && <DropdownMenuSeparator />}
            </>
          )}

          {/* Regular Notifications */}
          {notifications.length === 0 && !showTutorialNotification ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No new notifications
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <DropdownMenuItem
                    className="cursor-pointer px-3 py-3 focus:bg-accent"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3 w-full">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString()} at{' '}
                          {new Date(notification.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {index < notifications.length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TutorialDialog
        open={tutorialDialogOpen}
        onOpenChange={setTutorialDialogOpen}
        onComplete={() => {
          setShowTutorialNotification(false);
          setTutorialDialogOpen(false);
          setUnreadCount(prev => Math.max(0, prev - 1));
        }}
        onDismiss={() => {
          dismissTutorial();
          setTutorialDialogOpen(false);
        }}
      />
    </>
  );
}
