import type { ApiResponse } from "../api/client.js";

/** Extract the trailing id from a Location header such as ".../provisioningjobs/abc123". */
export function idFromLocation(location: string | undefined): string | undefined {
  if (!location) return undefined;
  const clean = location.split("?")[0].replace(/\/+$/, "");
  const last = clean.substring(clean.lastIndexOf("/") + 1);
  return last ? decodeURIComponent(last) : undefined;
}

/**
 * Shape a 202 Accepted response. Combell processes account, database and domain
 * operations in the background; the Location header points at a provisioning job to poll.
 */
export function accepted(res: ApiResponse, extra: Record<string, unknown> = {}) {
  const jobId = res.location?.includes("provisioningjobs") ? idFromLocation(res.location) : undefined;
  return {
    accepted: true,
    status: res.status,
    ...(res.location ? { location: res.location } : {}),
    ...(jobId ? { provisioning_job_id: jobId, next_step: `Poll combell_provisioning_jobs_get with job_id "${jobId}" until it reports finished.` } : {}),
    ...(res.data !== undefined ? { data: res.data } : {}),
    ...extra,
  };
}

/** Shape a 201 Created response (Location header points at the created resource). */
export function created(res: ApiResponse, extra: Record<string, unknown> = {}) {
  const id = idFromLocation(res.location);
  return {
    created: true,
    status: res.status,
    ...(res.location ? { location: res.location } : {}),
    ...(id ? { id } : {}),
    ...(res.data !== undefined ? { data: res.data } : {}),
    ...extra,
  };
}

/** Shape a 200/204 outcome for updates and deletes. */
export function done(action: string, extra: Record<string, unknown> = {}) {
  return { success: true, action, ...extra };
}
