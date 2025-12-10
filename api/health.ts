import { getBooksCollection } from "./_lib/mongo.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(): Promise<Response> {
  try {
    const collection = await getBooksCollection();
    await collection.estimatedDocumentCount();
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("health check failed", error);
    return new Response(JSON.stringify({ status: "error", message: String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
