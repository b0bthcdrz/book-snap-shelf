import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./books";

type MockCollection = {
  find: ReturnType<typeof vi.fn>;
  toArray?: () => Promise<any[]>;
  findOne: ReturnType<typeof vi.fn>;
  insertOne: ReturnType<typeof vi.fn>;
};

const collection: MockCollection = {
  find: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
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

describe("api/books handler", () => {
  beforeEach(() => {
    collection.find.mockReset();
    collection.findOne.mockReset();
    collection.insertOne.mockReset();
    collection.toArray = undefined;
  });

  it("returns sorted books on GET", async () => {
    const docs = [
      { _id: "1", title: "A", author: "X", created_at: "2023-01-01T00:00:00.000Z" },
      { _id: "2", title: "B", author: "Y", created_at: "2024-01-01T00:00:00.000Z" },
    ];
    collection.find.mockReturnValue({ toArray: async () => docs });

    const res = await handler(new Request("http://localhost/api/books", { method: "GET" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.books).toHaveLength(2);
    expect(body.books[0].title).toBe("B"); // newest first
  });

  it("rejects duplicate ISBN on POST", async () => {
    collection.findOne.mockResolvedValueOnce({ _id: "exists" });
    const req = new Request("http://localhost/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "T", authors: "A", isbn: "123" }),
    });
    const res = await handler(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already exists/i);
  });

  it("creates a book on POST", async () => {
    collection.findOne.mockResolvedValueOnce(null);
    collection.insertOne.mockResolvedValueOnce({ insertedId: "abc" });
    collection.findOne.mockResolvedValueOnce({ _id: "abc", title: "T", author: "A", isbn: "123" });

    const req = new Request("http://localhost/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "T", authors: "A", isbn: "123" }),
    });

    const res = await handler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.book.id).toBe("abc");
    expect(body.book.title).toBe("T");
  });
});
