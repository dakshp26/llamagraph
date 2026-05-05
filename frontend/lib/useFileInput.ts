import { useCallback, useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { getApiBase } from "@/lib/api";
import { usePipelineStore } from "@/store/pipelineStore";

export interface UseFileInputReturn {
  availableFiles: string[];
  uploading: boolean;
  uploadError: string | null;
  previewMarkdown: string | null;
  previewLoading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  fetchPreview: (filename: string) => Promise<void>;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  triggerUpload: () => void;
}

export function useFileInput({ accept, nodeId }: { accept: string; nodeId: string }): UseFileInputReturn {
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);

  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const qs = accept ? `?extensions=${encodeURIComponent(accept)}` : "";
      const r = await fetch(`${getApiBase()}/files${qs}`);
      if (r.ok) {
        const json = await r.json() as { files?: string[] };
        setAvailableFiles(json.files ?? []);
      }
    } catch {
      // silently ignore if backend unreachable
    }
  }, [accept]);

  const fetchPreview = useCallback(async (filename: string) => {
    if (!filename) { setPreviewMarkdown(null); return; }
    setPreviewLoading(true);
    try {
      const r = await fetch(`${getApiBase()}/files/preview/${encodeURIComponent(filename)}`);
      if (r.ok) {
        const json = await r.json() as { markdown?: string };
        setPreviewMarkdown(json.markdown ?? "");
      } else {
        setPreviewMarkdown(null);
      }
    } catch {
      setPreviewMarkdown(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    const handler = () => fetchFiles();
    window.addEventListener("llamagraph:files-updated", handler);
    return () => window.removeEventListener("llamagraph:files-updated", handler);
  }, [fetchFiles]);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    const acceptedExts = accept.split(",").map((a) => a.trim().toLowerCase());
    if (!acceptedExts.includes(ext)) {
      setUploadError(`Invalid file type. Only ${acceptedExts.join(", ")} files are allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch(`${getApiBase()}/files/upload`, { method: "POST", body: formData });
      if (r.ok) {
        const json = await r.json() as { filename?: string };
        window.dispatchEvent(new Event("llamagraph:files-updated"));
        updateNodeData(nodeId, { filename: json.filename });
      } else {
        const err = await r.json().catch(() => ({})) as { detail?: string };
        setUploadError(err.detail ?? "Upload failed.");
      }
    } catch {
      setUploadError("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [accept, nodeId, updateNodeData]);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    availableFiles,
    uploading,
    uploadError,
    previewMarkdown,
    previewLoading,
    fileInputRef,
    fetchPreview,
    handleFileChange,
    triggerUpload,
  };
}
