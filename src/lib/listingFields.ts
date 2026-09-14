import { businessProfileSchema } from "@/lib/validation";

// Shared by both the business-owner and admin listing forms, which submit
// the same fields under the same names.
export function parseListingFields(formData: FormData) {
  return businessProfileSchema.safeParse({
    companyName: formData.get("companyName"),
    category: formData.get("category"),
    description: formData.get("description"),
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    hours: formData.get("hours") ?? "",
    addressLine: formData.get("addressLine") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    zipCode: formData.get("zipCode"),
  });
}
