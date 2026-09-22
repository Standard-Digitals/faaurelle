import { afterEach, describe, expect, it, vi } from "vitest";
import { supportsHeroWebGL } from "./hero-webgl";

afterEach(() => vi.unstubAllGlobals());

describe("supportsHeroWebGL", () => {
  it("requires WebGL 2 and releases the probe context", () => {
    const loseContext = vi.fn();
    const getContext = vi.fn(() => ({ getExtension: () => ({ loseContext }) }));
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { createElement: () => ({ getContext }) });
    expect(supportsHeroWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalledExactlyOnceWith("webgl2");
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("rejects a device that only supports WebGL 1", () => {
    const getContext = vi.fn((type: string) => (type === "webgl" ? {} : null));
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { createElement: () => ({ getContext }) });
    expect(supportsHeroWebGL()).toBe(false);
  });

  it("handles denied context creation", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement: () => {
        throw new Error("Unavailable");
      },
    });
    expect(supportsHeroWebGL()).toBe(false);
  });
});
