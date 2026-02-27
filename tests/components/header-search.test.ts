/**
 * Tests for Header persistent search box (Story 3-3)
 *
 * Covers:
 * - Empty input guard (trim + block submit)
 * - URL query param echo into search inputs
 * - Escape key clears input
 * - Form action and method attributes
 * - Accessibility attributes
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";

/** Minimal Header HTML matching the Astro component output */
function createHeaderHTML(queryParam = ""): string {
  const search = queryParam ? `?q=${encodeURIComponent(queryParam)}` : "";
  return `<!DOCTYPE html>
<html>
<body>
<header class="header" data-pagefind-ignore>
  <div class="header-inner">
    <div class="search-desktop">
      <form class="search-box" role="search" action="/search/" method="get">
        <input type="search" name="q" placeholder="搜索资讯..."
               aria-label="搜索资讯" class="search-input" maxlength="200" autocomplete="off" />
      </form>
    </div>
  </div>
  <div class="nav-row">
    <div class="search-mobile">
      <form class="search-box" role="search" action="/search/" method="get">
        <input type="search" name="q" placeholder="搜索资讯..."
               aria-label="搜索资讯" class="search-input" maxlength="200" autocomplete="off" />
      </form>
    </div>
  </div>
</header>
</body>
</html>`;
}

/**
 * Sanitize user input: strip angle brackets to prevent XSS vectors.
 * Must stay in sync with sanitizeSearchQuery in Header.astro.
 */
function sanitizeSearchQuery(raw: string): string {
  return raw.replace(/[<>]/g, "").trim().slice(0, 200);
}

/**
 * Simulate the initHeaderSearch logic from Header.astro
 * (extracted for testability since Astro <script> blocks run client-side)
 *
 * NOTE: This duplicates the runtime logic because Astro <script> blocks
 * cannot be imported directly. Keep in sync with Header.astro.
 */
function initHeaderSearch(doc: Document, locationSearch: string): void {
  const forms = doc.querySelectorAll<HTMLFormElement>(".header .search-box");
  if (forms.length === 0) return;

  const params = new URLSearchParams(locationSearch);
  const currentQuery = sanitizeSearchQuery(params.get("q") ?? "");

  forms.forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    if (!input) return;

    if (currentQuery) {
      input.value = currentQuery;
    }

    form.addEventListener("submit", (e: Event) => {
      const trimmed = input.value.trim();
      if (!trimmed) {
        e.preventDefault();
        input.focus();
      }
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        input.value = "";
        input.blur();
      }
    });
  });
}

