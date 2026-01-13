import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare } from "lucide-react";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

export default function Messages() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      markMessagesAsRead(selectedClientId);
      loadMessages();

      // Set up realtime subscription
      const channel = supabase
        .channel(`therapist-messages-${selectedClientId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `client_id=eq.${selectedClientId}`,
          },
          () => {
            loadMessages();
            markMessagesAsRead(selectedClientId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadClients = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("therapist_id", user.id)
        .order("first_name");

      if (error) throw error;

      setClients(data || []);
      if (data && data.length > 0) {
        setSelectedClientId(data[0].id);
      }
      
      // Load unread counts
      if (data) {
        const counts: Record<string, number> = {};
        await Promise.all(
          data.map(async (client) => {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("client_id", client.id)
              .eq("sender_type", "client")
              .eq("read", false);
            counts[client.id] = count || 0;
          })
        );
        setUnreadCounts(counts);
      }
    } catch (error) {
      await handleError(error, '/messages', toast);
    }
  }, [toast]);

  const markMessagesAsRead = useCallback(async (clientId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("messages")
        .update({ read: true })
        .eq("client_id", clientId)
        .eq("sender_type", "client")
        .eq("read", false);

      setUnreadCounts(prev => ({ ...prev, [clientId]: 0 }));
    } catch (error) {
      await handleError(error, '/messages', toast);
    }
  }, [toast]);

  const loadMessages = useCallback(async () => {
    if (!selectedClientId) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("client_id", selectedClientId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      await handleError(error, '/messages', toast);
    }
  }, [selectedClientId, toast]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedClientId) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        sender_type: 'therapist',
        client_id: selectedClientId,
        therapist_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      // Send notification to client
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("user_id")
        .eq("client_id", selectedClientId)
        .maybeSingle();

      if (clientUser) {
        await supabase.from("notifications").insert({
          user_id: clientUser.user_id,
          title: "New Message",
          message: "You have a new message from your therapist",
          link: "/client-portal",
        });
      }

      setNewMessage("");
    } catch (error) {
      await handleError(error, '/messages', toast);
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedClientId, toast]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">Communicate with your clients</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Client List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients yet</p>
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <Button
                    key={client.id}
                    variant={selectedClientId === client.id ? "default" : "ghost"}
                    className="w-full justify-start relative"
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {client.first_name} {client.last_name}
                    {unreadCounts[client.id] > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                        {unreadCounts[client.id]}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col max-h-[calc(100vh-12rem)]">
          <CardHeader>
            <CardTitle>
              {(() => {
                const selectedClient = clients.find((c) => c.id === selectedClientId);
                return selectedClientId && selectedClient
                  ? `Conversation with ${selectedClient.first_name} ${selectedClient.last_name}`
                  : "Select a client";
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0">
            {!selectedClientId ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Select a client to start messaging</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'therapist' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_type === 'therapist'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm break-words">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-20 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="self-end">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}