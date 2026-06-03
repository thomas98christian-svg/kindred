"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Compass, MessageCircle, User, Settings } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/matches", label: "Matches", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

// Routes where the bottom nav should NOT appear
const HIDDEN_ROUTES = ["/", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Don't render on auth/onboarding pages or when not logged in
  if (!user || HIDDEN_ROUTES.includes(pathname)) return null;

  // Also hide in chat detail view (full-screen experience)
  if (pathname.startsWith("/matches/") && pathname !== "/matches") return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200 ${
                isActive
                  ? "text-brand-500"
                  : "text-surface-400 hover:text-surface-300"
              }`}
            >
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute top-1 w-8 h-1 rounded-full bg-brand-500 animate-in fade-in zoom-in-50 duration-200" />
              )}

              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-transform duration-200"
                style={{
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              />
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
