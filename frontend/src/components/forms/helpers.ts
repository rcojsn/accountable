import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "../../api/client";

/** Shows a server's field errors by the field, the way a missing value is shown; anything else becomes a toast. */
export function showSaveError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  toast: (message: string, tone?: "success" | "error") => void,
  fields: string[],
) {
  if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
    let shown = false;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      if (fields.includes(field)) {
        setError(field as Path<T>, { type: "server", message }, { shouldFocus: !shown });
        shown = true;
      }
    }
    if (shown) return;
  }
  toast(error instanceof Error ? error.message : "Something went wrong.", "error");
}

export const blankToNull = (s: string | undefined): string | null => (s && s.trim() ? s.trim() : null);
