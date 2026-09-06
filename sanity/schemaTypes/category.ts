import { defineField, defineType } from "sanity";
import { TagIcon } from "@sanity/icons/Tag";

export const category = defineType({
  name: "category", title: "Category", type: "document", icon: TagIcon,
  fields: [defineField({ name: "name", title: "Name", type: "string", validation: (rule) => rule.required().max(100) })],
  preview: { select: { title: "name" } },
});
