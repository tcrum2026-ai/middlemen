import { describe, expect, it } from "vitest";
import {
  businessProfileSchema,
  forgotPasswordSchema,
  loginSchema,
  requestSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation";

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    const result = signupSchema.safeParse({
      name: "Cara Customer",
      email: "cara@example.com",
      password: "password123",
      role: "CUSTOMER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Cara Customer",
      email: "cara@example.com",
      password: "short",
      role: "CUSTOMER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Cara Customer",
      email: "not-an-email",
      password: "password123",
      role: "CUSTOMER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a role outside CUSTOMER/BUSINESS", () => {
    const result = signupSchema.safeParse({
      name: "Cara Customer",
      email: "cara@example.com",
      password: "password123",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password but doesn't enforce a minimum length", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@example.com", password: "" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@example.com" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires both a token and an 8+ character password", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "abc123", password: "longenough" }).success,
    ).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "", password: "longenough" }).success).toBe(
      false,
    );
    expect(resetPasswordSchema.safeParse({ token: "abc123", password: "short" }).success).toBe(
      false,
    );
  });
});

describe("businessProfileSchema", () => {
  const base = {
    companyName: "Acme Co",
    category: "Home Services",
    description: "A description that is long enough.",
    zipCode: "44203",
  };

  it("accepts the minimum required fields with optional fields omitted", () => {
    expect(businessProfileSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an empty string for optional fields like hours", () => {
    expect(businessProfileSchema.safeParse({ ...base, hours: "" }).success).toBe(true);
  });

  it("accepts a populated hours field", () => {
    expect(businessProfileSchema.safeParse({ ...base, hours: "Mon-Fri 8am-6pm" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid ZIP code", () => {
    expect(businessProfileSchema.safeParse({ ...base, zipCode: "abc" }).success).toBe(false);
  });

  it("accepts a ZIP+4", () => {
    expect(businessProfileSchema.safeParse({ ...base, zipCode: "44203-1234" }).success).toBe(
      true,
    );
  });
});

describe("requestSchema", () => {
  const base = {
    title: "Repaint my house",
    description: "Needs a full exterior repaint before winter.",
    category: "Home Services",
    zipCode: "44203",
    budgetMin: 500,
    budgetMax: 1500,
  };

  it("accepts a valid request", () => {
    expect(requestSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a max budget below the min budget", () => {
    const result = requestSchema.safeParse({ ...base, budgetMin: 2000, budgetMax: 500 });
    expect(result.success).toBe(false);
  });

  it("accepts an equal min and max budget", () => {
    expect(
      requestSchema.safeParse({ ...base, budgetMin: 1000, budgetMax: 1000 }).success,
    ).toBe(true);
  });
});
