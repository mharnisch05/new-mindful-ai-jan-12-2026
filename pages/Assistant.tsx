import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Mic, MicOff, Lock, FileUp, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AutoDismissBanner } from "@/components/ui/auto-dismiss-banner";
import { useAIActionLogger } from "@/hooks/useAIActionLogger";
import { handleError } from "@/utils/errorTracking";

type Message = {
  role: "user" | "assistant";
  content: string;
  isAction?: boolean;
  actionType?: string;
};

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface WindowWithSpeechRecognition extends Window {
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechRecognition?: new () => SpeechRecognition;
}

export default function Assistant() {
  const [searchParams] = useSearchParams();
  const isMigrationMode = searchParams.get('migration') === 'true';
  const { features, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [loadingHistory, setLoadingHistory] = useState(true);
  const greetingOptions = [
    "How can I help you today?",
    "What can I do for you today?",
    "How can I assist you right now?",
  ];
  const initialAssistantIntro = isMigrationMode 
    ? "👋 Welcome to the Mindful AI Migration Assistant!\n\nI'm here to help you seamlessly transfer your data from your previous platform. I can assist you with:\n\n• Client Profiles - Import client information\n• SOAP Notes - Transfer session records\n• Appointments - Migrate your schedule\n• Documents - Upload and organize files\n\nPlease describe what type of data you'd like to migrate, or upload your files to get started!"
    : "👋 Hi — I'm your AI Assistant.\n\nI help you manage clients, appointments, notes, billing, and reminders so you can spend more time with clients and less on admin.";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant" as const, content: initialAssistantIntro, isAction: false },
    ...(!isMigrationMode ? [{ role: "assistant" as const, content: greetingOptions[Math.floor(Math.random() * greetingOptions.length)] }] : [])
  ]);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAutoSuggestion, setShowAutoSuggestion] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { toast } = useToast();
  const { logAction } = useAIActionLogger();
  const [successBanner, setSuccessBanner] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const ACTION_SUCCESS: Record<string, string> = {
    create_reminder: "Reminder created successfully!",
    update_reminder: "Reminder updated successfully!",
    delete_reminder: "Reminder deleted successfully!",
    create_appointment: "Appointment scheduled successfully!",
    update_appointment: "Appointment updated successfully!",
    delete_appointment: "Appointment deleted successfully!",
    create_invoice: "Invoice created successfully!",
    update_invoice: "Invoice updated successfully!",
    delete_invoice: "Invoice deleted successfully!",
  };

  interface ActionPayload {
    action: string;
    params: Record<string, unknown>;
  }

  const extractActionPayload = (text: string): ActionPayload | null => {
    if (!text || typeof text !== 'string') return null;
    
    // Try to extract JSON from code fences first (most reliable)
    try {
      const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
      if (fenceMatch && fenceMatch[1]) {
        const obj = JSON.parse(fenceMatch[1].trim());
        if (obj && typeof obj === 'object' && obj.action && obj.params) {
          return { action: String(obj.action), params: obj.params };
        }
      }
    } catch {
      // Continue to next method
    }
    
    // Try to find JSON object in the text
    try {
      const actionIdx = text.indexOf('{');
      const lastIdx = text.lastIndexOf('}');
      if (actionIdx !== -1 && lastIdx !== -1 && lastIdx > actionIdx) {
        const candidate = text.slice(actionIdx, lastIdx + 1);
        const obj = JSON.parse(candidate);
        if (obj && typeof obj === 'object' && obj.action && obj.params) {
          return { action: String(obj.action), params: obj.params };
        }
      }
    } catch {
      // Continue to next method
    }
    
    // Try ACTION: prefix pattern
    try {
      const alt = text.match(/ACTION:\s*(\{[\s\S]*\})/i);
      if (alt && alt[1]) {
        const obj = JSON.parse(alt[1]);
        if (obj && typeof obj === 'object' && obj.action && obj.params) {
          return { action: String(obj.action), params: obj.params };
        }
      }
    } catch {
      // No action found
    }
    
    return null;
  };

  const cleanResponseText = (text: string): string => {
    // Remove JSON code blocks
    let cleaned = text.replace(/```json\s*[\s\S]*?\s*```/gi, '');
    // Remove standalone JSON objects
    cleaned = cleaned.replace(/\{\s*"action"\s*:\s*"[^"]*"\s*,\s*"params"\s*:\s*\{[\s\S]*?\}\s*\}/g, '');
    // Remove ACTION: prefix lines
    cleaned = cleaned.replace(/ACTION:\s*\{[\s\S]*?\}/gi, '');
    return cleaned.trim();
  };

  interface AIActionResponse {
    error?: string;
    result?: {
      id?: string;
    };
  }

  const executeAIAction = async (action: string, params: Record<string, unknown>) => {
    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('You need to be signed in to let the assistant perform this action.');
        }

        // Validate action and params
        if (!action || typeof action !== 'string') {
          throw new Error('Invalid action specified.');
        }

        if (!params || typeof params !== 'object') {
          throw new Error('Invalid parameters provided.');
        }

        const { data, error } = await supabase.functions.invoke<AIActionResponse>('ai-action-executor', {
          body: { action, params, timezone: userTimezone },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (error) {
          const apiMessage = data?.error || error.message;
          
          // Check if it's a retryable error
          const isRetryable = /rate limit|timeout|network|temporary|unavailable/i.test(apiMessage || '');
          
          if (isRetryable && retryCount < maxRetries) {
            retryCount++;
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          
          throw new Error(apiMessage || 'The assistant had trouble completing that request. Please try again in a moment.');
        }

        // Success - log and notify
        const message = ACTION_SUCCESS[action] || 'Action completed successfully!';
        setSuccessBanner({ show: true, message });
        toast({ title: 'AI Action Completed', description: message });
        await logAction(action, message, action.split('_')[1], data?.result?.id ?? null, true);

        setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${message}`, isAction: true, actionType: action }]);
        return; // Success, exit retry loop
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const isRetryable = /rate limit|timeout|network|temporary|unavailable/i.test(errorObj.message);
        
        // If retryable and haven't exceeded max retries, continue loop
        if (isRetryable && retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        // Final failure - log and show error
        await handleError(error, '/assistant', toast);
        const errorMsg = errorObj.message || 'The assistant could not complete that request.';
        await logAction(action, errorMsg, action.split('_')[1], null, false);
        
        // Provide helpful error message
        let userFriendlyMessage = errorMsg;
        if (errorMsg.includes('client') || errorMsg.includes('Client')) {
          userFriendlyMessage = 'Could not find the client. Please make sure the client name is correct and try again.';
        } else if (errorMsg.includes('date') || errorMsg.includes('time')) {
          userFriendlyMessage = 'There was an issue with the date or time. Please try again with a clearer date/time.';
        } else if (errorMsg.includes('unauthorized') || errorMsg.includes('permission')) {
          userFriendlyMessage = 'You don\'t have permission to perform this action.';
        }
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ I wasn't able to complete that. ${userFriendlyMessage}` 
        }]);
        break; // Exit retry loop
      }
    }
    
    setIsLoading(false);
  };

  // Load quickly - mark as loaded after initial render
  useEffect(() => {
    const timer = setTimeout(() => setLoadingHistory(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check if AI Assistant is available
  if (!subscriptionLoading && !features.ai_assistant) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">AI Assistant - Solo Feature</CardTitle>
            <CardDescription className="text-base mt-2">
              Unlock the AI Assistant with intelligent insights and migration support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-accent/20 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Solo includes:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• AI-powered documentation assistant</li>
                <li>• Automated SOAP note generation</li>
                <li>• Intelligent appointment scheduling</li>
                <li>• Data migration assistant</li>
                <li>• Advanced analytics and insights</li>
              </ul>
            </div>
            <Button onClick={() => navigate("/pricing")} className="w-full" size="lg">
              Upgrade to Solo - $49/month
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for pre-filled text from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillText = params.get('prefill');
    if (prefillText) {
      setInput(prefillText);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Reset inactivity timer on any message change
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (messages.length > 1 && !isLoading) {
      setShowAutoSuggestion(false);
      inactivityTimerRef.current = setTimeout(() => {
        setShowAutoSuggestion(true);
      }, 5000);
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [messages, isLoading]);

  useEffect(() => {
    // Update current date/time on mount and every minute
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      const timeString = now.toLocaleString('en-US', options);
      const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
      setCurrentDateTime(`${greeting} — ${timeString} (Local time)`);
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionClass = windowWithSpeech.webkitSpeechRecognition || windowWithSpeech.SpeechRecognition;
    
    if (SpeechRecognitionClass) {
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsRecording(false);
        toast({
          title: "Speech recognition error",
          description: "Could not process voice input. Please try again.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Listening...",
        description: "Speak now to dictate your message or session notes.",
      });
    }
  };

  const handleSend = async (messageContent?: string) => {
    const messageToSend = messageContent || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Set 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Get the user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Please log in to use the assistant");
      }

      // Get user timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: [...messages, userMessage], timezone: userTimezone }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = "Failed to get response from AI";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const rawContent = data.response || data.content || data.message || "No response from AI";
      
      // Extract action payload BEFORE cleaning the text
      const payload = extractActionPayload(rawContent);
      
      // Clean the response to remove JSON/backend code
      const cleanedContent = cleanResponseText(rawContent);
      
      const assistantMessage: Message = { 
        role: "assistant", 
        content: cleanedContent || "Got it! Processing your request..." 
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Execute the AI action if found
      if (payload && payload.action && payload.params) {
        await executeAIAction(payload.action, payload.params);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Track error for debugging
      await handleError(error, '/assistant', toast);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const isAbortError = errorObj.name === 'AbortError' || errorObj.message.includes('aborted');
      const isNetworkError = /Both models failed|No working AI provider|Bad Gateway|AI Router|Network|fetch/i.test(errorObj.message);
      
      if (isAbortError) {
        toast({
          title: "Request timed out",
          description: "The request took too long. Please try again with a shorter message.",
          variant: "destructive",
        });
        
        const timeoutMessage: Message = {
          role: "assistant",
          content: "⏱️ Request timed out. Please try rephrasing your question or breaking it into smaller parts."
        };
        setMessages((prev) => [...prev, timeoutMessage]);
      } else {
        const friendly = isNetworkError
          ? "AI Assistant is temporarily unavailable. Please try again in a few seconds."
          : (errorObj.message || "Failed to get response from AI assistant. Please try again.");

        // Add error message with helpful context
        const errorMessage: Message = {
          role: "assistant",
          content: `❌ ${friendly}\n\nYou can try:\n• Rephrasing your question\n• Breaking it into smaller parts\n• Checking your internet connection`
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Developer-only health check removed from UI to keep assistant branding clean

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <AutoDismissBanner message={successBanner.message} show={successBanner.show} onDismiss={() => setSuccessBanner(s => ({ ...s, show: false }))} />
      {/* Header */}
      <div className="border-b px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isMigrationMode ? (
                <>
                  <FileUp className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Migration Assistant</span>
                </>
              ) : (
                <>
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-semibold">AI Assistant</span>
                </>
              )}
            </div>
            {currentDateTime && !isMigrationMode && (
              <span className="text-sm text-muted-foreground border-l pl-3">
                {currentDateTime}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              disabled={isLoading}
              className={isRecording ? "text-destructive" : ""}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-8 ${
                message.role === "user" ? "flex justify-end" : ""
              }`}
            >
              <div className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""} max-w-full`}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                  {message.role === "assistant" ? (
                    <Bot className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 space-y-2 overflow-hidden">
                  <div className="text-sm font-semibold">
                    {message.role === "assistant" ? "AI Assistant" : "You"}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                    {message.isAction && (
                      <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Action Completed
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Changes synced to database
                        </p>
                      </div>
                    )}
                    {message.content.includes('❌') && message.role === 'assistant' && (
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            // Find the last user message
                            const lastUserMessage = [...messages]
                              .reverse()
                              .find(m => m.role === 'user');
                            if (lastUserMessage) {
                              // Remove the error message and retry
                              setMessages(prev => prev.slice(0, -1));
                              handleSend(lastUserMessage.content);
                            }
                          }}
                        >
                          Regenerate Response
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {showAutoSuggestion && !isLoading && messages.length > 1 && (
            <div className="animate-fade-in p-4 bg-accent/20 rounded-lg border border-accent/50 mb-4">
              <p className="text-sm text-muted-foreground mb-3">Suggested actions:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAutoSuggestion(false);
                    handleSend("Schedule an appointment");
                  }}
                >
                  Schedule appointment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAutoSuggestion(false);
                    handleSend("Create a SOAP note");
                  }}
                >
                  Create SOAP note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAutoSuggestion(false);
                    handleSend("Show client progress");
                  }}
                >
                  View progress
                </Button>
              </div>
            </div>
          )}
          
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="mb-8">
              <div className="flex gap-4 max-w-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                  <Bot className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-semibold">AI Assistant</div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative"
          >
            <Input
              placeholder={isRecording ? "Listening..." : "Message AI Assistant..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className={`pr-12 py-6 text-base resize-none border-border focus-visible:ring-1 ${
                isRecording ? "border-primary" : ""
              }`}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI Assistant can help with appointments, clients, notes, and navigation
          </p>
        </div>
      </div>
    </div>
  );
}
