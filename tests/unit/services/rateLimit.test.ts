import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimit } from "@/lib/rateLimit";

beforeEach(() => {
  __resetRateLimit();
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("test-key", 10);
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks requests that exceed the limit", () => {
    for (let i = 0; i < 10; i++) {
      rateLimit("key-block", 10);
    }
    const r = rateLimit("key-block", 10);
    expect(r.allowed).toBe(false);
  });

  it("uses independent windows per key", () => {
    for (let i = 0; i < 10; i++) rateLimit("key-a", 10);
    // key-a is exhausted but key-b should still be allowed
    const r = rateLimit("key-b", 10);
    expect(r.allowed).toBe(true);
  });

  it("returns remaining count", () => {
    rateLimit("key-cnt", 5);
    rateLimit("key-cnt", 5);
    const r = rateLimit("key-cnt", 5);
    expect(r.remaining).toBe(2);
  });

  it("remaining is 0 when at limit", () => {
    for (let i = 0; i < 5; i++) rateLimit("key-zero", 5);
    const r = rateLimit("key-zero", 5);
    expect(r.remaining).toBe(0);
    expect(r.allowed).toBe(false);
  });
});
