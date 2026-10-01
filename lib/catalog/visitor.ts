import "server-only";
import { getCurrentUser } from "@/lib/auth/authorization";
import { getAvailableCatalogForCustomer } from "./service";

export async function getVisitorPricing() {
  const user = await getCurrentUser();
  if (user?.role !== "CUSTOMER" || !user.customer?.active) return null;
  // The existing zero-input service independently reauthorizes and resolves the
  // current SQL tier. No URL, form, cookie tier or client-supplied price is used.
  return getAvailableCatalogForCustomer();
}
