import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";

export type ProviderAttempt = {
  providerId: string;
  retryable: boolean;
  reason: string;
};

export class ProviderFallbackError extends Error {
  readonly attempts: ProviderAttempt[];

  constructor(attempts: ProviderAttempt[]) {
    super(`All providers failed: ${attempts.map((item) => item.providerId).join(", ")}`);
    this.attempts = attempts;
  }
}

type FallbackOptions = {
  cooldownMs?: number;
  now?: () => number;
  isRetryable?: (error: unknown) => boolean;
};

export class FallbackProvider implements ProviderAdapter {
  readonly id = "fallback-provider";
  private readonly cooldownUntil = new Map<string, number>();
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private readonly isRetryable: (error: unknown) => boolean;

  constructor(
    private readonly providers: ProviderAdapter[],
    options: FallbackOptions = {},
  ) {
    this.cooldownMs = options.cooldownMs ?? 15_000;
    this.now = options.now ?? (() => Date.now());
    this.isRetryable = options.isRetryable ?? defaultRetryable;
  }

  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    const attempts: ProviderAttempt[] = [];
    const now = this.now();

    for (const provider of this.providers) {
      if ((this.cooldownUntil.get(provider.id) ?? 0) > now) {
        attempts.push({
          providerId: provider.id,
          retryable: true,
          reason: "SKIPPED_COOLDOWN",
        });
        continue;
      }

      try {
        return await provider.runTurn(input);
      } catch (error) {
        const retryable = this.isRetryable(error);
        attempts.push({
          providerId: provider.id,
          retryable,
          reason: error instanceof Error ? error.message : String(error),
        });
        if (retryable) {
          this.cooldownUntil.set(provider.id, now + this.cooldownMs);
          continue;
        }
        throw new ProviderFallbackError(attempts);
      }
    }

    throw new ProviderFallbackError(attempts);
  }
}

function defaultRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }
  const text = error.message.toLowerCase();
  if (text.includes("unauthorized") || text.includes("invalid api key")) {
    return false;
  }
  return true;
}
