import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff } from "lucide-react";
import { z } from "zod";
import { AISoapRecorder } from "./AISoapRecorder";

const soapNoteSchema = z.object({
  client_id: z.string().uuid("Please select a client"),
  subjective: z.string().trim().max(5000, "Subjective must be less than 5000 characters").optional().or(z.literal("")),
  objective: z.string().trim().max(5000, "Objective must be less than 5000 characters").optional().or(z.literal("")),
  assessment: z.string().trim().max(5000, "Assessment must be less than 5000 characters").optional().or(z.literal("")),
  plan: z.string().trim().max(5000, "Plan must be less than 5000 characters").optional().or(z.literal("")),
});

interface SoapNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  note?: any;
  template?: any;
}

export function SoapNoteDialog({ open, onOpenChange, onSuccess, note, template }: SoapNoteDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const isEditing = !!note;

  useEffect(() => {
    if (open) {
      fetchClients();
      if (note) {
        setFormData({
          client_id: note.client_id,
          subjective: note.subjective || "",
          objective: note.objective || "",
          assessment: note.assessment || "",
          plan: note.plan || "",
        });
      } else if (template) {
        setFormData({
          client_id: "",
          subjective: template.subjective_template || "",
          objective: template.objective_template || "",
          assessment: template.assessment_template || "",
          plan: template.plan_template || "",
        });
      } else {
        setFormData({ client_id: "", subjective: "", objective: "", assessment: "", plan: "" });
      }
    }
  }, [open, note, template]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false; // Only get final results

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex) // Only get new results
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (recordingField && transcript) {
          // Append to existing content with a space
          setFormData(prev => ({ 
            ...prev, 
            [recordingField]: prev[recordingField as keyof typeof prev] 
              ? `${prev[recordingField as keyof typeof prev]} ${transcript}`
              : transcript
          }));
        }
      };

      recognitionRef.current.onerror = () => {
        setRecordingField(null);
        toast({ title: "Speech recognition error", variant: "destructive" });
      };

      recognitionRef.current.onend = () => {
        setRecordingField(null);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [recordingField, toast]);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("therapist_id", user.id);
    
    setClients(data || []);
  };

  const toggleRecording = (field: string) => {
    if (!recognitionRef.current) {
      toast({ title: "Speech recognition not supported", variant: "destructive" });
      return;
    }

    if (recordingField === field) {
      recognitionRef.current.stop();
      setRecordingField(null);
    } else {
      if (recordingField) {
        recognitionRef.current.stop();
      }
      // Don't clear the field - append to existing content
      recognitionRef.current.start();
      setRecordingField(field);
      toast({ title: "Listening...", description: `Dictating ${field}. Click again to stop.` });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = soapNoteSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: firstError.message, variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (isEditing) {
      const result = await supabase.from("soap_notes").update({
        client_id: validation.data.client_id,
        subjective: validation.data.subjective || null,
        objective: validation.data.objective || null,
        assessment: validation.data.assessment || null,
        plan: validation.data.plan || null,
      }).eq("id", note.id);
      error = result.error;
    } else {
      const result = await supabase.from("soap_notes").insert({
        client_id: validation.data.client_id,
        therapist_id: user.id,
        subjective: validation.data.subjective || null,
        objective: validation.data.objective || null,
        assessment: validation.data.assessment || null,
        plan: validation.data.plan || null,
      });
      error = result.error;
    }

    if (error) {
      console.error("SOAP note error:", error);
      toast({ title: `Unable to ${isEditing ? 'update' : 'create'} SOAP note. Please try again.`, variant: "destructive" });
    } else {
      toast({ title: `SOAP note ${isEditing ? 'updated' : 'created'} successfully` });
      onOpenChange(false);
      setFormData({ client_id: "", subjective: "", objective: "", assessment: "", plan: "" });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit SOAP Note' : 'Create SOAP Note'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update session documentation' : 'Document a therapy session'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isEditing && (
              <AISoapRecorder
                clientName={clients.find(c => c.id === formData.client_id)?.first_name}
                onSoapGenerated={(sections) => {
                  setFormData(prev => ({
                    ...prev,
                    subjective: sections.subjective,
                    objective: sections.objective,
                    assessment: sections.assessment,
                    plan: sections.plan,
                  }));
                }}
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              {isEditing ? (
                <Input
                  value={`${clients.find(c => c.id === formData.client_id)?.first_name || ''} ${clients.find(c => c.id === formData.client_id)?.last_name || ''}`.trim() || 'Loading...'}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-2"
                  />
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {clients
                        .filter((client) =>
                          `${client.first_name} ${client.last_name}`
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
              <div className="space-y-2">
                <Label htmlFor="subjective">Subjective</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="subjective"
                    placeholder="Client's reported symptoms, feelings, concerns..."
                    value={formData.subjective}
                    onChange={(e) => setFormData({ ...formData, subjective: e.target.value })}
                    maxLength={5000}
                    rows={3}
                    className={recordingField === "subjective" ? "border-primary" : ""}
                  />
                  <Button
                    type="button"
                    variant={recordingField === "subjective" ? "default" : "outline"}
                    size="icon"
                    onClick={() => toggleRecording("subjective")}
                    className={recordingField === "subjective" ? "bg-purple-500 hover:bg-purple-600" : ""}
                  >
                    {recordingField === "subjective" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <div className="flex gap-2">
                <Textarea
                  id="objective"
                  placeholder="Observable behaviors, test results, measurements..."
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  maxLength={5000}
                  rows={3}
                  className={recordingField === "objective" ? "border-primary" : ""}
                />
                <Button
                  type="button"
                  variant={recordingField === "objective" ? "default" : "outline"}
                  size="icon"
                  onClick={() => toggleRecording("objective")}
                  className={recordingField === "objective" ? "bg-purple-500 hover:bg-purple-600" : ""}
                >
                  {recordingField === "objective" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment">Assessment</Label>
              <div className="flex gap-2">
                <Textarea
                  id="assessment"
                  placeholder="Clinical impressions, diagnosis, progress..."
                  value={formData.assessment}
                  onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                  maxLength={5000}
                  rows={3}
                  className={recordingField === "assessment" ? "border-primary" : ""}
                />
                <Button
                  type="button"
                  variant={recordingField === "assessment" ? "default" : "outline"}
                  size="icon"
                  onClick={() => toggleRecording("assessment")}
                  className={recordingField === "assessment" ? "bg-purple-500 hover:bg-purple-600" : ""}
                >
                  {recordingField === "assessment" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <div className="flex gap-2">
                <Textarea
                  id="plan"
                  placeholder="Treatment plan, next steps, interventions..."
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  maxLength={5000}
                  rows={3}
                  className={recordingField === "plan" ? "border-primary" : ""}
                />
                <Button
                  type="button"
                  variant={recordingField === "plan" ? "default" : "outline"}
                  size="icon"
                  onClick={() => toggleRecording("plan")}
                  className={recordingField === "plan" ? "bg-purple-500 hover:bg-purple-600" : ""}
                >
                  {recordingField === "plan" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit">{isEditing ? 'Save Changes' : 'Create Note'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
