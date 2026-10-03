import type { InputHTMLAttributes } from "react";
import "./switch.css";
/** Shared binary control; retains native keyboard and label behavior. */
export function Switch(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">,
) {
  return (
    <input
      {...props}
      type="checkbox"
      role="switch"
      className={`app-switch ${props.className ?? ""}`}
    />
  );
}
