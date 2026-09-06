import "server-only";
import { z } from "zod";

export const loginEmailSchema = z.string().trim().toLowerCase().max(254).email();
