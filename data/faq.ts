import { siteConfig } from "@/config/site";

export const faqs = [
  { question: "Where is Big Wicks located?", answer: `Find us at ${siteConfig.contact.address}, right on IN-39. Use the directions link below to open the route in Google Maps.` },
  { question: "How far are you from New Buffalo?", answer: "Big Wicks is about 3 miles south of downtown New Buffalo, Michigan, making us a quick stop across the Indiana state line." },
  { question: "What kinds of fireworks do you carry?", answer: "Our selection spans novelties, fountains, firecrackers, Roman candles, artillery shells, cakes, assortments, kits, and finale-ready options. Selection can change, so call or visit for current availability." },
  { question: "What brands do you carry?", answer: "We carry well-known brands like Winda, Miracle, Brothers, and World-Class Fireworks, along with our own Big Wicks brand." },
  { question: "Can your staff help me choose?", answer: "Yes. Tell our team the kind of celebration, effects, and experience you have in mind, and they can help you compare options in the store." },
  { question: "Can I see what a firework looks like before buying?", answer: "Big Wicks has used in-store video demonstrations to help shoppers understand different effects. Ask the team whether a demo is available for the item you are considering." },
] as const;
