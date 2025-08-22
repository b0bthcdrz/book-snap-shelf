import { useEffect, useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Library as LibraryIcon, Plus, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Library() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // For now, show all books regardless of user_id to see existing data
      const { data, error } = await (supabase as any)
        .from("books")
        .select("id, title, author, isbn, cover_url, year")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        setBooks([]);
      } else {
        setBooks(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const count = books.length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <LibraryIcon className="h-8 w-8 text-book-spine" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Library</h1>
              <p className="text-muted-foreground">{loading ? "Loading..." : `${count} books in your collection`}</p>
            </div>
          </div>
          
          <Link to="/add">
            <Button className="bg-gradient-hero hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        </div>

        {(!loading && books.length === 0) ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Start building your digital book collection by scanning or entering ISBNs
              </p>
              <Link to="/add">
                <Button className="bg-gradient-hero hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Book
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {books.map((book) => (
            <Card key={book.id} className="group cursor-pointer hover:shadow-book transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-4">
                {/* Book Cover */}
                  <div className="relative w-full aspect-[2/3] rounded shadow-sm bg-muted mb-3 overflow-hidden">
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDEyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNiA3Mkg4NFY4NEg3MlY5Nkg4NFYxMDhINzJWMTIwSDg0VjEzMkgzNlY3MloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+";
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Book Info */}
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{book.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{book.author}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{book.year || "0000"}</span>
                      {book.isbn && (
                        <span className="text-xs bg-muted px-1 py-0.5 rounded">ISBN</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}