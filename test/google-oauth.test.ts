import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("getAccessToken caching", () => {
  beforeEach(() => {
    vi.resetModules(); // fresh module = fresh token cache
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reuses a token until it nears expiry instead of refreshing every call", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return { ok: true, json: async () => ({ access_token: `t${calls}`, expires_in: 3600 }) } as unknown as Response;
    });
    const { getAccessToken } = await import("@/lib/google-oauth");
    expect(await getAccessToken("refresh-a")).toBe("t1");
    expect(await getAccessToken("refresh-a")).toBe("t1");
    expect(calls).toBe(1);
    // A different connection gets its own token.
    expect(await getAccessToken("refresh-b")).toBe("t2");
    expect(calls).toBe(2);
  });

  it("does not cache a failed refresh", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return calls === 1
        ? ({ ok: false, text: async () => "invalid_grant" } as unknown as Response)
        : ({ ok: true, json: async () => ({ access_token: "ok", expires_in: 3600 }) } as unknown as Response);
    });
    const { getAccessToken } = await import("@/lib/google-oauth");
    await expect(getAccessToken("refresh-a")).rejects.toThrow(/Token refresh failed/);
    expect(await getAccessToken("refresh-a")).toBe("ok");
    expect(calls).toBe(2);
  });
});