describe("Header Search Box (Story 3-3)", () => {
  let dom: JSDOM;
  let doc: Document;

  beforeEach(() => {
    dom = new JSDOM(createHeaderHTML(), { url: "https://example.com/" });
    doc = dom.window.document;
  });

  describe("AC-6: Accessibility attributes", () => {
    it("has role=search on all forms", () => {
      const forms = doc.querySelectorAll(".header .search-box");
      expect(forms.length).toBe(2);
      forms.forEach((f) => expect(f.getAttribute("role")).toBe("search"));
    });

    it("has aria-label on all inputs", () => {
      const inputs = doc.querySelectorAll<HTMLInputElement>(
        '.header input[name="q"]',
      );
      inputs.forEach((i) =>
        expect(i.getAttribute("aria-label")).toBe("搜索资讯"),
      );
    });

    it("has maxlength=200 on all inputs", () => {
      const inputs = doc.querySelectorAll<HTMLInputElement>(
        '.header input[name="q"]',
      );
      inputs.forEach((i) => expect(i.getAttribute("maxlength")).toBe("200"));
    });

    it("header has data-pagefind-ignore", () => {
      const header = doc.querySelector(".header");
      expect(header?.hasAttribute("data-pagefind-ignore")).toBe(true);
    });
  });

  describe("AC-3: Form structure", () => {
    it("forms have action=/search/ and method=get", () => {
      const forms = doc.querySelectorAll<HTMLFormElement>(
        ".header .search-box",
      );
      forms.forEach((f) => {
        expect(f.getAttribute("action")).toBe("/search/");
        expect(f.getAttribute("method")).toBe("get");
      });
    });

    it("inputs have name=q", () => {
      const inputs = doc.querySelectorAll<HTMLInputElement>(
        '.header input[name="q"]',
      );
      expect(inputs.length).toBe(2);
    });
  });

  describe("AC-3: Empty input guard", () => {
    beforeEach(() => {
      initHeaderSearch(doc, "");
    });

    it("prevents submit when input is empty", () => {
      const form = doc.querySelector<HTMLFormElement>(".header .search-box")!;
      const event = new dom.window.Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      const prevented = !form.dispatchEvent(event);
      expect(prevented).toBe(true);
    });

    it("prevents submit when input is only whitespace", () => {
      const form = doc.querySelector<HTMLFormElement>(".header .search-box")!;
      const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
      input.value = "   ";
      const event = new dom.window.Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      const prevented = !form.dispatchEvent(event);
      expect(prevented).toBe(true);
    });

    it("allows submit when input has content", () => {
      const form = doc.querySelector<HTMLFormElement>(".header .search-box")!;
      const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
      input.value = "AI news";
      const event = new dom.window.Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      const prevented = !form.dispatchEvent(event);
      expect(prevented).toBe(false);
    });
  });

  describe("AC-5: Keyword echo from URL", () => {
    it("fills inputs with ?q= param value", () => {
      const echoDom = new JSDOM(createHeaderHTML(), {
        url: "https://example.com/search?q=AI%20news",
      });
      const echoDoc = echoDom.window.document;
      initHeaderSearch(echoDoc, "?q=AI%20news");

      const inputs = echoDoc.querySelectorAll<HTMLInputElement>(
        '.header input[name="q"]',
      );
      inputs.forEach((i) => expect(i.value).toBe("AI news"));
    });

    it("does not fill inputs when no ?q= param", () => {
      initHeaderSearch(doc, "");
      const inputs = doc.querySelectorAll<HTMLInputElement>(
        '.header input[name="q"]',
      );
      inputs.forEach((i) => expect(i.value).toBe(""));
    });

    it("trims and limits echoed query to 200 chars", () => {
      const longQuery = "a".repeat(250);
      const echoDom = new JSDOM(createHeaderHTML(), {
        url: `https://example.com/search?q=${longQuery}`,
      });
      const echoDoc = echoDom.window.document;
      initHeaderSearch(echoDoc, `?q=${longQuery}`);

      const input = echoDoc.querySelector<HTMLInputElement>(
        '.header input[name="q"]',
      )!;
      expect(input.value.length).toBe(200);
    });
  });

  describe("Escape key clears input", () => {
    it("clears input value on Escape keydown", () => {
      initHeaderSearch(doc, "?q=test");
      const input = doc.querySelector<HTMLInputElement>(
        '.header input[name="q"]',
      )!;
      expect(input.value).toBe("test");

      const escEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      input.dispatchEvent(escEvent);
      expect(input.value).toBe("");
    });
  });

  describe("XSS sanitization", () => {
    it("strips angle brackets from URL query param", () => {
      const xssQuery = '<script>alert("xss")</script>';
      const echoDom = new JSDOM(createHeaderHTML(), {
        url: "https://example.com/search?q=" + encodeURIComponent(xssQuery),
      });
      const echoDoc = echoDom.window.document;
      initHeaderSearch(echoDoc, "?q=" + encodeURIComponent(xssQuery));

      const input = echoDoc.querySelector<HTMLInputElement>(
        '.header input[name="q"]',
      )!;
      expect(input.value).not.toContain("<");
      expect(input.value).not.toContain(">");
    });
  });

  describe("autocomplete attribute", () => {
    it("has autocomplete=off on all inputs", () => {
      const inputs = doc.querySelectorAll<HTMLInputElement>(
        '.header input[name="q"]',
      );
      inputs.forEach((i) => expect(i.getAttribute("autocomplete")).toBe("off"));
    });
  });
});
