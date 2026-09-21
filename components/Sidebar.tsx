"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveStatusContext } from "./LiveStatusProvider";
import { useMemo } from "react";

interface SidebarProps {
    isExpanded: boolean;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
    onAddChannel: () => void;
}

const NAV_ITEMS = [
    {
        href: "/",
        label: "Beranda",
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10.5 12 3l9 7.5M5.25 9.75V20a1 1 0 0 0 1 1h3.5v-5.5h4.5V21h3.5a1 1 0 0 0 1-1V9.75"
            />
        ),
    },
    {
        href: "/multistream",
        label: "Multistream",
        icon: (
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 5.25h7v5.5h-7v-5.5Zm9.5 0h7v5.5h-7v-5.5Zm-9.5 8h7v5.5h-7v-5.5Zm9.5 0h7v5.5h-7v-5.5Z"
            />
        ),
    },
];

function InitialAvatar({ title }: { title: string }) {
    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-400">
            {title.slice(0, 1).toUpperCase()}
        </span>
    );
}

export default function Sidebar({
    isExpanded,
    isMobileOpen,
    onCloseMobile,
    onAddChannel,
}: SidebarProps) {
    const pathname = usePathname();
    const { favorites, statuses } = useLiveStatusContext();

    const ordered = useMemo(() => {
        return [...favorites].sort(
            (a, b) =>
                Number(statuses[b.channelId]?.isLive ?? false) -
                Number(statuses[a.channelId]?.isLive ?? false),
        );
    }, [favorites, statuses]);

    const liveCount = ordered.filter((c) => statuses[c.channelId]?.isLive).length;

    const width = isExpanded ? "lg:w-60" : "lg:w-[72px]";
    const translate = isMobileOpen ? "translate-x-0" : "-translate-x-full";

    return (
        <>
            {isMobileOpen && (
                <div
                    onClick={onCloseMobile}
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 transition-[transform,width] duration-300 ease-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${translate} ${width}`}
            >
                <div className="flex h-14 items-center gap-3 px-4 lg:h-16">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </div>
                    <span
                        className={`truncate text-sm font-bold text-white transition-opacity duration-200 ${isExpanded ? "opacity-100" : "lg:pointer-events-none lg:opacity-0"}`}
                    >
                        MultiStream
                    </span>
                </div>

                <nav className="flex flex-col gap-1 px-3">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onCloseMobile}
                                title={item.label}
                                className={`flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm transition-colors ${active
                                    ? "bg-zinc-800/80 font-semibold text-white"
                                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                                    }`}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    className="h-5 w-5 shrink-0"
                                >
                                    {item.icon}
                                </svg>
                                <span
                                    className={`truncate transition-opacity duration-200 ${isExpanded ? "opacity-100" : "lg:hidden"}`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-2 border-t border-zinc-800 pt-3" />

                <div className={`px-5 pb-2 ${isExpanded ? "" : "lg:hidden"}`}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-zinc-500">Streamer favorit</h2>
                        {liveCount > 0 && (
                            <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                {liveCount} live
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-4">
                    {ordered.length === 0 ? (
                        <p
                            className={`px-2 py-2 text-xs leading-relaxed text-zinc-600 ${isExpanded ? "" : "lg:hidden"}`}
                        >
                            Belum ada channel. Tambahkan yang pertama untuk melihat statusnya di sini.
                        </p>
                    ) : (
                        ordered.map((channel) => {
                            const status = statuses[channel.channelId];
                            const isLive = status?.isLive ?? false;
                            const href = isLive && status?.video
                                ? `/?tonton=${status.video.videoId}`
                                : `https://www.youtube.com/channel/${channel.channelId}`;
                            const isExternal = href.startsWith("http");

                            const inner = (
                                <>
                                    <span className="relative shrink-0">
                                        {channel.avatar ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={channel.avatar}
                                                alt=""
                                                className="h-7 w-7 rounded-full object-cover"
                                            />
                                        ) : (
                                            <InitialAvatar title={channel.title} />
                                        )}
                                        {isLive && (
                                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-red-600" />
                                        )}
                                    </span>
                                    <span
                                        className={`min-w-0 flex-1 truncate ${isExpanded ? "" : "lg:hidden"}`}
                                    >
                                        {channel.title}
                                    </span>
                                    {isLive && (
                                        <span
                                            className={`shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-500 ${isExpanded ? "" : "lg:hidden"}`}
                                        >
                                            Live
                                        </span>
                                    )}
                                </>
                            );

                            const className =
                                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white";

                            return isExternal ? (
                                <a
                                    key={channel.channelId}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={channel.title}
                                    onClick={onCloseMobile}
                                    className={className}
                                >
                                    {inner}
                                </a>
                            ) : (
                                <Link
                                    key={channel.channelId}
                                    href={href}
                                    title={channel.title}
                                    onClick={onCloseMobile}
                                    className={className}
                                >
                                    {inner}
                                </Link>
                            );
                        })
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            onAddChannel();
                            onCloseMobile();
                        }}
                        title="Tambah channel"
                        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
                    >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-700 text-base leading-none">
                            +
                        </span>
                        <span className={isExpanded ? "" : "lg:hidden"}>Tambah channel</span>
                    </button>
                </div>
            </aside>
        </>
    );
}