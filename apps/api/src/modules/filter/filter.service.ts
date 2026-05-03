import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

export type FilterItem = {
  id?: string;
  title: string;
  url: string;
  snippet?: string | null;
  source?: string | null;
};

export type FilterMode = 'noop' | 'llm' | 'heuristic' | 'heuristic-noop';

export type FilterResult<T extends FilterItem> = {
  items: T[];
  mode: FilterMode;
};

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Apply a natural-language filter prompt. If ANTHROPIC_API_KEY is set,
   * uses Claude. Otherwise falls back to keyword exclusion heuristics.
   */
  async apply<T extends FilterItem>({
    prompt,
    items,
  }: {
    prompt: string;
    items: T[];
  }): Promise<FilterResult<T>> {
    if (!prompt || items.length === 0) return { items, mode: 'noop' };

    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    if (key) {
      try {
        return await this.llm({ prompt, items, key });
      } catch (e) {
        this.logger.warn(`llm filter failed, falling back: ${(e as Error).message}`);
      }
    }
    return this.heuristic({ prompt, items });
  }

  private async llm<T extends FilterItem>({
    prompt,
    items,
    key,
  }: {
    prompt: string;
    items: T[];
    key: string;
  }): Promise<FilterResult<T>> {
    const model = this.config.get<string>('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001');

    const compact = items.map((r, i) => ({
      i,
      title: r.title,
      source: r.source ?? null,
      snippet: (r.snippet ?? '').slice(0, 240),
    }));

    const sys =
      'You filter news results against a user instruction. Return ONLY JSON of the form {"keep":[<indices>]} — no prose, no markdown. Include an index iff the item satisfies the instruction.';
    const user = `Instruction: ${prompt}\n\nItems:\n${JSON.stringify(compact)}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: sys,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = (data.content?.[0]?.text ?? '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json in response');
    const parsed = JSON.parse(match[0]) as { keep?: number[] };
    const keep = new Set(parsed.keep ?? []);
    return { items: items.filter((_, i) => keep.has(i)), mode: 'llm' };
  }

  /**
   * Without an LLM, only honor explicit exclusions — keyword inclusions are
   * too strict for natural-language prompts and would silently drop everything.
   */
  private heuristic<T extends FilterItem>({
    prompt,
    items,
  }: {
    prompt: string;
    items: T[];
  }): FilterResult<T> {
    const p = prompt.toLowerCase();
    const stop = new Set(['the', 'and', 'that', 'those', 'these', 'this', 'rumors', 'rumor']);
    const excludes: string[] = [];
    for (const m of p.matchAll(
      /\b(?:skip|exclude|without|except|no\s+)\s*([a-z][\w-]{3,30}(?:\s+[a-z][\w-]{3,30})?)/g,
    )) {
      for (const w of m[1].trim().split(/\s+/)) {
        if (w.length >= 4 && !stop.has(w)) excludes.push(w);
      }
    }
    if (excludes.length === 0) return { items, mode: 'heuristic-noop' };
    const filtered = items.filter((r) => {
      const hay = `${r.title} ${r.snippet ?? ''} ${r.source ?? ''}`.toLowerCase();
      return !excludes.some((w) => hay.includes(w));
    });
    return { items: filtered, mode: 'heuristic' };
  }
}
