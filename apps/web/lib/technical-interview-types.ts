/** GET /api/technical-interviews/applications/:applicationId/state */
export type TechnicalInterviewBookingSummary = {
  confirmedEmail: string;
  slotStartIsoUtc: string;
  timezoneIana: string;
  lastBolnaExecutionId: string | null;
};

export type TechnicalInterviewState = {
  eligible: boolean;
  ineligibleReason: string | null;
  passThreshold: number;
  screeningScore: number | null;
  pipelinePhase: string;
  availableSlotStartsUtc: string[];
  booking: TechnicalInterviewBookingSummary | null;
};

/** POST /api/technical-interviews/confirm */
export type TechnicalInterviewConfirmPayload = {
  applicationId: string;
  email: string;
  slotStartIsoUtc: string;
  timezoneIana: string;
};

export type TechnicalInterviewConfirmResult = {
  applicationId: string;
  booking: TechnicalInterviewBookingSummary;
};

/** POST /api/admin/applications/:applicationId/technical-interview-call */
export type AdminTechnicalInterviewCallResult = {
  executionId: string;
  applicationId: string;
};
