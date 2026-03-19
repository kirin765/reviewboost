import { useEffect, useState } from "react";

function serialize<T>(value: T): string {
  const raw = JSON.stringify(value);
  return raw ?? "null";
}

function deserialize<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") return fallback;
    return deserialize(storage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") return;
    storage.setItem(key, serialize(value));
  } catch {
    // Ignore storage failures in restricted or mocked environments.
  }
}

export function useLocalStorage<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallback));

  useEffect(() => {
    writeStoredValue(key, value);
  }, [key, value]);

  return [value, setValue];
}
