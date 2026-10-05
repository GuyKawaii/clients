/** Removes paths, queries, fragments, and user information from HTTP(S) URLs. */
export function trimToOriginUrl(uri: string): string {
  try {
    const url = new URL(uri);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : uri;
  } catch {
    return uri;
  }
}
