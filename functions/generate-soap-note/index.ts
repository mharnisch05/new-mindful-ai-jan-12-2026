import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript, clientName } = await req.json();
    
    if (!transcript) {
      throw new Error("No transcript provided");
    }

    console.log("Generating SOAP note from transcript...");

    const systemPrompt = `You are a clinical documentation assistant helping mental health professionals create professional SOAP notes. Your task is to convert a therapist's session recap into a structured SOAP note format.

SOAP Format:
- Subjective: Client's reported symptoms, feelings, concerns, and statements during the session
- Objective: Observable behaviors, affect, appearance, and clinical observations
- Assessment: Clinical impressions, diagnosis considerations, progress evaluation, patterns identified
- Plan: Treatment plan, interventions discussed, homework assigned, next steps, follow-up

Guidelines:
- Keep a professional clinical tone
- Remove filler words and conversational elements
- Organize information into appropriate SOAP sections
- Be concise but comprehensive
- Focus on clinically relevant information
- Maintain confidentiality and professional standards`;

    const userPrompt = `Convert this therapy session recap into a professional SOAP note${clientName ? ` for client ${clientName}` : ''}:

${transcript}

Please structure this as a SOAP note with clear sections.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const soapNote = result.choices[0].message.content;

    console.log("SOAP note generated successfully");

    // Parse the SOAP note into sections
    const sections = {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    };

    const lines = soapNote.split('\n');
    let currentSection = "";

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("subjective:") || lowerLine.startsWith("subjective")) {
        currentSection = "subjective";
        continue;
      } else if (lowerLine.includes("objective:") || lowerLine.startsWith("objective")) {
        currentSection = "objective";
        continue;
      } else if (lowerLine.includes("assessment:") || lowerLine.startsWith("assessment")) {
        currentSection = "assessment";
        continue;
      } else if (lowerLine.includes("plan:") || lowerLine.startsWith("plan")) {
        currentSection = "plan";
        continue;
      }

      if (currentSection && line.trim()) {
        sections[currentSection as keyof typeof sections] += (sections[currentSection as keyof typeof sections] ? "\n" : "") + line.trim();
      }
    }

    return new Response(
      JSON.stringify({ 
        fullNote: soapNote,
        sections 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SOAP generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});