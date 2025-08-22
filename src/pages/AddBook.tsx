
import { useState, useRef, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, BookOpen, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function AddBook() {
  const [isbn, setIsbn] = useState("");
  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  const fetchBookData = async (isbnCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://openlibrary.org/isbn/${isbnCode}.json`);
      if (response.ok) {
        const data = await response.json();
        setBookData({
          title: data.title,
          authors: data.authors?.[0]?.name || "Unknown Author",
          publish_date: data.publish_date,
          cover_url: `https://covers.openlibrary.org/b/isbn/${isbnCode}-M.jpg`,
          isbn: isbnCode
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

  const handleSearch = async () => {
    if (!isbn.trim()) {
      toast({
        title: "Error",
        description: "Please enter an ISBN",
        variant: "destructive",
      });
      return;
    }
    fetchBookData(isbn);
  };

  const startScanning = async () => {
    setScanning(true);
    
    try {
      codeReader.current = new BrowserMultiFormatReader();
      
      if (videoRef.current) {
        console.log("Starting ZXing scanner...");
        
        await codeReader.current.decodeFromVideoDevice(
          undefined, // Use default camera
          videoRef.current,
          (result, error) => {
            if (result) {
              console.log("Barcode detected:", result.getText());
              const detectedISBN = result.getText();
              setIsbn(detectedISBN);
              stopScanning();
              fetchBookData(detectedISBN);
              
              toast({
                title: "Barcode Detected!",
                description: `ISBN: ${detectedISBN}`,
              });
            }
            if (error) {
              console.log("ZXing scanning...", error.message);
            }
          }
        );
      }
    } catch (err) {
      console.error("Scanner error:", err);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
      codeReader.current = null;
    }
    setScanning(false);
  };

  const saveBook = () => {
    // This will be implemented with Supabase integration
    toast({
      title: "Connect Supabase",
      description: "To save books, please connect your Supabase database first.",
    });
  };

  useEffect(() => {
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

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
                    onClick={handleSearch} 
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {/* Barcode Scanner */}
              {!scanning ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-3">Scan a barcode to auto-fill book details</p>
                  <Button 
                    onClick={startScanning}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Start Scanning
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-primary rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Scanning for barcode...</h3>
                    <Button 
                      onClick={stopScanning}
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <video 
                    ref={videoRef} 
                    className="w-full h-64 bg-black rounded overflow-hidden"
                    autoPlay
                    playsInline
                  />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Position the barcode in the camera view
                  </p>
                </div>
              )}

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
