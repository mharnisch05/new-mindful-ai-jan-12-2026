-- Create progress_paths table
CREATE TABLE public.progress_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL,
  core_focus TEXT,
  baseline_snapshot TEXT,
  environment_triggers TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.progress_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Therapists can view own progress paths"
ON public.progress_paths FOR SELECT
USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can create progress paths"
ON public.progress_paths FOR INSERT
WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Therapists can update own progress paths"
ON public.progress_paths FOR UPDATE
USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can delete own progress paths"
ON public.progress_paths FOR DELETE
USING (auth.uid() = therapist_id);

-- Create goals table
CREATE TABLE public.progress_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  progress_path_id UUID NOT NULL REFERENCES public.progress_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for goals
ALTER TABLE public.progress_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals
CREATE POLICY "Therapists can view goals via progress path"
ON public.progress_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_goals.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can create goals"
ON public.progress_goals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_goals.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can update goals"
ON public.progress_goals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_goals.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can delete goals"
ON public.progress_goals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_goals.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

-- Create milestones table
CREATE TABLE public.progress_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  progress_path_id UUID NOT NULL REFERENCES public.progress_paths(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.progress_goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  achieved_date DATE,
  is_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for milestones
ALTER TABLE public.progress_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestones
CREATE POLICY "Therapists can view milestones via progress path"
ON public.progress_milestones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_milestones.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can create milestones"
ON public.progress_milestones FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_milestones.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can update milestones"
ON public.progress_milestones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_milestones.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can delete milestones"
ON public.progress_milestones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_milestones.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

-- Create tools/assignments table
CREATE TABLE public.progress_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  progress_path_id UUID NOT NULL REFERENCES public.progress_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tool_type TEXT DEFAULT 'exercise' CHECK (tool_type IN ('exercise', 'journal', 'resource', 'homework', 'other')),
  resource_url TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for tools
ALTER TABLE public.progress_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tools
CREATE POLICY "Therapists can view tools via progress path"
ON public.progress_tools FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_tools.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can create tools"
ON public.progress_tools FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_tools.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can update tools"
ON public.progress_tools FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_tools.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can delete tools"
ON public.progress_tools FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_tools.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

-- Create progress metrics table for tracking over time
CREATE TABLE public.progress_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  progress_path_id UUID NOT NULL REFERENCES public.progress_paths(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
  anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for metrics
ALTER TABLE public.progress_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metrics
CREATE POLICY "Therapists can view metrics via progress path"
ON public.progress_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_metrics.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can create metrics"
ON public.progress_metrics FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_metrics.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can update metrics"
ON public.progress_metrics FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_metrics.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

CREATE POLICY "Therapists can delete metrics"
ON public.progress_metrics FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.progress_paths
    WHERE progress_paths.id = progress_metrics.progress_path_id
    AND progress_paths.therapist_id = auth.uid()
  )
);

-- Add trigger for updated_at on progress_paths
CREATE TRIGGER update_progress_paths_updated_at
BEFORE UPDATE ON public.progress_paths
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on progress_goals
CREATE TRIGGER update_progress_goals_updated_at
BEFORE UPDATE ON public.progress_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on progress_milestones
CREATE TRIGGER update_progress_milestones_updated_at
BEFORE UPDATE ON public.progress_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on progress_tools
CREATE TRIGGER update_progress_tools_updated_at
BEFORE UPDATE ON public.progress_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();