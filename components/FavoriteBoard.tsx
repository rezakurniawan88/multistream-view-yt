"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openAddChannelDialog } from "./AppShell";
import ChannelCard from "./ChannelCard";
import { useLiveStatusContext } from "./LiveStatusProvider";
import { pushToStreamGrid } from "@/lib/favorites";
import { useLiveNotifications } from "@/lib/useLiveStatus";

const NOTIFY_KEY = "multistream-notify-enabled";

function formatClock(date: Date | null): string {
    if (!date) return "—";
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function FavoriteBoard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { favorites, isLoaded, remove, statuses, isRefreshing, lastUpdated, error, refresh } =
        useLiveStatusContext();

    const [notifyEnabled, setNotifyEnabled] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        try {
            setNotifyEnabled(localStorage.getItem(NOTIFY_KEY) === "1");
        } catch {
            // ignore
        }
    }, []);

    useLiveNotifications(statuses, notifyEnabled);

    const watching = searchParams.get("tonton");

    const live = favorites.filter((c) => statuses[c.channelId]?.isLive);
    const offline = favorites.filter((c) => !statuses[c.channelId]?.isLive);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2400);
    };

    const toggleNotify = async () => {
        if (notifyEnabled) {
            setNotifyEnabled(false);
            localStorage.setItem(NOTIFY_KEY, "0");
            return;
        }
        if (typeof Notification === "undefined") {
            showToast("Browser ini tidak mendukung notifikasi");
            return;
        }
        const permission =
            Notification.permission === "granted"
                ? "granted"
                : await Notification.requestPermission();
        if (permission !== "granted") {
            showToast("Izin notifikasi ditolak");
            return;
        }
        setNotifyEnabled(true);
        localStorage.setItem(NOTIFY_KEY, "1");
        showToast("Notifikasi aktif selama tab ini terbuka");
    };

    const watch = (videoId: string) => {
        router.replace(`/?tonton=${videoId}`, { scroll: false });
    };

    const addToGrid = (videoId: string, label: string) => {
        const result = pushToStreamGrid(videoId, label);
        if (result === "full") {
            showToast("Grid sudah penuh (maksimal 9 stream)");
            return;
        }
        showToast(result === "exists" ? "Stream ini sudah ada di grid" : "Ditambahkan ke grid");
    };

    if (!isLoaded) {
        return (
            <div className="flex h-64 items-center justify-center">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-red-600" />
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        className="h-7 w-7 text-zinc-600"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5a4.5 4.5 0 0 0-9 0c0 5.5 9 10.5 9 10.5m0-10.5a4.5 4.5 0 0 1 9 0c0 5.5-9 10.5-9 10.5"
                        />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Belum ada streamer favorit</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    Tambahkan channel yang sering kamu tonton. Begitu salah satunya mulai siaran,
                    streamnya muncul di halaman ini.
                </p>
                <button
                    type="button"
                    onClick={openAddChannelDialog}
                    className="mt-6 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition-colors hover:bg-red-500"
                >
                    Tambah channel pertama
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            {watching && (
                <section className="mb-8">
                    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl shadow-black/50">
                        <div className="aspect-video w-full">
                            <iframe
                                key={watching}
                                src={`https://www.youtube.com/embed/${watching}?autoplay=1&rel=0`}
                                title="Pemutar live"
                                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                allowFullScreen
                                className="h-full w-full"
                                style={{ border: 0 }}
                            />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.replace("/", { scroll: false })}
                            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-600/50 hover:text-red-400"
                        >
                            Tutup pemutar
                        </button>
                        <button
                            type="button"
                            onClick={() => addToGrid(watching, "Live")}
                            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-600/50 hover:text-red-400"
                        >
                            Tambah ke grid
                        </button>
                    </div>
                </section>
            )}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                        {live.length > 0
                            ? `${live.length} streamer sedang live`
                            : "Tidak ada yang sedang live"}
                    </h1>
                    <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                        {favorites.length} channel dipantau · diperbarui {formatClock(lastUpdated)}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleNotify}
                        aria-pressed={notifyEnabled}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${notifyEnabled
                            ? "border-red-600/40 bg-red-600/15 text-red-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-red-600/50 hover:text-red-400"
                            }`}
                    >
                        {notifyEnabled ? "Notifikasi aktif" : "Aktifkan notifikasi"}
                    </button>
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-600/50 hover:text-red-400 disabled:opacity-50"
                    >
                        {isRefreshing && (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
                        )}
                        {isRefreshing ? "Memeriksa…" : "Periksa sekarang"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-5 rounded-xl border border-amber-600/30 bg-amber-600/10 px-4 py-2.5 text-sm text-amber-400">
                    {error}
                </div>
            )}

            {live.length > 0 && (
                <section className="mb-10">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {live.map((channel) => (
                            <ChannelCard
                                key={channel.channelId}
                                channel={channel}
                                status={statuses[channel.channelId]}
                                onWatch={watch}
                                onAddToGrid={addToGrid}
                                onRemove={remove}
                            />
                        ))}
                    </div>
                </section>
            )}

            {offline.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-zinc-500">
                        Sedang tidak siaran
                    </h2>
                    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {offline.map((channel) => (
                            <ChannelCard
                                key={channel.channelId}
                                channel={channel}
                                status={statuses[channel.channelId]}
                                onWatch={watch}
                                onAddToGrid={addToGrid}
                                onRemove={remove}
                            />
                        ))}
                    </div>
                </section>
            )}

            {toast && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/95 px-5 py-2.5 text-sm font-medium text-zinc-100 shadow-2xl backdrop-blur">
                    {toast}
                </div>
            )}
        </div>
    );
}