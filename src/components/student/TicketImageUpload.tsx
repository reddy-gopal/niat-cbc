"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketImageUpload({
  file,
  previewUrl,
  onFileSelect,
  onClear,
  disabled = false,
}: {
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || !acceptedFiles[0]) return;
      onFileSelect(acceptedFiles[0]);
    },
    [onFileSelect, disabled]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { "image/png": [], "image/jpeg": [], "image/jpg": [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled,
  });

  const rejection = fileRejections[0]?.errors[0];

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`relative rounded-xl border-2 border-dashed transition-all outline-none ${
          disabled
            ? "cursor-not-allowed border-[var(--border)] bg-[var(--bg-tint)]/50 opacity-60"
            : isDragActive
              ? "cursor-pointer border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01] shadow-sm"
              : file
                ? "cursor-pointer border-[var(--primary)]/40 bg-white"
                : "cursor-pointer border-[var(--border)] bg-[var(--bg-tint)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
        }`}
      >
        <input {...getInputProps()} aria-label="Upload screenshot" />

        {previewUrl ? (
          <div className="p-3 sm:p-4">
            <div className="relative rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-tint)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="w-full max-h-48 object-contain"
              />
            </div>
            {file ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-dark)] truncate">{file.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatFileSize(file.size)} · PNG or JPG</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Remove screenshot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
              Tap or drop to replace image
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-8 sm:py-10 text-center">
            <div
              className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                isDragActive ? "bg-[var(--primary)] text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"
              }`}
            >
              <ImagePlus className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-dark)]">
              {isDragActive ? "Drop screenshot here" : "Add a screenshot (optional)"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Drag & drop or click to browse · PNG or JPG · Max 10MB
            </p>
          </div>
        )}
      </div>

      {rejection ? (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {rejection.code === "file-too-large"
            ? "Image must be 10MB or smaller."
            : "Only PNG or JPG images are allowed."}
        </p>
      ) : null}
    </div>
  );
}
