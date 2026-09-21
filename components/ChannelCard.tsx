"use client";

import type { FavoriteChannel } from "@/lib/favorites";
import type { ChannelStatus } from "@/lib/useLiveStatus";

interface ChannelCardProps {
    channel: FavoriteChannel;
    status?: ChannelStatus;
    onWatch: (videoId: string) => void;
    onAddToGrid: (videoId: string, label: string) => void;
    onRemove: (channelId: string) => void;
}

function formatViewers(count: number | null): string | null {
    if (count === null) return null;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)} jt penonton`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)} rb penonton`;
    return `${count} penonton`;
}

function formatDuration(startedAt: string | null): string | null {
    if (!startedAt) return null;
    const minutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000);
    if (!Number.isFinite(minutes) || minutes < 0) return null;
    if (minutes < 60) return `Berjalan ${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    return `Berjalan ${hours} jam ${minutes % 60} menit`;
}

function Avatar({ channel, size }: { channel: FavoriteChannel; size: "sm" | "md" }) {
    const dimension = size === "sm" ? "h-8 w-8" : "h-10 w-10";
    if (channel.avatar) {

        return (
            <img
                src={channel.avatar}
                alt=""
                className={`${dimension} shrink-0 rounded-full object-cover`}
            />
        );
    }
    return (
        <span
            className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400`}
        >
            {channel.title.slice(0, 1).toUpperCase()}
        </span>
    );
}

export default function ChannelCard({
    channel,
    status,
    onWatch,
    onAddToGrid,
    onRemove,
}: ChannelCardProps) {
    const isLive = status?.isLive && status.video;

    if (isLive && status?.video) {
        const { videoId, title, thumbnail, concurrentViewers, startedAt } = status.video;
        const viewers = formatViewers(concurrentViewers);
        const duration = formatDuration(startedAt);

        return (
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-xl shadow-black/30 transition-colors hover:border-red-600/40">
                <button
                    type="button"
                    onClick={() => onWatch(videoId)}
                    className="relative block aspect-video w-full overflow-hidden bg-black"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold tracking-wide text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        LIVE
                    </span>
                    {viewers && (
                        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium text-zinc-100">
                            {viewers}
                        </span>
                    )}
                </button>

                <div className="flex gap-3 p-3.5">
                    <Avatar channel={channel} size="md" />
                    <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">
                            {title}
                        </h3>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                            {status.channelTitle ?? channel.title}
                            {duration ? ` · ${duration}` : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 border-t border-zinc-800 px-3.5 py-2.5">
                    <button
                        type="button"
                        onClick={() => onWatch(videoId)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-colors hover:bg-red-500"
                    >
                        Tonton
                    </button>
                    <button
                        type="button"
                        onClick={() => onAddToGrid(videoId, channel.title)}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-600/50 hover:text-red-400"
                    >
                        Tambah ke grid
                    </button>
                    <a
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Buka di YouTube"
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            className="h-4 w-4"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
                            />
                        </svg>
                    </a>
                    <button
                        type="button"
                        onClick={() => onRemove(channel.channelId)}
                        title={`Hapus ${channel.title} dari favorit`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                    >
                        ✕
                    </button>
                </div>
            </article>
        );
    }

    const latest = status?.latestVideo;

    return (
        <article className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3">
            <Avatar channel={channel} size="sm" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-300">{channel.title}</p>
                <p className="truncate text-xs text-zinc-600">
                    {status?.error
                        ? status.error
                        : latest
                            ? `Terakhir: ${latest.title}`
                            : "Sedang tidak siaran"}
                </p>
            </div>

            <a
                href={`https://www.youtube.com/channel/${channel.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka channel di YouTube"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-white"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-4 w-4"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
                    />
                </svg>
            </a>
            <button
                type="button"
                onClick={() => onRemove(channel.channelId)}
                title={`Hapus ${channel.title} dari favorit`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
            >
                ✕
            </button>
        </article>
    );
}