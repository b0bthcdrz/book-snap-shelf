
import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CoverScanner from "@/components/CoverScanner";
import { supabase } from "@/integrations/supabase/client";

export default function AddBook() {
  const [bookData, setBookData] = useState<any>(null);
  const { toast } = useToast();
  const [processedCoverUrl, setProcessedCoverUrl] = useState<string | null>(null);

  // Check Gemini API key on component mount
  useEffect(() => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      toast({
        title: "Gemini API Key Missing",
        description: "Please add VITE_GEMINI_API_KEY to your environment variables for AI book analysis.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Test storage bucket access
  const testStorageAccess = async () => {
    try {
      console.log('🔍 Testing storage bucket access...');
      const { data, error } = await supabase.storage.from('covers').list('', { limit: 1 });
      if (error) {
        console.error('❌ Storage bucket test failed:', error);
        return false;
      } else {
        console.log('✅ Storage bucket accessible:', data);
        return true;
      }
    } catch (err) {
      console.error('💥 Storage bucket test exception:', err);
      return false;
    }
  };

  const saveBook = async () => {
    try {
      if (!bookData) {
        toast({ title: "Missing details", description: "Scan or enter details first.", variant: "destructive" });
        return;
      }

      // Use demo user ID (bypass authentication for now)
      const demoUserId = "00000000-0000-0000-0000-000000000001";

      // Check for duplicate ISBN
      if (bookData.isbn) {
        const { data: existingBooks, error: checkError } = await (supabase as any)
          .from("books")
          .select("id, title, author")
          .eq("isbn", bookData.isbn);
        
        if (checkError) {
          console.error("Error checking for duplicates:", checkError);
        } else if (existingBooks && existingBooks.length > 0) {
          const existingBook = existingBooks[0];
          toast({ 
            title: "Book already added", 
            description: `"${existingBook.title}" by ${existingBook.author} is already in your library.`,
            variant: "destructive" 
          });
          return;
        }
      }

      // Test storage access first
      const storageAccessible = await testStorageAccess();
      
      // Upload processed cover if available
      let finalCoverUrl = bookData.cover_url as string | undefined;
      if (processedCoverUrl && storageAccessible) {
        try {
          console.log('🖼️ Starting cover upload process...');
          console.log('📸 Processed cover URL:', processedCoverUrl.substring(0, 50) + '...');
          
          // Convert data URL to blob
          const response = await fetch(processedCoverUrl);
          const blob = await response.blob();
          const fileName = `cover_${Date.now()}.jpg`;
          
          console.log('📁 File name:', fileName);
          console.log('📦 Blob size:', blob.size, 'bytes');
          console.log('📦 Blob type:', blob.type);
          
          console.log('🚀 Attempting to upload to Supabase storage...');
          
          // Try upload with different approaches
          let uploadData, uploadError;
          
          // First try: Normal upload
          const uploadResult = await supabase.storage
            .from('covers')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });
          
          uploadData = uploadResult.data;
          uploadError = uploadResult.error;
          
          // If that fails, try with upsert
          if (uploadError) {
            console.log('🔄 First upload failed, trying with upsert...');
            const upsertResult = await supabase.storage
              .from('covers')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true
              });
            
            uploadData = upsertResult.data;
            uploadError = upsertResult.error;
          }

          if (uploadError) {
            console.error('❌ Cover upload error:', uploadError);
            console.error('❌ Error details:', {
              message: uploadError.message,
              name: uploadError.name
            });
            toast({
              title: "Cover upload failed",
              description: uploadError.message || "Book will be saved without cover image",
              variant: "destructive",
            });
          } else {
            console.log('✅ Upload successful:', uploadData);
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('covers')
              .getPublicUrl(fileName);
            finalCoverUrl = urlData.publicUrl;
            
            console.log('🔗 Public URL:', finalCoverUrl);
            
            toast({
              title: "Cover uploaded successfully",
              description: "Cover image saved to Supabase storage",
            });
          }
        } catch (error) {
          console.error('💥 Cover upload exception:', error);
          console.error('💥 Error type:', typeof error);
          console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
          toast({
            title: "Cover upload failed",
            description: error instanceof Error ? error.message : "Book will be saved without cover image",
            variant: "destructive",
          });
        }
      }

      // Insert book record
      const insertPayload = {
        user_id: demoUserId,
        title: bookData.title ?? null,
        author: bookData.authors ?? null,
        isbn: bookData.isbn ?? null,
        cover_url: finalCoverUrl ?? null,
        year: bookData.year || "0000",
        created_at: new Date().toISOString(),
      };
      const { error: insertError } = await (supabase as any).from("books").insert(insertPayload);
      if (insertError) throw insertError;

      toast({ title: "Book saved!", description: `${bookData.title} added to your library.` });
      
      // Clear form for next book
      setBookData(null);
      setProcessedCoverUrl(null);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Save failed", description: err?.message ?? String(err), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Add New Book</h1>
            <p className="text-muted-foreground">Scan a book cover with AI to automatically extract all book information</p>
          </div>

          {/* Cover Scanner */}
          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Cover Scanner (AI)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CoverScanner
                onExtract={(data) => {
                  setBookData((prev: any) => ({
                    ...(prev ?? {}),
                    title: data.title ?? (prev?.title ?? null),
                    authors: data.author ?? (prev?.authors ?? null),
                  }));
                }}
                onProcessedImage={(url) => {
                  setProcessedCoverUrl(url);
                }}
                onGeminiExtract={(bookData) => {
                  console.log("📚 Complete book data extracted:", bookData);
                  setBookData(bookData);
                  toast({
                    title: "Book Data Extracted!",
                    description: `${bookData.title} by ${bookData.authors} - Ready to save`,
                  });
                }}
              />

              {/* Captured Cover Preview */}
              {processedCoverUrl && (
                <div className="space-y-2">
                  <Label>Captured Cover</Label>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-center">
                      <img 
                        src={processedCoverUrl} 
                        alt="Captured book cover"
                        className="max-w-full max-h-32 object-contain rounded shadow-sm"
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgODAgMTEyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCA0OEg1NlY1Nkg0OFY2NEg1NlY3Mkg0OFY4MEg1NlY4OEgyNFY0OFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+";
                        }}
                      />
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-sm text-muted-foreground">Cover image captured</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Book Preview */}
          {bookData && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Book Preview</h3>
                <div className="flex gap-4">
                  <img 
                    src={processedCoverUrl || bookData.cover_url} 
                    alt={bookData.title}
                    className="w-20 h-28 object-cover rounded shadow-sm bg-muted"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiB2aWV3Qm94PSIwIDAgODAgMTEyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCA0OEg1NlY1Nkg0OFY2NEg1NlY3Mkg0OFY4MEg1NlY4OEgyNFY0OFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+";
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{bookData.title}</h4>
                    <p className="text-sm text-muted-foreground mb-1">by {bookData.authors}</p>
                    
                    {/* Book Details */}
                    <div className="space-y-1 mb-3">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Year:</span> {bookData.year || "0000"}
                      </p>
                      {bookData.isbn && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">ISBN:</span> {bookData.isbn}
                        </p>
                      )}
                    </div>
                    
                    {/* Additional Info (for display only, not saved to DB) */}
                    {(bookData.publisher || bookData.description || bookData.pages || bookData.language || (bookData.genres && bookData.genres.length > 0)) && (
                      <div className="space-y-1 mb-3 p-2 bg-muted/20 rounded text-xs">
                        <p className="text-muted-foreground font-medium">Additional Info (display only):</p>
                        {bookData.publisher && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Publisher:</span> {bookData.publisher}
                          </p>
                        )}
                        {bookData.pages && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Pages:</span> {bookData.pages}
                          </p>
                        )}
                        {bookData.language && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Language:</span> {bookData.language}
                          </p>
                        )}
                        {bookData.genres && bookData.genres.length > 0 && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Genres:</span> {Array.isArray(bookData.genres) ? bookData.genres.join(", ") : bookData.genres}
                          </p>
                        )}
                        {bookData.description && (
                          <p className="text-muted-foreground line-clamp-2">
                            <span className="font-medium">Description:</span> {bookData.description}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      onClick={saveBook}
                      className="bg-gradient-hero hover:opacity-90"
                    >
                      Save to Library
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function dataUrlToUpload(dataUrl: string): { file: File; path: string } {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1];
  const base64 = match[2];
  const byteString = atob(base64);
  const array = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) array[i] = byteString.charCodeAt(i);
  const blob = new Blob([array], { type: mime });
  const filename = `covers/${Date.now()}_${Math.random().toString(36).slice(2)}.${mime === "image/png" ? "png" : "jpg"}`;
  const file = new File([blob], filename.split("/").pop() || "cover.jpg", { type: mime });
  return { file, path: filename };
}
