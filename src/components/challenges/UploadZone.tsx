import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

export default function UploadZone({
  onFileSelect,
  preview,
  disabled = false,
}: {
  onFileSelect: (file: File) => void;
  preview: string | null;
  disabled?: boolean;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;
      if (acceptedFiles[0]) onFileSelect(acceptedFiles[0]);
    },
    [onFileSelect, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [], "image/jpeg": [], "image/jpg": [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative w-full min-h-40 h-44 sm:h-48 border-4 border-dashed rounded-xl flex items-center justify-center transition-all bg-[#991b1b] shadow-inner ${
        disabled
          ? "cursor-not-allowed border-[#f7b801]/50 opacity-60 pointer-events-none"
          : `cursor-pointer ${isDragActive ? "border-[#ffffff] scale-105" : "border-[#f7b801] hover:border-[#ffffff]"}`
      }`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="absolute inset-0 p-2">
          <div className="relative w-full h-full">
            <Image
              src={preview}
              alt="Evidence"
              fill
              unoptimized
              className="object-contain rounded-lg border-2 border-[#f7b801] bg-[#991b1b]"
            />
          </div>
        </div>
      ) : (
        <div className="text-center px-4 flex flex-col items-center">
          <div className="text-[#f7b801] font-black tracking-[0.16em] sm:tracking-[0.2em] text-sm sm:text-lg mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            DROP YOUR PROOF HERE
          </div>
          <div className="text-[#ffffff] font-bold text-[11px] sm:text-xs bg-[#f18701] px-3 py-1 rounded-full uppercase shadow-md">
            Click to Browse
          </div>
        </div>
      )}
    </div>
  );
}
