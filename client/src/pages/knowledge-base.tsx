import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileText, File, Trash2, CheckCircle, XCircle,
  AlertCircle, BookOpen, Cloud, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.odt,.txt,.md,.html,.htm,.csv";
const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain", "text/markdown", "text/html", "text/csv",
];

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "PDF", docx: "DOC", doc: "DOC", odt: "ODT",
  txt: "TXT", md: "MD", html: "HTML", csv: "CSV",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadResult {
  filename: string;
  status: "ok" | "error";
  chunks?: number;
  error?: string;
}

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(null);

  const { data: docs, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ results: UploadResult[] }>;
    },
    onSuccess: (data) => {
      setUploadResults(data.results);
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      const ok = data.results.filter((r) => r.status === "ok").length;
      const failed = data.results.filter((r) => r.status === "error").length;
      if (failed === 0) {
        toast({ title: `${ok} document${ok !== 1 ? "s" : ""} added to knowledge base` });
      } else {
        toast({
          title: `${ok} succeeded, ${failed} failed`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document removed from knowledge base" });
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadResults(null);
    const arr = Array.from(files);
    uploadMutation.mutate(arr);
  }, [uploadMutation]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const totalChunks = docs?.reduce((sum, d) => sum + d.chunkCount, 0) || 0;
  const totalSize = docs?.reduce((sum, d) => sum + d.fileSize, 0) || 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-md bg-sidebar-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-sidebar-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-kb-title">Knowledge Base</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload your company policy documents — PDFs, Word docs, ODTs, Markdown files and more. HR CARE will search them on every question and cite them in answers.
          </p>
        </div>

        {/* Stats */}
        {docs && docs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Documents", value: docs.length },
              { label: "Indexed chunks", value: totalChunks.toLocaleString() },
              { label: "Total size", value: formatBytes(totalSize) },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-card-border rounded-lg px-4 py-3 text-center">
                <p className="text-xl font-bold text-foreground" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors mb-6 cursor-pointer ${
            isDragging
              ? "border-sidebar-primary bg-sidebar-primary/5"
              : "border-border hover:border-sidebar-primary/50 hover:bg-muted/30"
          }`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          data-testid="dropzone-upload"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            data-testid="input-file-upload"
          />

          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-sidebar-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Processing documents…</p>
              <p className="text-xs text-muted-foreground">Parsing and indexing your files</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sidebar-primary/10 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-sidebar-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, ODT, DOC, TXT, MD, HTML, CSV — up to 50 MB each
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} data-testid="button-browse-files">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Browse Files
              </Button>
            </div>
          )}
        </div>

        {/* Upload results */}
        {uploadResults && uploadResults.length > 0 && (
          <div className="mb-6 bg-card border border-card-border rounded-lg divide-y divide-border">
            <div className="px-4 py-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload Results</p>
            </div>
            {uploadResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                {r.status === "ok" ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <span className="flex-1 text-sm text-foreground truncate">{r.filename}</span>
                {r.status === "ok" && (
                  <Badge variant="secondary" className="text-xs">{r.chunks} chunks</Badge>
                )}
                {r.status === "error" && (
                  <span className="text-xs text-destructive">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Document list */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {docs && docs.length > 0 ? `Indexed Documents (${docs.length})` : "No documents yet"}
          </h2>

          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-card border border-card-border rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && (!docs || docs.length === 0) && (
            <div className="bg-card border border-card-border rounded-lg px-5 py-10 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Knowledge base is empty</p>
              <p className="text-xs text-muted-foreground">
                Upload your first document above. HR CARE will search it on every question.
              </p>
            </div>
          )}

          {docs && docs.length > 0 && (
            <div className="bg-card border border-card-border rounded-lg divide-y divide-border">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 px-4 py-3"
                  data-testid={`row-document-${doc.id}`}
                >
                  <div className="w-9 h-9 rounded-md bg-sidebar-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-sidebar-primary">
                      {FILE_TYPE_ICONS[doc.fileType] || <File className="w-4 h-4" />}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.filename} · {formatBytes(doc.fileSize)} · {doc.chunkCount} chunks
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-document-${doc.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Format guide */}
        <div className="mt-8 bg-card border border-card-border rounded-lg p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Supported Formats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { type: "PDF", desc: "Policy handbooks, forms, scanned docs" },
              { type: "DOCX / DOC", desc: "Word documents, procedures" },
              { type: "ODT", desc: "OpenDocument text files" },
              { type: "TXT / MD", desc: "Plain text, Markdown, HTML" },
            ].map((f) => (
              <div key={f.type} className="text-center">
                <p className="text-xs font-semibold text-foreground mb-0.5">{f.type}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
