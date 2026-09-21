"use client";

import { useEffect, useRef, useState } from "react";
import { useFavorites } from "@/lib/favorites";

interface AddChannelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded?: (title: string) => void;
}

export default function AddChannelDialog({ isOpen, onClose, onAdded }: AddChannelDialogProps) {
    const { add } = useFavorites();
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue("");
            setError(null);
            inputRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const submit = async () => {
        const input = value.trim();
        if (!input || isLoading) return;

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/resolve-channel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error ?? "Channel tidak ditemukan.");
                return;
            }

            const added = add({
                channelId: data.channelId,
                title: data.title,
                avatar: data.avatar ?? undefined,
                handle: data.handle ?? undefined,
            });

            if (!added) {
                setError(`${data.title} sudah ada di daftar favorit.`);
                return;
            }

            onAdded?.(data.title);
            onClose();
        } catch {
            setError("Gagal menghubungi server. Coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Tambah channel favorit"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Tambah channel favorit</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Tutup"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <label
                    htmlFor="channel-input"
                    className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                    Link channel, @handle, atau channel ID
                </label>
                <input
                    id="channel-input"
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            void submit();
                        }
                    }}
                    placeholder="@namachannel"
                    disabled={isLoading}
                    className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-red-600/70 focus:ring-2 focus:ring-red-600/20 disabled:opacity-50"
                />

                {error ? (
                    <p className="mt-2 text-xs text-red-400">{error}</p>
                ) : (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                        Status live channel dicek lewat feed publik YouTube, tanpa memakai kuota
                        pencarian.
                    </p>
                )}

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={!value.trim() || isLoading}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
                    >
                        {isLoading && (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        )}
                        {isLoading ? "Mencari…" : "Tambahkan"}
                    </button>
                </div>
            </div>
        </div>
    );
}