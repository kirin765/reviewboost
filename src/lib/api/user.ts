import type { Capabilities } from "@/lib/capabilities";
import { get } from "@/lib/apiClient";

export async function fetchCapabilities(): Promise<Capabilities> {
  return get<Capabilities>("/api/capabilities");
}

