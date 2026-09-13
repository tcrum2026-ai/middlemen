import { describe, expect, it } from "vitest";
import { extractDomain } from "@/lib/domain";

describe("extractDomain", () => {
  it("extracts the hostname from a bare domain", () => {
    expect(extractDomain("example.com")).toBe("example.com");
  });

  it("strips the protocol", () => {
    expect(extractDomain("https://example.com")).toBe("example.com");
    expect(extractDomain("http://example.com")).toBe("example.com");
  });

  it("strips a leading www.", () => {
    expect(extractDomain("https://www.example.com")).toBe("example.com");
  });

  it("ignores a path, query string, or port", () => {
    expect(extractDomain("https://example.com/about?x=1")).toBe("example.com");
    expect(extractDomain("https://example.com:8080/path")).toBe("example.com");
  });

  it("lowercases the result", () => {
    expect(extractDomain("HTTPS://Example.COM")).toBe("example.com");
  });

  it("treats different domains as different", () => {
    expect(extractDomain("example.com")).not.toBe(extractDomain("example.org"));
  });

  it("returns null for unparseable input", () => {
    expect(extractDomain("not a url at all !!")).toBeNull();
  });
});
