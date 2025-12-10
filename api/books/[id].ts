import { ObjectId } from "mongodb";
import { getBooksCollection, serializeBook } from "../_lib/mongo.js";
import { parseJsonBody, resolveRequestUrl } from "../_lib/request.js";

export const config = {
  runtime: "nodejs",
};

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

const extractId = (url: string): string | null => {
  const segments = new URL(url).pathname.split("/");
  let id = segments.pop() || "";
  if (!id && segments.length) {
    id = segments.pop() || "";
  }
  return id || null;
};

export default async function handler(req: Request): Promise<Response> {
  try {
    const resolvedUrl = resolveRequestUrl(req as any);
    if (!resolvedUrl) {
      return jsonResponse({ message: "Unable to read request URL" }, { status: 400 });
    }

    const id = extractId(resolvedUrl);

    if (!id) {
      return jsonResponse({ message: "Book id is required" }, { status: 400 });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return jsonResponse({ message: "Invalid book id" }, { status: 400 });
    }

    const collection = await getBooksCollection();

    if (req.method === "GET") {
      const doc = await collection.findOne({ _id: objectId });
      if (!doc) {
        return jsonResponse({ message: "Book not found" }, { status: 404 });
      }
      return jsonResponse({ book: serializeBook(doc) });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const payload = await parseJsonBody(req as any);

      if (!payload) {
        return jsonResponse({ message: "Invalid JSON payload" }, { status: 400 });
      }

      const updatePayload = {
        title: payload.title ?? null,
        author: payload.authors ?? payload.author ?? null,
        isbn: payload.isbn ?? null,
        year: payload.year ?? null,
        publisher: payload.publisher ?? null,
        genre: payload.genre ?? null,
        description: payload.description ?? null,
        cover_url: payload.cover_url ?? null,
      };

      const cleanedPayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([, value]) => value !== undefined)
      );

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: cleanedPayload },
        { returnDocument: "after" }
      );

      if (!result.value) {
        return jsonResponse({ message: "Book not found" }, { status: 404 });
      }

      return jsonResponse({ book: serializeBook(result.value) });
    }

    if (req.method === "DELETE") {
      const result = await collection.findOneAndDelete({ _id: objectId });

      if (!result.value) {
        return jsonResponse({ message: "Book not found" }, { status: 404 });
      }

      return jsonResponse({ message: "Book deleted" });
    }

    return jsonResponse({ message: "Method Not Allowed" }, { status: 405 });
  } catch (error) {
    console.error("book detail handler error", error);
    return jsonResponse({ message: "Server error. Check MongoDB connection and env vars." }, { status: 500 });
  }
}

