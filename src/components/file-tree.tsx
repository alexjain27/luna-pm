"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/utils";

interface TreeFolder {
  id: string;
  name: string;
  children: TreeFolder[];
  files: TreeFile[];
}

interface TreeFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
}

export function FileTree({ folders, rootFiles }: { folders: TreeFolder[]; rootFiles: TreeFile[] }) {
  return (
    <div className="text-sm">
      {folders.map((folder) => (
        <FolderNode key={folder.id} folder={folder} depth={0} />
      ))}
      {rootFiles.map((file) => (
        <FileNode key={file.id} file={file} depth={0} />
      ))}
      {folders.length === 0 && rootFiles.length === 0 && (
        <p className="text-gray-400 text-xs italic px-2 py-1">No files</p>
      )}
    </div>
  );
}

function FolderNode({ folder, depth }: { folder: TreeFolder; depth: number }) {
  const [open, setOpen] = useState(depth === 0);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 rounded text-left"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <span className="text-gray-700">{folder.name}</span>
      </button>
      {open && (
        <>
          {folder.children.map((child) => (
            <FolderNode key={child.id} folder={child} depth={depth + 1} />
          ))}
          {folder.files.map((file) => (
            <FileNode key={file.id} file={file} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

function FileNode({ file, depth }: { file: TreeFile; depth: number }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 rounded"
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <span className="text-gray-600 truncate">{file.filename}</span>
      <span className="text-gray-400 text-xs ml-auto">{formatBytes(file.size)}</span>
    </div>
  );
}
