export const UNEXPECTED_API_RESPONSE_MESSAGE =
  "ReaDirect received an unexpected server response. Please try again.";

function isJsonContentType(contentType: string | null): boolean {
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  return (
    mediaType === "application/json" || mediaType?.endsWith("+json") === true
  );
}

export async function readApiJson(response: Response): Promise<unknown> {
  if (!isJsonContentType(response.headers.get("Content-Type"))) {
    throw new Error(UNEXPECTED_API_RESPONSE_MESSAGE);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(UNEXPECTED_API_RESPONSE_MESSAGE);
  }
}
