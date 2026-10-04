import { describe, expect, it } from "vitest";
import rawManifest from "../public/manifest.firefox.json";

type FirefoxManifest = {
  manifest_version: number;
  background?: { scripts?: string[]; service_worker?: string };
  externally_connectable?: unknown;
  content_scripts?: { matches: string[]; js: string[]; run_at?: string }[];
  browser_specific_settings?: {
    gecko?: {
      id?: string;
      strict_min_version?: string;
      data_collection_permissions?: { required?: string[] };
    };
  };
};

const manifest = rawManifest as unknown as FirefoxManifest;

describe("firefox manifest", () => {
  it("uses an MV3 event page instead of a service worker", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background?.scripts).toContain("service-worker.js");
    expect(manifest.background?.service_worker).toBeUndefined();
  });

  it("drops externally_connectable (unsupported in Firefox)", () => {
    expect(manifest.externally_connectable).toBeUndefined();
  });

  it("declares a gecko id + AMO data collection permissions", () => {
    const gecko = manifest.browser_specific_settings?.gecko;
    expect(gecko?.id).toMatch(/@reviewboost\.co\.kr$/);
    // MAIN-world scripting.executeScript + built-in data consent need modern Firefox.
    expect(Number(gecko?.strict_min_version?.split(".")[0])).toBeGreaterThanOrEqual(128);
    expect(gecko?.data_collection_permissions?.required?.length).toBeGreaterThan(0);
  });

  it("injects the postMessage bridge on the ReviewBoost origin", () => {
    const bridge = manifest.content_scripts?.find((cs) => cs.js.includes("bridge.js"));
    expect(bridge).toBeTruthy();
    expect(bridge?.matches).toContain("*://reviewboost.co.kr/*");
    expect(bridge?.run_at).toBe("document_start");
  });
});
