"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AttachedFile = {
  id: string;
  fileId: string;
  file: {
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    s3Key: string;
  };
};

export function TaskFileUpload({
  taskId,
  uploaderId,
  workspaceId,
  existingFiles,
}: {
  taskId: string;
  uploaderId: string;
  workspaceId: string;
  existingFiles: AttachedFile[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      // 1. Get presigned PUT URL
      const urlRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          workspaceId,
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, s3Key } = await urlRes.json();

      // 2. PUT file directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to S3 failed");

      // 3. Register file in DB and attach to task
      const registerRes = await fetch(`/api/tasks/${taskId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          s3Key,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          uploaderId,
          workspaceId,
        }),
      });
      if (!registerRes.ok) throw new Error("Failed to register file");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {existingFiles.map((tf) => (
        <FileRow key={tf.id} fileId={tf.file.id} filename={tf.file.filename} size={tf.file.size} />
      ))}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-1 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
      >
        <span className="text-sm leading-none">+</span>{" "}
        {uploading ? "Uploading…" : "Attach file"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FileRow({ fileId, filename, size }: { fileId: string; filename: string; size: number }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/download-url`);
      const { url } = await res.json();
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  const sizeStr =
    size < 1024
      ? `${size} B`
      : size < 1024 * 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm text-zinc-700 truncate">{filename}</span>
        <span className="text-xs text-zinc-400 shrink-0">{sizeStr}</span>
      </div>
      <button
        onClick={download}
        disabled={loading}
        className="text-xs text-zinc-400 hover:text-zinc-700 shrink-0 disabled:opacity-50"
      >
        {loading ? "…" : "Download"}
      </button>
    </div>
  );
}
