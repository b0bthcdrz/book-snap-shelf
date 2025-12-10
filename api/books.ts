import { getBooksCollection, serializeBook } from "./_lib/mongo";
import { parseJsonBody } from "./_lib/request";

export const config = {
  runtime: "nodejs",
};

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

export default async function handler(req: Request): Promise<Response> {
  try {
    const collection = await getBooksCollection();

    if (req.method === "GET") {
      const docs = await collection.find().toArray();

      const sortedDocs = docs
        .map((doc) => {
          const sortCandidate =
            doc.created_at ??
            (doc as any).date_recorded ??
            null;
          const parsed = sortCandidate ? Date.parse(sortCandidate) : NaN;
          const fallback =
            typeof (doc as any)._id?.getTimestamp === "function"
              ? (doc as any)._id.getTimestamp().getTime()
              : 0;
          const sortValue = Number.isFinite(parsed) ? parsed : fallback;

          return { doc, sortValue };
        })
        .sort((a, b) => b.sortValue - a.sortValue)
        .map(({ doc }) => doc);

      return jsonResponse({ books: sortedDocs.map(serializeBook) });
    }

    if (req.method === "POST") {
      const payload = await parseJsonBody(req as any);

      if (!payload) {
        return jsonResponse({ message: "Invalid JSON payload" }, { status: 400 });
      }

      const title = (payload.title ?? "").trim();
      const authors = (payload.authors ?? "").trim();
      const isbn = (payload.isbn ?? "").trim();

      if (!title || !authors) {
        return jsonResponse({ message: "Title and authors are required" }, { status: 400 });
      }

      if (isbn) {
        const existing = await collection.findOne({ isbn });
        if (existing) {
          return jsonResponse({ message: "A book with this ISBN already exists." }, { status: 409 });
        }
      }

      const insertDoc = {
        user_id: DEMO_USER_ID,
        title,
        author: authors,
        isbn: isbn || null,
        cover_url: payload.cover_url || null,
        year: payload.year || "0000",
        publisher: payload.publisher || null,
        genre: payload.genre || null,
        description: payload.description || null,
        created_at: new Date().toISOString(),
      };

      const insertResult = await collection.insertOne(insertDoc);
      const saved = await collection.findOne({ _id: insertResult.insertedId });

      if (!saved) {
        return jsonResponse({ message: "Book insertion failed" }, { status: 500 });
      }

      return jsonResponse({ book: serializeBook(saved) }, { status: 201 });
    }

    return jsonResponse({ message: "Method Not Allowed" }, { status: 405 });
  } catch (error) {
    console.error("books handler error", error);
    return jsonResponse({ message: "Server error. Check MongoDB connection and env vars." }, { status: 500 });
  }
}

