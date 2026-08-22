export const contactSubjects = [
  { value: "product", label: "Product Question" },
  { value: "store", label: "Store Question" },
  { value: "deals", label: "Deals / Promotions" },
  { value: "visit", label: "Visiting the Store" },
  { value: "general", label: "General Question" },
] as const;

export type ContactField = "name" | "email" | "phone" | "subject" | "message";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  submittedAt?: number;
};

export const initialContactFormState: ContactFormState = {
  status: "idle",
  message: "",
};
