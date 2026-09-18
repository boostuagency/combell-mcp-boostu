import { describe, it, expect } from "vitest";
import { accepted, created, done, idFromLocation } from "../src/lib/results.js";

const rl = { };

describe("idFromLocation", () => {
  it("takes the last path segment, ignoring query and trailing slash", () => {
    expect(idFromLocation("https://api.combell.com/v2/provisioningjobs/abc-1")).toBe("abc-1");
    expect(idFromLocation("https://api.combell.com/v2/dns/x.be/records/77/?x=1")).toBe("77");
    expect(idFromLocation("/v2/mailzones/x.be/catchall/all%40x.be")).toBe("all@x.be");
    expect(idFromLocation(undefined)).toBeUndefined();
  });
});

describe("accepted", () => {
  it("extracts a provisioning job id and a next step", () => {
    const out = accepted({ status: 202, data: undefined, location: "https://api.combell.com/v2/provisioningjobs/job-1", rateLimit: rl });
    expect(out).toMatchObject({ accepted: true, status: 202, provisioning_job_id: "job-1" });
    expect((out as { next_step: string }).next_step).toContain("combell_provisioning_jobs_get");
  });
  it("does not invent a job id for other locations", () => {
    const out = accepted({ status: 202, data: undefined, location: "https://api.combell.com/v2/mailzones/x.be/aliases/a%40x.be", rateLimit: rl });
    expect(out).not.toHaveProperty("provisioning_job_id");
    expect(out).toHaveProperty("location");
  });
});

describe("created / done", () => {
  it("created reports the new resource id from Location", () => {
    expect(created({ status: 201, data: undefined, location: "https://api.combell.com/v2/dns/x.be/records/9", rateLimit: rl }))
      .toMatchObject({ created: true, id: "9" });
  });
  it("done wraps an action", () => {
    expect(done("x", { a: 1 })).toEqual({ success: true, action: "x", a: 1 });
  });
});
