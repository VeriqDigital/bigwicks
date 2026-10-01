import "server-only";
import { fireworksCategories } from "@/data/fireworks";
import { categoryHref } from "./urls";
import type { PublicProduct } from "./public-products";

export function homepageCategoryCards(products: PublicProduct[]) {
  const categories = [...new Map(products.flatMap((product) => product.category ? [[product.category.id, product.category] as const] : [])).values()];
  return fireworksCategories.map((card) => {
    const matches = categories.filter((category) => category.homepageCard === card.id);
    const category = matches.length === 1 ? matches[0] : null;
    return { ...card, href: category ? categoryHref(category.id) : card.href, mapped: Boolean(category) };
  });
}
