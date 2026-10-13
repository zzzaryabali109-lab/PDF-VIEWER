import { useState } from "react";
import { FileDropzone, type FileDropzoneItem } from "@/components/arc/file-dropzone/file-dropzone";
import { PdfProcessingPage } from "@/components/pdf-processing/PdfProcessingPage";

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [activePdf, setActivePdf] = useState<File | null>(null);

  const isPdfFile = (file?: File | null): boolean => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return (
      name.endsWith(".pdf") ||
      type === "application/pdf" ||
      type === "application/x-pdf" ||
      type.includes("pdf")
    );
  };

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleUpload = async (
    item: FileDropzoneItem,
    { onProgress, signal }: { onProgress: (percent: number) => void; signal: AbortSignal }
  ) => {
    // Preserve existing upload progress logic
    for (let p = 10; p <= 100; p += 25) {
      if (signal.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, 80));
      onProgress(Math.min(p, 100));
    }

    // After a successful upload, navigate to the new Adobe Acrobat-style PDF processing page
    if (!signal.aborted && item.file && isPdfFile(item.file)) {
      setActivePdf(item.file);
    }
  };

  // Dedicated Adobe Acrobat-Style PDF Processing Page
  if (activePdf) {
    return (
      <PdfProcessingPage
        file={activePdf}
        onBackToUpload={() => setActivePdf(null)}
      />
    );
  }

  // Upload Page: Strictly preserved existing Dropzone and layout
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Upload Documents</h1>
          <p className="text-sm text-muted-foreground">
            Drop your files here or browse from your device
          </p>
        </div>

        <div className="w-full border-0">
          <FileDropzone
            accept="image/*,.pdf,.doc,.docx,.txt"
            maxFiles={5}
            maxSize={25 * 1024 * 1024}
            onFilesChange={handleFilesChange}
            onUpload={handleUpload}
          />
        </div>

        {uploadedFiles.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {uploadedFiles.length} {uploadedFiles.length === 1 ? "file" : "files"} selected
          </p>
        )}
      </div>
    </main>
  );
}
