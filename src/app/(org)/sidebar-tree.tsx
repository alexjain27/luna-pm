"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  CircleCheck,
  Folder,
  Layers,
  LayoutDashboard,
  ListTodo,
  List as ListIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface SidebarWorkspace {
  id: string;
  name: string;
  type: "CLIENT" | "COMPANY";
  projects: {
    id: string;
    name: string;
    lists: { id: string; name: string }[];
  }[];
}

const homeItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/lists", label: "Lists", icon: ListIcon },
  { href: "/statuses", label: "Statuses", icon: CircleCheck },
];

export function SidebarTree({ workspaces }: { workspaces: SidebarWorkspace[] }) {
  const pathname = usePathname();

  // Open the workspace that contains the page being viewed.
  const [openWorkspaces, setOpenWorkspaces] = useState<Set<string>>(() => {
    const open = new Set<string>();
    for (const ws of workspaces) {
      if (
        pathname === `/workspaces/${ws.id}` ||
        ws.projects.some((p) => pathname === `/projects/${p.id}`)
      ) {
        open.add(ws.id);
      }
    }
    return open;
  });
  const [openProjects, setOpenProjects] = useState<Set<string>>(() => {
    const open = new Set<string>();
    for (const ws of workspaces) {
      for (const p of ws.projects) {
        if (pathname === `/projects/${p.id}`) open.add(p.id);
      }
    }
    return open;
  });

  function toggle(set: Set<string>, id: string, update: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  }

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-2 py-3 text-sm">
      <div className="flex flex-col gap-0.5">
        {homeItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                active && "bg-zinc-100 font-medium text-zinc-900"
              )}
            >
              <item.icon className="size-4 shrink-0 text-zinc-400" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5">
        <Link
          href="/workspaces"
          className="flex items-center gap-2 px-2 pb-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          <Layers className="size-3.5" />
          Workspaces
        </Link>

        {workspaces.map((ws) => {
          const wsOpen = openWorkspaces.has(ws.id);
          const wsActive = pathname === `/workspaces/${ws.id}`;
          return (
            <div key={ws.id}>
              <div
                className={cn(
                  "group flex items-center rounded-md hover:bg-zinc-100",
                  wsActive && "bg-zinc-100"
                )}
              >
                <button
                  type="button"
                  aria-label={wsOpen ? `Collapse ${ws.name}` : `Expand ${ws.name}`}
                  onClick={() => toggle(openWorkspaces, ws.id, setOpenWorkspaces)}
                  className="flex size-7 shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-700"
                >
                  <ChevronRight
                    className={cn("size-3.5 transition-transform", wsOpen && "rotate-90")}
                  />
                </button>
                <Link
                  href={`/workspaces/${ws.id}`}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-zinc-700",
                    wsActive && "font-medium text-zinc-900"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white",
                      ws.type === "CLIENT" ? "bg-blue-500" : "bg-purple-500"
                    )}
                  >
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </Link>
              </div>

              {wsOpen && (
                <div className="flex flex-col gap-0.5 pl-4">
                  {ws.projects.length === 0 && (
                    <p className="px-2 py-1 text-xs italic text-zinc-400">No projects</p>
                  )}
                  {ws.projects.map((project) => {
                    const pOpen = openProjects.has(project.id);
                    const pActive = pathname === `/projects/${project.id}`;
                    return (
                      <div key={project.id}>
                        <div
                          className={cn(
                            "flex items-center rounded-md hover:bg-zinc-100",
                            pActive && "bg-zinc-100"
                          )}
                        >
                          {project.lists.length > 0 ? (
                            <button
                              type="button"
                              aria-label={
                                pOpen ? `Collapse ${project.name}` : `Expand ${project.name}`
                              }
                              onClick={() =>
                                toggle(openProjects, project.id, setOpenProjects)
                              }
                              className="flex size-7 shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-700"
                            >
                              <ChevronRight
                                className={cn(
                                  "size-3.5 transition-transform",
                                  pOpen && "rotate-90"
                                )}
                              />
                            </button>
                          ) : (
                            <span className="size-7 shrink-0" />
                          )}
                          <Link
                            href={`/projects/${project.id}`}
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-zinc-600",
                              pActive && "font-medium text-zinc-900"
                            )}
                          >
                            <Folder className="size-4 shrink-0 text-zinc-400" />
                            <span className="truncate">{project.name}</span>
                          </Link>
                        </div>

                        {pOpen && (
                          <div className="flex flex-col gap-0.5 pl-7">
                            {project.lists.map((list) => (
                              <Link
                                key={list.id}
                                href={`/projects/${project.id}?view=list#list-${list.id}`}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                              >
                                <ListIcon className="size-3.5 shrink-0 text-zinc-400" />
                                <span className="truncate">{list.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
