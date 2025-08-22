import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, BookOpen, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AddBook() {
  const [isbn, setIsbn] = useState("");
  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBookData = async () => {
    if (!isbn.trim()) {
      toast({
        title: "Error",
        description: "Please enter an ISBN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Try Open Library API first
      const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (response.ok) {
        const data = await response.json();
        setBookData({
          title: data.title,
          authors: data.authors?.[0]?.name || "Unknown Author",
          publish_date: data.publish_date,
          cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
          isbn: isbn
        });
      } else {
        throw new Error("Book not found");
      }
    } catch (error) {
      toast({
        title: "Book not found",
        description: "Could not find book data for this ISBN. Please check the number and try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const saveBook = () => {
    // This will be implemented with Supabase integration
    toast({
      title: "Connect Supabase",
      description: "To save books, please connect your Supabase database first.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Add New Book</h1>
            <p className="text-muted-foreground">Scan or enter an ISBN to add a book to your library</p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Book Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ISBN Input */}
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <div className="flex gap-2">
                  <Input
                    id="isbn"
                    placeholder="Enter ISBN (e.g., 9780142437230)"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={fetchBookData} 
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {/* Future: Barcode Scanner */}
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Barcode scanning coming soon!</p>
              </div>

              {/* Book Preview */}
              {bookData && (
                <div className="border rounded-lg p-6 bg-gradient-card">
                  <h3 className="font-semibold mb-4">Book Preview</h3>
                  <div className="flex gap-4">
                    <img 
                      src={bookData.cover_url} 
                      alt={bookData.title}
                      className="w-20 h-28 object-cover rounded shadow-sm bg-muted"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgODAgMTEyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCA0OEg1NlY1Nkg0OFY2NEg1NlY3Mkg0OFY4MEg1NlY4OEgyNFY0OFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+";
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{bookData.title}</h4>
                      <p className="text-sm text-muted-foreground mb-1">by {bookData.authors}</p>
                      <p className="text-sm text-muted-foreground mb-3">{bookData.publish_date}</p>
                      <Button 
                        onClick={saveBook}
                        className="bg-gradient-hero hover:opacity-90"
                      >
                        Save to Library
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}