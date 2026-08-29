import { describe, expect, it } from "vitest";
import { sanitizeJsonish } from "../src/content/hook";

describe("sanitizeJsonish", () => {
  it("turns JS undefined/NaN/Infinity values into null and drops trailing commas", () => {
    const raw = `{"a":undefined,"b": NaN,"c":Infinity,"d":123,"arr":[undefined,1,],"nested":{"x":undefined},"s":"keep,}"}`;
    const out = sanitizeJsonish(raw);
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out)).toEqual({
      a: null,
      b: null,
      c: null,
      d: 123,
      arr: [null, 1],
      nested: { x: null },
      s: "keep,}"
    });
  });

  it("parses the real brandstore preload-state shape (undefined inside object literal)", () => {
    const rest = `{"abt":{},"add_cart_action_uid":undefined,"recInfo":undefined,"view":{"type":"pc"},"p":123}`;
    const out = JSON.parse(sanitizeJsonish(rest)) as Record<string, unknown>;
    expect(out.add_cart_action_uid).toBeNull();
    expect(out.recInfo).toBeNull();
    expect(out.p).toBe(123);
  });
});
