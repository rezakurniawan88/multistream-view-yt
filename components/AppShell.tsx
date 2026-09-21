"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import AddChannelDialog from "./AddChannelDialog";
import { LiveStatusProvider } from "./LiveStatusProvider";

const SIDEBAR_KEY = "multistream-sidebar-expanded";

export function openAddChannelDialog() {
    window.dispatchEvent(new Event("multistream:add-channel"));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SIDEBAR_KEY);
            if (stored !== null) setIsExpanded(stored === "1");
        } catch {
            // ignore
        }

        const open = () => setIsDialogOpen(true);
        window.addEventListener("multistream:add-channel", open);
        return () => window.removeEventListener("multistream:add-channel", open);
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsMobileOpen((v) => !v);
        setIsExpanded((v) => {
            const next = !v;
            try {
                localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
            } catch {
                // ignore
            }
            return next;
        });
    }, []);

    const showToast = useCallback((message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2400);
    }, []);

    return (
        <LiveStatusProvider>
            <div className="flex min-h-dvh bg-zinc-950">
                <Sidebar
                    isExpanded={isExpanded}
                    isMobileOpen={isMobileOpen}
                    onCloseMobile={() => setIsMobileOpen(false)}
                    onAddChannel={() => setIsDialogOpen(true)}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur lg:h-16">
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            aria-label={isExpanded ? "Tutup menu" : "Buka menu"}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                            >
                                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                            </svg>
                        </button>

                        <span className="text-sm font-semibold text-zinc-300 lg:hidden">MultiStream</span>

                        <button
                            type="button"
                            onClick={() => setIsDialogOpen(true)}
                            className="ml-auto rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/50 hover:text-red-400"
                        >
                            + Channel
                        </button>
                    </header>

                    <main className="min-w-0 flex-1">{children}</main>
                </div>

                <AddChannelDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onAdded={(title) => showToast(`${title} ditambahkan ke favorit`)}
                />

                {toast && (
                    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/95 px-5 py-2.5 text-sm font-medium text-zinc-100 shadow-2xl backdrop-blur">
                        {toast}
                    </div>
                )}
            </div>
        </LiveStatusProvider>
    );
}