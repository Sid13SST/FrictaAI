/**
 * Error classification + user-facing copy for everything the frontend fetches.
 *
 * The backend classifies failures in its logs (AUTH, NOT_FOUND, SERVER, plus
 * database/queue failures surfaced as 5xx with a driver message) but the HTTP
 * body is only `{ error: string }`. This module turns a Response / thrown value
 * into one of a small set of kinds and maps each kind to copy a person can act
 * on, so raw strings like "Internal Server Error" or a Prisma stack never reach
 * the UI.
 */

export type ErrorKind =
  | 'AUTH'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'DATABASE'
  | 'UNAVAILABLE'
  | 'SERVER'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly kind: ErrorKind;
  /** HTTP status, or 0 when the request never produced a response. */
  readonly status: number;
  /** Raw server/driver text. For logs only — never render this. */
  readonly detail?: string;

  constructor(kind: ErrorKind, status: number, detail?: string) {
    super(COPY[kind].message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

export interface ErrorCopy {
  title: string;
  message: string;
}

const COPY: Record<ErrorKind, ErrorCopy> = {
  AUTH: {
    title: 'Your session has expired',
    message: 'Sign in again to pick up where you left off.',
  },
  FORBIDDEN: {
    title: "You don't have access to this",
    message: 'It belongs to another account, or your permissions have changed.',
  },
  NOT_FOUND: {
    title: "We couldn't find that",
    message: 'It may have been deleted, or the link is out of date.',
  },
  VALIDATION: {
    title: 'Check the details and try again',
    message: "Some of the information you entered isn't valid.",
  },
  CONFLICT: {
    title: "That isn't ready yet",
    message: 'Give it a moment to finish, then try again.',
  },
  RATE_LIMIT: {
    title: 'Too many requests',
    message: "You're going a little fast — wait a few seconds and try again.",
  },
  DATABASE: {
    title: "We couldn't reach the database",
    message: 'Your data is safe. Try again in a moment.',
  },
  UNAVAILABLE: {
    title: 'Fricta is temporarily unavailable',
    message: "We're having trouble on our side. Try again in a moment.",
  },
  SERVER: {
    title: 'Something went wrong on our side',
    message: "We've logged the problem. Try again in a moment.",
  },
  NETWORK: {
    title: "Can't reach Fricta",
    message: 'Check your internet connection and try again.',
  },
  TIMEOUT: {
    title: 'That took too long',
    message: "The request timed out. Check your connection and try again.",
  },
  UNKNOWN: {
    title: 'Something went wrong',
    message: 'Try again in a moment.',
  },
};

/** Kinds where retrying the same request can reasonably succeed. */
const RETRYABLE: ReadonlySet<ErrorKind> = new Set<ErrorKind>([
  'DATABASE', 'UNAVAILABLE', 'SERVER', 'NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'CONFLICT', 'UNKNOWN',
]);

const DATABASE_HINT = /prisma|database|postgres|\bP[12]\d{3}\b|connection pool|ECONNREFUSED|can't reach database/i;

/**
 * Validation messages the backend writes by hand, rewritten in product
 * language. Anything not listed falls back to the generic VALIDATION copy.
 */
const VALIDATION_COPY: Array<[RegExp, string]> = [
  [/projectName and websiteUrl are required/i, 'Add a project name and a website URL.'],
  [/projectId, url, and goal are required/i, 'Choose a project, a target URL, and an audit goal.'],
  [/projectId and url are required/i, 'Choose a project and a target URL.'],
  [/invalid url|url is invalid|must be a valid url/i, "That URL doesn't look right — include the full address, e.g. https://example.com."],
  [/already (running|in progress)/i, 'An audit is already running for this project. Wait for it to finish first.'],
];

export function kindFromStatus(status: number, serverMessage = ''): ErrorKind {
  if (status === 401) return 'AUTH';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 408) return 'TIMEOUT';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMIT';
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status >= 500) {
    if (DATABASE_HINT.test(serverMessage)) return 'DATABASE';
    if (status === 502 || status === 503 || status === 504) return 'UNAVAILABLE';
    return 'SERVER';
  }
  return 'UNKNOWN';
}

/** Build an ApiError from a non-OK Response. Never throws. */
export async function errorFromResponse(res: Response): Promise<ApiError> {
  let detail = '';
  try {
    const body = await res.clone().json();
    if (body && typeof body.error === 'string') detail = body.error;
    else if (body && typeof body.message === 'string') detail = body.message;
  } catch {
    // Non-JSON body (proxy error page, empty 502, ...) — status alone decides.
  }
  return new ApiError(kindFromStatus(res.status, detail), res.status, detail || undefined);
}

/** Normalise anything that can be thrown from a fetch path into an ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err && typeof err === 'object') {
    const e = err as { name?: string; message?: string; code?: number; status?: number };
    if (e.name === 'AbortError' || e.name === 'TimeoutError') return new ApiError('TIMEOUT', 0, e.message);
    // fetch() rejects with a TypeError when the network/CORS layer fails.
    if (e.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(e.message ?? '')) {
      return new ApiError('NETWORK', 0, e.message);
    }
    const status = typeof e.status === 'number' ? e.status : typeof e.code === 'number' ? e.code : 0;
    if (status) return new ApiError(kindFromStatus(status, e.message), status, e.message);
    return new ApiError('UNKNOWN', 0, e.message);
  }
  return new ApiError('UNKNOWN', 0, typeof err === 'string' ? err : undefined);
}

export interface DescribedError extends ErrorCopy {
  kind: ErrorKind;
  status: number;
  retryable: boolean;
}

/**
 * User-facing copy for an error.
 *
 * @param action Optional lead-in naming what failed, e.g. "load your projects".
 *               Produces titles like "We couldn't load your projects".
 */
export function describeError(err: unknown, action?: string): DescribedError {
  const apiErr = toApiError(err);
  const base = COPY[apiErr.kind];
  let { title, message } = base;

  if (apiErr.kind === 'VALIDATION' && apiErr.detail) {
    const match = VALIDATION_COPY.find(([re]) => re.test(apiErr.detail!));
    if (match) message = match[1];
  }

  // For generic server-side kinds the action is more useful than the generic
  // title; specific kinds (auth, database, network...) keep their own title
  // and mention the action in the message instead.
  if (action) {
    if (apiErr.kind === 'SERVER' || apiErr.kind === 'UNKNOWN') {
      title = `We couldn't ${action}`;
    } else if (apiErr.kind === 'DATABASE') {
      title = `We couldn't reach the database`;
      message = `We couldn't ${action} — try again in a moment.`;
    }
  }

  return {
    title,
    message,
    kind: apiErr.kind,
    status: apiErr.status,
    retryable: RETRYABLE.has(apiErr.kind),
  };
}

/** One-line version for inline form errors. */
export function errorMessage(err: unknown, action?: string): string {
  const d = describeError(err, action);
  return d.kind === 'VALIDATION' ? d.message : `${d.title}. ${d.message}`;
}
