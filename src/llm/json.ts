import { ZodError } from "zod";

export function parseModelJson(rawText: string): unknown | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();
  
  // 1. Try parsing directly
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Try extracting from markdown code blocks with 'json' label
  const fenceRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = trimmed.match(fenceRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // 3. Try code blocks without 'json' label
  const genericFenceRegex = /```\s*([\s\S]*?)\s*```/;
  const genericMatch = trimmed.match(genericFenceRegex);
  if (genericMatch && genericMatch[1]) {
    try {
      return JSON.parse(genericMatch[1].trim());
    } catch {}
  }

  // 4. Fall back to character-by-character braces tracking to isolate the outermost JSON block,
  // respecting quotes and escape character sequences inside string properties.
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let firstBraceIndex = -1;
  let lastBraceIndex = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        if (braceCount === 0) {
          firstBraceIndex = i;
        }
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0 && firstBraceIndex !== -1) {
          lastBraceIndex = i;
          break; // Found the matching closing brace for the top-level block
        }
      }
    }
  }

  if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    const candidate = trimmed.substring(firstBraceIndex, lastBraceIndex + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

export function stringifyValidationError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((e) => `[${e.path.join(".")}] ${e.message}`).join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}
