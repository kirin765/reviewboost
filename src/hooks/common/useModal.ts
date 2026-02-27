import { useState } from "react";

export type UseModalState<T> = {
  open: boolean;
  payload: T | null;
  show: (payload: T) => void;
  hide: () => void;
};

export function useModal<T>(): UseModalState<T> {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<T | null>(null);

  return {
    open,
    payload,
    show: (next: T) => {
      setPayload(next);
      setOpen(true);
    },
    hide: () => {
      setOpen(false);
      setPayload(null);
    }
  };
}

