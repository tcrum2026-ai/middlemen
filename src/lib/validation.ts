import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: z.enum(["CUSTOMER", "BUSINESS"]),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const businessProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(1000),
});

export const requestSchema = z
  .object({
    title: z.string().trim().min(5, "Title is too short").max(140),
    description: z.string().trim().min(20, "Please add more detail").max(2000),
    category: z.string().trim().min(2).max(60),
    budgetMin: z.coerce.number().nonnegative(),
    budgetMax: z.coerce.number().positive(),
  })
  .refine((data) => data.budgetMax >= data.budgetMin, {
    message: "Max budget must be greater than or equal to min budget",
    path: ["budgetMax"],
  });

export const offerSchema = z.object({
  price: z.coerce.number().positive("Price must be greater than 0"),
  description: z.string().trim().min(10, "Please describe your offer").max(1000),
  deliveryDays: z.coerce.number().int().positive().max(365),
});

export const CATEGORIES = [
  "Home Services",
  "Web & Software",
  "Marketing",
  "Legal",
  "Accounting",
  "Events",
  "Photography",
  "Consulting",
  "Logistics",
  "Other",
] as const;
