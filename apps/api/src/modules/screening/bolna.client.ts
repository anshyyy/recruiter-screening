import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { handleServiceError } from '../../common/utils/service-error';

export type BolnaCallContext = {
  candidateName: string | null;
  jobTitle: string;
  company: string;
  jobDescription: string;
  skills: string[];
  resumeText?: string | null;
};

export type BolnaInitiateCallParams = {
  agentId: string;
  recipientPhoneNumber: string;
  context: BolnaCallContext;
};

/** Outbound call with a flat string map (Bolna `user_data.variables`) — e.g. technical interview scheduling. */
export type BolnaInitiateCallWithVariablesParams = {
  agentId: string;
  recipientPhoneNumber: string;
  /** Merged into `user_data.variables` (all values stringified for the provider). */
  variables: Record<string, string>;
};

export type BolnaInitiateCallResult = {
  /** Bolna's identifier for this call (we persist it on `screening_sessions.bolna_execution_id`). */
  executionId: string;
  /** Raw response body from Bolna, kept for debugging. */
  raw: unknown;
};

/**
 * Thin HTTP wrapper around Bolna's outbound-call endpoint.
 * Endpoint shape may differ between Bolna API versions; the URL and payload here
 * are configurable via env so the operator can match their Bolna setup without code changes.
 */
@Injectable()
export class BolnaClient {
  private readonly logger = new Logger(BolnaClient.name);

  constructor(private readonly config: ConfigService) {}

  /** True when both API key and base URL are configured. */
  isConfigured(): boolean {
    return Boolean(this.config.get<string>('BOLNA_API_KEY')) && Boolean(this.getBaseUrl());
  }

  getDefaultAgentId(): string | null {
    return this.config.get<string>('BOLNA_SCREENING_AGENT_ID') ?? null;
  }

  /**
   * Agent for technical-interview scheduling calls. If `BOLNA_TECH_INTERVIEW_SCHEDULING_AGENT_ID`
   * is unset, uses `BOLNA_SCREENING_AGENT_ID` so one Bolna agent can serve both flows.
   */
  getTechnicalInterviewSchedulingAgentId(): string | null {
    const tech = this.config.get<string>('BOLNA_TECH_INTERVIEW_SCHEDULING_AGENT_ID')?.trim();
    if (tech) {
      return tech;
    }
    const screening = this.config.get<string>('BOLNA_SCREENING_AGENT_ID')?.trim();
    return screening ?? null;
  }

  async initiateCall(params: BolnaInitiateCallParams): Promise<BolnaInitiateCallResult> {
    const variables: Record<string, string> = {
      candidate_name: params.context.candidateName ?? 'Candidate',
      job_title: params.context.jobTitle,
      company: params.context.company,
      job_description: params.context.jobDescription,
      skills: params.context.skills.join(', '),
    };
    if (params.context.resumeText) {
      variables.resume_text = params.context.resumeText;
    }
    return this.initiateCallWithVariables({
      agentId: params.agentId,
      recipientPhoneNumber: params.recipientPhoneNumber,
      variables,
    });
  }

  /**
   * Generic outbound call with custom variables (configure the Bolna agent to read
   * `available_slots_json`, `application_id`, etc.).
   */
  async initiateCallWithVariables(
    params: BolnaInitiateCallWithVariablesParams,
  ): Promise<BolnaInitiateCallResult> {
    try {
      const apiKey = this.config.get<string>('BOLNA_API_KEY');
      const base = this.getBaseUrl();
      if (!apiKey || !base) {
        throw new ServiceUnavailableException(
          'Bolna is not configured (set BOLNA_API_KEY and BOLNA_API_BASE_URL).',
        );
      }

      const endpoint = this.config.get<string>('BOLNA_CALL_ENDPOINT') ?? '/call';
      const url = `${base.replace(/\/$/, '')}${endpoint}`;

      const body = {
        agent_id: params.agentId,
        recipient_phone_number: params.recipientPhoneNumber,
        user_data: {
          variables: params.variables,
        },
      };

      this.logger.log(
        `initiateCallWithVariables: agentId=${params.agentId} to=${maskPhone(params.recipientPhoneNumber)}`,
      );

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text.length > 0 ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      if (!res.ok) {
        this.logger.error(`initiateCallWithVariables: HTTP ${res.status} body=${text.slice(0, 500)}`);
        throw new ServiceUnavailableException(
          `Bolna rejected the call (status ${res.status}). Check agent id and recipient phone.`,
        );
      }

      const executionId = extractExecutionId(parsed);
      if (!executionId) {
        this.logger.error(
          `initiateCallWithVariables: missing call/execution id in response: ${text.slice(0, 500)}`,
        );
        throw new ServiceUnavailableException(
          'Bolna response is missing a call id; cannot track this call.',
        );
      }

      this.logger.log(`initiateCallWithVariables: ok executionId=${executionId}`);
      return { executionId, raw: parsed };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'BolnaClient.initiateCallWithVariables', error);
    }
  }

  private getBaseUrl(): string | null {
    return (
      this.config.get<string>('BOLNA_API_BASE_URL') ??
      'https://api.bolna.ai'
    );
  }
}

/** Bolna has used `call_id`, `execution_id`, and `id` across versions; accept any. */
function extractExecutionId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.execution_id, obj.call_id, obj.id, obj.callId, obj.executionId];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) {
      return c;
    }
  }
  return null;
}

function maskPhone(p: string): string {
  if (p.length <= 4) return '***';
  return `${p.slice(0, 3)}…${p.slice(-2)}`;
}
