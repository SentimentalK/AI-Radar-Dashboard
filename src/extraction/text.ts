export function cleanText(input: string): string {
  if (!input) return "";

  // Normalize line endings
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split into lines and trim whitespace from each line
  const lines = text.split("\n").map((line) => line.trim());

  // Rejoin and collapse excessive consecutive empty lines (more than 2)
  text = lines.join("\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export function truncateText(input: string | null | undefined, maxChars: number): string {
  if (!input) return "";
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}

export function isUsefulContent(input: string | null | undefined): boolean {
  if (!input) return false;
  const cleaned = cleanText(input);
  return cleaned.length >= 500;
}
