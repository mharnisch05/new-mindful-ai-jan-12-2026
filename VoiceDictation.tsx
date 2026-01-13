import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  className?: string;
}

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

export function VoiceDictation({ onTranscript, className }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showListening, setShowListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionClass = windowWithSpeech.webkitSpeechRecognition || windowWithSpeech.SpeechRecognition;
    
    if (SpeechRecognitionClass) {
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');

        // Only send final results
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          onTranscript(transcript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsRecording(false);
        setIsProcessing(false);
        setShowListening(false);

        if (event.error === 'no-speech') {
          toast({
            title: "No speech detected",
            description: "Please speak clearly into your microphone",
            variant: "destructive",
          });
        } else if (event.error === 'not-allowed') {
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access to use voice dictation",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Speech recognition error",
            description: "Could not process voice input. Please try again.",
            variant: "destructive",
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
        setShowListening(false);
      };

      recognitionRef.current.onstart = () => {
        setIsProcessing(false);
        setIsRecording(true);
        setShowListening(true);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast, onTranscript]);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setShowListening(false);
    } else {
      try {
        setIsProcessing(true);
        recognitionRef.current.start();
      } catch (error) {
        setIsProcessing(false);
        setShowListening(false);
        toast({
          title: "Error",
          description: "Failed to start voice recognition",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`${className} ${isRecording ? 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500' : ''}`}
        title={isRecording ? "Stop recording" : "Start voice dictation"}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {showListening && (
        <div className="fixed bottom-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span className="text-sm font-medium">Listening...</span>
          </div>
        </div>
      )}
    </>
  );
}
