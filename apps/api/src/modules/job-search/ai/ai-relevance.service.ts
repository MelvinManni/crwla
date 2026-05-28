import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type RelevanceInput = {
  role: string;
  jobTitle: string;
  jobDescription: string | null;
  tags: string[];
};

export type RelevanceVerdict = {
  /** 0..100 — same scale the design uses on the FE gauge. */
  score: number;
  reason: string;
};

/**
 * Scores a job posting's match against the user's searched role.
 *
 * Live path: posts a short prompt to the messages API and parses the
 * JSON reply. Offline path (this build): a deterministic token-overlap
 * heuristic so the FE can be exercised without an LLM key.
 *
 * The cutoff below is the threshold the processor uses to drop weak
 * matches before persistence. Strong = 85+, good = 70–85, weak = <70.
 */
@Injectable()
export class AiRelevanceService {
  private readonly logger = new Logger(AiRelevanceService.name);

  /** Drop scores below this — saves us writing junk rows to the DB. */
  static readonly DROP_BELOW = 50;
  /** Threshold the FE labels as "strong" — surfaced for visual treatment. */
  static readonly STRONG_AT = 85;

  static readonly PROMPT = `You score how well a job posting matches a
searched role. Return JSON only:
{ "score": 0..100, "reason": "<one line>" }

Searched role: {role}

Posting:
- title: {title}
- description: {description}
- tags: {tags}
`;

  constructor(private readonly config: ConfigService) {}

  score(input: RelevanceInput): RelevanceVerdict {
    if (this.config.get<string>('ANTHROPIC_API_KEY')) {
      // TODO: live call. Falling through to the heuristic keeps the
      // pipeline working in dev / offline contexts.
      this.logger.debug('LLM relevance path available — using heuristic fallback');
    }
    const roleTokens = tokens(input.role);
    const hay = `${input.jobTitle} ${input.jobDescription ?? ''} ${input.tags.join(' ')}`.toLowerCase();
    if (roleTokens.length === 0) return { score: 50, reason: 'No role tokens supplied.' };

    const hits = roleTokens.filter((t) => hay.includes(t));
    const ratio = hits.length / roleTokens.length;
    const seniorityBoost = /senior|staff|principal|lead|head/.test(hay)
      && /senior|staff|principal|lead|head/.test(input.role.toLowerCase())
      ? 8
      : 0;
    const tagBoost = Math.min(6, input.tags.length * 1.5);
    const base = ratio * 80;
    const score = clampInt(base + seniorityBoost + tagBoost);
    if (score < AiRelevanceService.DROP_BELOW) {
      return { score, reason: `Only ${hits.length}/${roleTokens.length} role tokens matched.` };
    }
    return {
      score,
      reason: `Matched ${hits.length}/${roleTokens.length} role tokens${
        seniorityBoost ? ', seniority aligned' : ''
      }.`,
    };
  }
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 2);
}

function clampInt(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
