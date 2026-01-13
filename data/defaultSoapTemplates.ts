export const defaultSoapTemplates = [
  {
    name: "Initial Assessment",
    category: "Assessment",
    description: "Comprehensive initial client assessment template",
    subjective_template: "Client presents with...\n\nChief Complaint:\n\nHistory of Present Illness:\n\nRelevant Medical/Psychiatric History:\n\nCurrent Medications:\n\nFamily History:\n\nSocial History:",
    objective_template: "Mental Status Examination:\n- Appearance:\n- Behavior:\n- Speech:\n- Mood:\n- Affect:\n- Thought Process:\n- Thought Content:\n- Perception:\n- Cognition:\n- Insight:\n- Judgment:",
    assessment_template: "Diagnostic Impressions:\n\nStrengths:\n\nChallenges:\n\nRisk Assessment:\n- Suicidal ideation: Denied\n- Homicidal ideation: Denied\n- Self-harm behaviors: None reported",
    plan_template: "Treatment Plan:\n\nInterventions:\n\nGoals:\n\nFrequency:\n\nFollow-up:\n\nReferrals:\n\nEducation provided:"
  },
  {
    name: "Progress Note (Standard)",
    category: "Progress",
    description: "Standard session progress note",
    subjective_template: "Client reports:\n\nCurrent symptoms:\n\nProgress since last session:\n\nChallenges this week:",
    objective_template: "Observations:\n- Mood:\n- Affect:\n- Engagement level:\n- Therapeutic alliance:\n- Response to interventions:",
    assessment_template: "Clinical impressions:\n\nProgress toward goals:\n\nAdjustments needed:",
    plan_template: "Next session focus:\n\nHomework/between-session work:\n\nNext appointment scheduled:\n\nChanges to treatment plan:"
  },
  {
    name: "Termination Summary",
    category: "Administrative",
    description: "Final session and treatment summary",
    subjective_template: "Client's perspective on treatment:\n\nReason for termination:\n\nClient's self-reported progress:\n\nFuture goals and plans:",
    objective_template: "Treatment summary:\n- Total sessions attended:\n- Treatment duration:\n- Primary interventions used:\n- Response to treatment:\n- Final mental status:",
    assessment_template: "Overall treatment outcome:\n\nGoals achieved:\n\nOngoing needs:\n\nRisk assessment at termination:\n\nPrognosis:",
    plan_template: "Termination plan:\n\nReferrals provided:\n\nResources shared:\n\nFollow-up recommendations:\n\nEmergency contacts reviewed:\n\nDoor open for future services:"
  },
  {
    name: "Crisis Intervention",
    category: "Assessment",
    description: "Crisis assessment and intervention documentation",
    subjective_template: "Presenting crisis:\n\nClient's description of situation:\n\nCurrent emotional state:\n\nTriggers identified:\n\nSupport system available:",
    objective_template: "Crisis assessment:\n- Level of distress: (1-10)\n- Suicidal ideation:\n- Plan:\n- Means:\n- Intent:\n- Protective factors:\n- Risk factors:\n- Current mental status:",
    assessment_template: "Risk level: [Low/Medium/High/Imminent]\n\nSafety concerns:\n\nImmediate needs:\n\nClient's capacity for self-care:",
    plan_template: "Safety plan developed:\n\nImmediate interventions:\n\nEmergency contacts:\n\nFollow-up scheduled:\n\nHospitalization considered: [Yes/No]\n\nCollateral contacts made:\n\nNext steps:"
  },
  {
    name: "Group Therapy Note",
    category: "Progress",
    description: "Group therapy session documentation",
    subjective_template: "Group topic/theme:\n\nClient participation level:\n\nClient's contributions to group:\n\nClient's stated concerns or insights:",
    objective_template: "Group dynamics observed:\n\nClient interactions:\n\nNonverbal communication:\n\nEngagement with group process:\n\nResponse to group feedback:",
    assessment_template: "Client's progress in group:\n\nTherapeutic benefit observed:\n\nGroup fit assessment:\n\nInterpersonal patterns noted:",
    plan_template: "Group goals for client:\n\nBetween-session practice:\n\nAreas to address in individual therapy:\n\nNext group session focus:\n\nContinued group participation recommended:"
  }
];
