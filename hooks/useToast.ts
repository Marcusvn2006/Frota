"use client";

import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

type ToastVariant = "default" | "destructive" | "success";

interface ToastData extends ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastState {
  toasts: ToastData[];
}

type Action =
  | { type: "ADD_TOAST"; toast: ToastData }
  | { type: "REMOVE_TOAST"; id: string };

const MAX = 3;

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [action.toast, ...state.toasts].slice(0, MAX) };
    case "REMOVE_TOAST":
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function toast({
  title,
  description,
  variant = "default",
  duration = 4000,
  ...props
}: Omit<ToastData, "id">) {
  const id = crypto.randomUUID();
  dispatch({ type: "ADD_TOAST", toast: { id, title, description, variant, ...props } });
  setTimeout(() => dispatch({ type: "REMOVE_TOAST", id }), duration);
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { ...state, toast };
}

export { toast };
