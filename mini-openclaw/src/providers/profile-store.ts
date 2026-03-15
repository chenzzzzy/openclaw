import type { ProviderAdapter } from "../agent/runtime.js";

export type ProviderProfile = {
  profileId: string;
  providerId: string;
  enabled: boolean;
  priority: number;
};

export class InMemoryProviderProfileStore {
  private readonly profiles = new Map<string, ProviderProfile>();

  upsert(profile: ProviderProfile): void {
    this.profiles.set(profile.profileId, profile);
  }

  list(): ProviderProfile[] {
    return [...this.profiles.values()].sort((a, b) => a.priority - b.priority);
  }

  resolveProviders(allProviders: ProviderAdapter[]): ProviderAdapter[] {
    const byId = new Map(allProviders.map((provider) => [provider.id, provider]));
    return this.list()
      .filter((profile) => profile.enabled)
      .map((profile) => byId.get(profile.providerId))
      .filter((provider): provider is ProviderAdapter => Boolean(provider));
  }
}
