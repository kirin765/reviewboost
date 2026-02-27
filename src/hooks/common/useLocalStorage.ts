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

export function useLocalStorage<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    return deserialize(window.localStorage.getItem(key), fallback);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, serialize(value));
  }, [key, value]);

  return [value, setValue];
}
