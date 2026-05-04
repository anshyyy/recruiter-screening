import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { handleServiceError } from '../../common/utils/service-error';

export type BolnaCallContext = {
  candidateName: string | null;
  jobTitle: string;
  company: string;
  jobDescription: string;
  skills: string[];
};

export type BolnaInitiateCallParams = {
  agentId: string;
  recipientPhoneNumber: string;
  context: BolnaCallContext;
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

  async initiateCall(params: BolnaInitiateCallParams): Promise<BolnaInitiateCallResult> {
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
          variables: {
            candidate_name: params.context.candidateName ?? 'Candidate',
            job_title: params.context.jobTitle,
            company: params.context.company,
            job_description: params.context.jobDescription,
            skills: params.context.skills.join(', '),
          },
        },
      };

      this.logger.log(
        `initiateCall: agentId=${params.agentId} to=${maskPhone(params.recipientPhoneNumber)}`,
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
        this.logger.error(`initiateCall: HTTP ${res.status} body=${text.slice(0, 500)}`);
        throw new ServiceUnavailableException(
          `Bolna rejected the call (status ${res.status}). Check BOLNA_SCREENING_AGENT_ID and recipient phone.`,
        );
      }

      const executionId = extractExecutionId(parsed);
      if (!executionId) {
        this.logger.error(`initiateCall: missing call/execution id in response: ${text.slice(0, 500)}`);
        throw new ServiceUnavailableException(
          'Bolna response is missing a call id; cannot track this screening.',
        );
      }

      this.logger.log(`initiateCall: ok executionId=${executionId}`);
      return { executionId, raw: parsed };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'BolnaClient.initiateCall', error);
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
