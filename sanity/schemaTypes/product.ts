import { defineField, defineType, type ValidationContext } from "sanity";
import { PackageIcon } from "@sanity/icons/Package";
import { isCatalogKey } from "../catalog-key";
import { sanityApiVersion } from "../environment";
import { productVideo } from "../../lib/catalog/video";
import { isProductSlug } from "../../lib/catalog/urls";

export async function validateCatalogKey(value: unknown, context: ValidationContext) {
  if (!isCatalogKey(value)) return "A generated catalog key is required. Ask the developer to repair a missing key.";
  const id = context.document?._id?.replace(/^drafts\./, "");
  if (!id) return "Save the document before validating its catalog key.";
  try {
    const client = context.getClient({ apiVersion: sanityApiVersion }).withConfig({ perspective: "raw", useCdn: false });
    const result = await client.fetch<{ duplicate: boolean; publishedKey: string | null }>(`{
      "duplicate": count(*[_type == "product" && catalogKey == $key && !(_id in [$id, $draft])]) > 0,
      "publishedKey": *[_id == $id][0].catalogKey
    }`, { key: value, id, draft: `drafts.${id}` });
    if (result.duplicate) return "This catalog key belongs to another document. Create a new product instead of copying its key.";
    if (result.publishedKey && result.publishedKey !== value) return "A published product's catalog key must never change.";
    return true;
  } catch { return "Catalog identity could not be verified. Try again before publishing."; }
}

export const product = defineType({
  name: "product", title: "Product", type: "document", icon: PackageIcon,
  initialValue: () => ({ catalogKey: crypto.randomUUID(), available: false }),
  fields: [
    defineField({ name: "catalogKey", title: "Catalog key", type: "string", readOnly: true,
      description: "Permanent product identity. Keep it when changing the SKU or name. Prices are managed separately.",
      validation: (rule) => rule.required().custom(validateCatalogKey) }),
    defineField({ name: "sku", title: "SKU / item number", type: "string",
      validation: (rule) => rule.required().max(100).custom((value) => !value || (value.trim() === value && !/[\r\n]/.test(value)) || "Remove leading/trailing spaces and line breaks.") }),
    defineField({ name: "name", title: "Product name", type: "string", validation: (rule) => rule.required().max(200) }),
    defineField({ name: "slug", title: "Public page slug", type: "slug", options: { source: "name", maxLength: 160 },
      description: "Optional readable URL. Without one the permanent catalog key is used. Keep published slugs stable to preserve links.",
      validation: (rule) => rule.custom((value) => !value?.current || (isProductSlug(value.current) && !isCatalogKey(value.current)) || "Use lowercase letters, numbers and single hyphens; catalog keys are reserved.") }),
    defineField({ name: "category", title: "Category", type: "reference", to: [{ type: "category" }],
      validation: (rule) => rule.required().warning("Choose a category to help customers browse.") }),
    defineField({ name: "description", title: "Description", type: "text", rows: 5, validation: (rule) => rule.max(10000) }),
    ...["brand", "packing"].map((name) => defineField({ name, title: name === "brand" ? "Brand" : "Case packing", type: "string",
      description: name === "packing" ? "Contents of one complete case. Preserve the supplied notation; prices are per case." : "Optional product brand/manufacturer.",
      validation: (rule) => rule.max(100).custom((value) => !value || !/[\u0000-\u001f\u007f-\u009f]/u.test(value) || "Use plain single-line text.") })),
    defineField({ name: "image", title: "Product image", type: "image", options: { hotspot: true }, fields: [
      defineField({ name: "alt", title: "Image description", type: "string", validation: (rule) => rule.max(300) }),
    ] }),
    defineField({ name: "videoUrl", title: "Product demonstration video", type: "url",
      description: "Optional HTTPS YouTube watch/share/shorts URL or public Vimeo video URL. No HTML or uploads. The video must permit embedding.",
      validation: (rule) => rule.uri({ scheme: ["https"] }).custom((value) => !value || Boolean(productVideo(value)) || "Enter a supported HTTPS YouTube or Vimeo video URL.") }),
    defineField({ name: "available", title: "Visible in public and wholesale catalogs", type: "boolean",
      description: "Publishes this product on the public website. Approved customers with a configured case price can also order it. Manual visibility only, not an inventory count or guarantee of stock.",
      validation: (rule) => rule.required() }),
  ],
  preview: { select: { title: "name", subtitle: "sku", media: "image" } },
});
