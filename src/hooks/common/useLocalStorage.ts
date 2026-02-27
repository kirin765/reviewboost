import { useEffect, useState } from "react";

type SerializedValue<T> = string | null;

function serialize<T>(value: T): SerializedValue<T> {
  return JSON.stringify(value);
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

