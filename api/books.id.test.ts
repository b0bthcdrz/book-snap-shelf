import { describe, expect, it, vi, beforeEach } from "vitest";
import handler from "./books/[id]";

const collection = {
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
};

vi.mock("./_lib/mongo", () => ({
  getBooksCollection: vi.fn(async () => collection),
  serializeBook: (doc: any) => ({
    id: doc._id?.toString?.() ?? "mock-id",
    title: doc.title,
    author: doc.author,
    isbn: doc.isbn ?? null,
  }),
}));

vi.mock("./_lib/request", async () => {
  const actual = await vi.importActual<typeof import("./_lib/request")>("./_lib/request");
  return {
    ...actual,
  };
});

describe("api/books/[id] handler", () => {
  beforeEach(() => {
    collection.findOne.mockReset();
    collection.findOneAndUpdate.mockReset();
    collection.findOneAndDelete.mockReset();
  });

  const objectId = "64b9e4f1c2a4b5c6d7e8f901";

  it("returns a book on GET", async () => {
    collection.findOne.mockResolvedValueOnce({ _id: objectId, title: "T", author: "A", isbn: null });
    const res = await handler(new Request(`http://localhost/api/books/${objectId}`, { method: "GET" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.book.id).toBe(objectId);
  });

  it("updates a book on PUT", async () => {
    collection.findOneAndUpdate.mockResolvedValueOnce({
      value: { _id: objectId, title: "Updated", author: "New Author", isbn: "123" },
    });
    const req = new Request(`http://localhost/api/books/${objectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated", authors: "New Author", isbn: "123" }),
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.book.title).toBe("Updated");
  });

  it("deletes a book on DELETE", async () => {
    collection.findOneAndDelete.mockResolvedValueOnce({
      value: { _id: objectId, title: "Gone", author: "Auth" },
    });
    const req = new Request(`http://localhost/api/books/${objectId}`, { method: "DELETE" });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
  });
});
