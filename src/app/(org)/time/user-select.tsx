"use client";

import { useRouter } from "next/navigation";

import { selectClass } from "./project-task-select";

export function UserSelect({
  users,
  value,
  date,
  view,
}: {
  users: { id: string; name: string | null; email: string | null }[];
  value: string;
  date: string;
  view: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Person"
      className={selectClass}
      value={value}
      onChange={(e) => router.push(`/time?date=${date}&view=${view}&userId=${e.target.value}`)}
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name ?? u.email}
        </option>
      ))}
    </select>
  );
}
