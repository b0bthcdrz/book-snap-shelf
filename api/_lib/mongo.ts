import { MongoClient, Collection, Document, WithId } from "mongodb";

const dbName = process.env.MONGODB_DB_NAME ?? "book_snap_shelf";

type GlobalWithMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalWithMongo = globalThis as GlobalWithMongo;

function getClientPromise(): Promise<MongoClient> {
  if (globalWithMongo._mongoClientPromise) {
    return globalWithMongo._mongoClientPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  const client = new MongoClient(uri);
  const promise = client.connect().catch((err) => {
    console.error("MongoDB connection failed", err);
    // reset the cached promise so the next call can retry
    globalWithMongo._mongoClientPromise = undefined;
    throw err;
  });
  globalWithMongo._mongoClientPromise = promise;
  return promise;
}

export type BookDocument = {
  user_id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  year: string | null;
  publisher: string | null;
  genre: string | null;
  description: string | null;
  created_at: string | null;
  date_recorded?: string | null;
};

export async function getBooksCollection(): Promise<Collection<BookDocument>> {
  const client = await getClientPromise();
  return client.db(dbName).collection<BookDocument>("books");
}

export function serializeBook(doc: WithId<BookDocument>) {
  const createdAt = doc.created_at ?? doc.date_recorded ?? null;

  return {
    id: doc._id.toString(),
    title: doc.title,
    author: doc.author,
    isbn: doc.isbn,
    cover_url: doc.cover_url,
    year: doc.year,
    publisher: doc.publisher,
    genre: doc.genre,
    description: doc.description,
    created_at: createdAt,
  };
}

