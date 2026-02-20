"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

export function Tabs({
  tabs,
  children,
}: {
  tabs: Tab[];
  children: React.ReactNode[];
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              active === tab.id
                ? "bg-white border border-b-white border-gray-200 -mb-px text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.id} className={active === tab.id ? "" : "hidden"}>
          {children[i]}
        </div>
      ))}
    </div>
  );
}
