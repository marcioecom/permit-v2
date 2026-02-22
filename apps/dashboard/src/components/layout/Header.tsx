"use client";

import { usePermit } from "@permitdev/react";
import { IconLogout, IconSearch } from "@tabler/icons-react";
import Avatar from "boring-avatars";
import { useEffect, useRef, useState } from "react";

interface User {
  id: string;
  email: string;
}

export function Header() {
  const { user, logout } = usePermit();
  const typedUser = user as User | null;
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-40"
      style={{ viewTransitionName: "main-header" }}
    >
      {/* Search */}
      <div className="relative w-96 group">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for projects, users, or logs..."
          className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-slate-200 focus:ring-0 rounded-full py-2 pl-10 pr-4 text-sm transition-all outline-none"
        />
      </div>

      {/* Right Section */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <span className="text-sm font-bold text-slate-800">{typedUser?.email?.split("@")[0] ?? "User"}</span>
          <Avatar
            size={36}
            name={typedUser?.email ?? "user"}
            variant="beam"
            colors={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1e40af"]}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-800">{typedUser?.email?.split("@")[0] ?? "User"}</p>
              <p className="text-xs text-slate-400 truncate">{typedUser?.email ?? ""}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <IconLogout className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
