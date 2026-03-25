"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/utils";
import { CommentForm } from "@/components/comment-form";

type Reply = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string | null };
};

type Comment = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string | null };
  replies: Reply[];
};

export function CommentList({
  comments,
  taskId,
  authorId,
}: {
  comments: Comment[];
  taskId: string;
  authorId: string;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex flex-col gap-2">
          <div className="rounded-lg bg-zinc-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-zinc-900">
                {comment.author.name ?? comment.author.email}
              </span>
              <span className="text-xs text-zinc-400">{formatDateTime(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{comment.body}</p>
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {replyingTo === comment.id ? "Cancel reply" : "Reply"}
            </button>
          </div>

          {/* Existing replies */}
          {comment.replies.map((reply) => (
            <div key={reply.id} className="ml-8 rounded-lg bg-zinc-50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-zinc-900">
                  {reply.author.name ?? reply.author.email}
                </span>
                <span className="text-xs text-zinc-400">{formatDateTime(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}

          {/* Inline reply form */}
          {replyingTo === comment.id && (
            <div className="ml-8">
              <CommentForm
                taskId={taskId}
                authorId={authorId}
                parentCommentId={comment.id}
                onSuccess={() => setReplyingTo(null)}
                placeholder="Write a reply…"
              />
            </div>
          )}
        </div>
      ))}

      {/* New top-level comment */}
      <div className="mt-2">
        <CommentForm taskId={taskId} authorId={authorId} />
      </div>
    </div>
  );
}
