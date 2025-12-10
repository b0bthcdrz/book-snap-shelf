type MaybeRequest = Request & {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  url?: string;
};

export async function parseJsonBody(req: MaybeRequest): Promise<any | null> {
  const anyReq = req as any;

  if (typeof anyReq.json === "function") {
    try {
      return await anyReq.json();
    } catch {
      // fall through to legacy parsing
    }
  }

  const rawBody = anyReq.body;

  if (rawBody === undefined || rawBody === null) {
    return null;
  }

  if (typeof rawBody === "string") {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  }

  if (rawBody instanceof Uint8Array) {
    try {
      const text = new TextDecoder().decode(rawBody);
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (typeof rawBody === "object") {
    return rawBody;
  }

  return null;
}

export function resolveRequestUrl(req: MaybeRequest): string | null {
  const url = req.url;

  if (!url) {
    return null;
  }

  try {
    return new URL(url, "http://localhost").toString();
  } catch {
    // ignore and try with host header
  }

  const host =
    (req.headers?.host as string | undefined) ??
    (req.headers?.Host as string | undefined);

  if (!host) {
    return null;
  }

  try {
    return new URL(url, `http://${host}`).toString();
  } catch {
    return null;
  }
}
