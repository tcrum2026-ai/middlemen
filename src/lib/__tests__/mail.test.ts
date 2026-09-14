import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/mail";

describe("escapeHtml", () => {
  it("escapes all five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Repaint the exterior of a 3-bedroom house")).toBe(
      "Repaint the exterior of a 3-bedroom house",
    );
  });

  it("neutralizes a script-tag breakout attempt", () => {
    const malicious = "</script><script>alert(1)</script>";
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<script>");
    expect(escaped).not.toContain("</script>");
  });

  it("neutralizes an HTML anchor injection attempt", () => {
    const malicious = '<a href="https://evil.example">click here</a>';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<a ");
    expect(escaped).not.toContain("</a>");
  });
});
