import { defineField, defineType } from "sanity";
import { TagIcon } from "@sanity/icons/Tag";
import { fireworksCategories } from "../../data/fireworks";

export const category = defineType({
  name: "category", title: "Category", type: "document", icon: TagIcon,
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (rule) => rule.required().max(100) }),
    defineField({ name: "homepageCard", title: "Homepage category card", type: "string",
      description: "Optional mapping to a curated homepage card. Assign each card to one category. Unmapped or ambiguous cards link to the full catalog; images stay curated.",
      options: { list: fireworksCategories.map((card) => ({ title: card.title, value: card.id })) },
      validation: (rule) => rule.custom((value) => !value || fireworksCategories.some((card) => card.id === value) || "Choose an existing homepage card.") }),
  ],
  preview: { select: { title: "name" } },
});
