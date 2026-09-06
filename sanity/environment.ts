// Only non-secret identifiers belong here: this module is also used by Studio.
export const sanityApiVersion = "2026-09-06";

export function sanityEnvironment() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
  return projectId && /^[a-z0-9]+$/.test(projectId) && dataset && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(dataset)
    ? { projectId, dataset } : null;
}
