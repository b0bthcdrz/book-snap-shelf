import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchBookByIsbn } from "./googleBooks";

const globalFetch = global.fetch;

describe("fetchBookByIsbn", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds request and normalizes response", async () => {
    const mockJson = vi.fn().mockResolvedValue({
      items: [
        {
          volumeInfo: {
            title: "Test Title",
            authors: ["Author One"],
            publisher: "Pub",
            description: "Desc",
            publishedDate: "2020-05-01",
            categories: ["Fiction"],
            imageLinks: { thumbnail: "http://example.com/thumb.jpg" },
            industryIdentifiers: [{ type: "ISBN_13", identifier: "9781234567890" }],
          },
        },
      ],
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    } as any);

    const result = await fetchBookByIsbn("9781234567890");
    expect(global.fetch).toHaveBeenCalled();
    const calledUrl = new URL((global.fetch as any).mock.calls[0][0]);
    expect(calledUrl.searchParams.get("q")).toBe("isbn:9781234567890");
    expect(result?.title).toBe("Test Title");
    expect(result?.authors?.[0]).toBe("Author One");
    expect(result?.year).toBe("2020");
    expect(result?.genre).toBe("Fiction");
    expect(result?.coverUrl).toBe("https://example.com/thumb.jpg");
  });

  it("returns null when no items", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: [] }),
    } as any);
    const result = await fetchBookByIsbn("000");
    expect(result).toBeNull();
  });
});

global.fetch = globalFetch;
