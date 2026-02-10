"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Calendar, LayoutGrid, ShoppingBag, Plus, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";

const NAV_ITEMS = [
    { name: "Planner", href: "/planner", icon: Calendar },
    { name: "Recipes", href: "/recipes", icon: LayoutGrid },
    { name: "Shop", href: "/shop", icon: ShoppingBag },
];

export default function Navbar() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();

    return (
        <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-4 flex items-center justify-between shadow-sm z-[100]">
            <Link
                href="/"
                className="flex items-center gap-2"
            >
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white" />
                </div>
                <span className="font-serif font-bold text-xl tracking-tight hidden md:inline">Chef to Cart</span>
            </Link>

            <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl border border-zinc-100">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium",
                                isActive
                                    ? "bg-zinc-900 text-white shadow-lg"
                                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                            )}
                        >
                            <item.icon size={16} />
                            <span className="hidden sm:inline">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Family Sync Active</span>
                </div>

                <button className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
                    <Plus size={20} />
                </button>
            </div>
        </nav>
    );
}
