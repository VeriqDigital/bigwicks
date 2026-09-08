import "server-only";
import { cleanupExpiredBuckets, consumeBucket } from "@/lib/auth/rate-limit";
import {
  CONTACT_EMAIL_LIMIT, CONTACT_EMAIL_WINDOW_SECONDS,
  CONTACT_GLOBAL_LIMIT, CONTACT_GLOBAL_WINDOW_SECONDS,
} from "./policy";

// Call only after field validation. No request header is a trusted source identity.
export async function allowContactAttempt(validatedEmail: string) {
  // Global first bounds both rotating-email sends and creation of identity rows.
  if (!await consumeBucket("contact:global", CONTACT_GLOBAL_LIMIT, CONTACT_GLOBAL_WINDOW_SECONDS)) return false;
  // Contact traffic must clean up even when nobody logs in. Errors propagate so
  // the action fails closed; never refund attempts after uncertain mail delivery.
  await cleanupExpiredBuckets();
  return consumeBucket(`contact:email:${validatedEmail.trim().toLowerCase()}`, CONTACT_EMAIL_LIMIT, CONTACT_EMAIL_WINDOW_SECONDS);
}
