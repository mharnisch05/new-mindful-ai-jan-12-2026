import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AISoapRecorderProps {
  clientName?: string;
  onSoapGenerated: (sections: { subjective: string; objective: string; assessment: string; plan: string }) => void;
}

export function AISoapRecorder({ clientName, onSoapGenerated }: AISoapRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording session recap",
        description: "Speak naturally about your session. Click stop when finished.",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
      });

      // Transcribe audio
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
        'transcribe-audio',
        { body: { audio: base64Audio } }
      );

      if (transcriptError) throw transcriptError;

      const transcribedText = transcriptData.text;
      setTranscript(transcribedText);
      setIsTranscribing(false);

      // Generate SOAP note
      setIsGenerating(true);
      
      const { data: soapData, error: soapError } = await supabase.functions.invoke(
        'generate-soap-note',
        { body: { transcript: transcribedText, clientName } }
      );

      if (soapError) throw soapError;

      onSoapGenerated(soapData.sections);
      
      toast({
        title: "AI SOAP note generated!",
        description: "Review and edit the generated note before saving",
      });

      setIsGenerating(false);
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Error processing recording",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsTranscribing(false);
      setIsGenerating(false);
    }
  };

  const isProcessing = isTranscribing || isGenerating;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI SOAP Note Assistant
        </CardTitle>
        <CardDescription>
          Record a 2-5 minute session recap and AI will generate a professional SOAP note draft
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {!isRecording && !isProcessing && (
            <Button
              onClick={startRecording}
              variant="default"
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </Button>
          )}
          
          {isRecording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="gap-2 animate-pulse"
            >
              <MicOff className="w-4 h-4" />
              Stop Recording
            </Button>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isTranscribing && "Transcribing audio..."}
              {isGenerating && "Generating SOAP note..."}
            </div>
          )}
        </div>

        {transcript && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Transcript:</p>
            <p className="text-sm text-muted-foreground border rounded-md p-3 max-h-32 overflow-y-auto">
              {transcript}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}