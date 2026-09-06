export type CustomerField = "companyName" | "email" | "customerNumber" | "pricingTierId" | "customerId" | "status";

export type CustomerFormState = {
  message?: string;
  success?: boolean;
  errors?: Partial<Record<CustomerField, string[]>>;
  values?: Partial<Record<CustomerField, string>>;
};
