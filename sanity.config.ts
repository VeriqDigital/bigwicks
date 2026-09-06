"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { sanityEnvironment } from "./sanity/environment";
import { product } from "./sanity/schemaTypes/product";
import { category } from "./sanity/schemaTypes/category";

const environment = sanityEnvironment();
// An empty configuration lets the repository build without a remote project.
// The Studio route renders a configuration notice instead of mounting this case.
export default defineConfig(environment ? {
  ...environment, name: "big-wicks", title: "Big Wicks catalog", basePath: "/studio",
  plugins: [structureTool()], schema: { types: [product, category] },
  document: {
    // Sanity's standard duplicate action copies read-only fields. New products
    // must start with a fresh generated key; editing normal content preserves it.
    actions: (actions, context) => context.schemaType === "product" ? actions.filter((action) => action.action !== "duplicate") : actions,
  },
} : []);
