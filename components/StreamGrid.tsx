"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import YoutubePlayer from "./YoutubePlayer";
import Link from "next/link";

export const STORAGE_KEY = "multistream-state-v2";
const LEGACY_STORAGE_KEY = "multistream-video-ids";

const DEFAULT_SLOTS = 1;
const MIN_SLOTS = 1;
const MAX_SLOTS = 9;

const GRID_COLS_CLASS = "grid-cols-1 xl:grid-cols-2";

interface StreamSlot {
    id: string;
    videoId: string;
    label: string;
}

function makeId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeSlot(label: string, videoId = ""): StreamSlot {
    return { id: makeId(), videoId, label };
}

function defaultSlots(count: number): StreamSlot[] {
    const n = Math.min(Math.max(count, MIN_SLOTS), MAX_SLOTS);
    return Array.from({ length: n }, (_, i) => makeSlot(`Stream ${i + 1}`));
}

export function extractVideoId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const urlMatch = trimmed.match(
        /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
    );
    if (urlMatch) return urlMatch[1];
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

    return null;
}

interface StreamGridProps {
    slots?: number;
}

export default function StreamGrid({ slots: initialSlotCount = DEFAULT_SLOTS }: StreamGridProps) {
    const [slots, setSlots] = useState<StreamSlot[]>(() => defaultSlots(initialSlotCount));
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [muteCommand, setMuteCommand] = useState<{ token: number; muted: boolean } | null>(null);
    const [isAllMuted, setIsAllMuted] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalInput, setModalInput] = useState("");
    const [modalError, setModalError] = useState<string | null>(null);
    const modalInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (active && parsed && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
                        const restored: StreamSlot[] = parsed.slots.slice(0, MAX_SLOTS).map(
                            (s: Partial<StreamSlot>, i: number) => ({
                                id: typeof s?.id === "string" && s.id ? s.id : makeId(),
                                videoId: typeof s?.videoId === "string" ? s.videoId : "",
                                label: typeof s?.label === "string" && s.label.trim() ? s.label : `Stream ${i + 1}`,
                            })
                        );
                        setSlots(restored);
                        setInputs(Object.fromEntries(restored.map((s) => [s.id, s.videoId])));
                    }
                } else {
                    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
                    if (legacy) {
                        const parsedLegacy = JSON.parse(legacy);
                        if (active && Array.isArray(parsedLegacy) && parsedLegacy.some(Boolean)) {
                            const restored: StreamSlot[] = parsedLegacy
                                .filter((id) => typeof id === "string" && id)
                                .slice(0, MAX_SLOTS)
                                .map((id: string, i: number) => ({
                                    id: makeId(),
                                    videoId: id,
                                    label: `Stream ${i + 1}`,
                                }));
                            if (restored.length > 0) {
                                setSlots(restored);
                                setInputs(Object.fromEntries(restored.map((s) => [s.id, s.videoId])));
                            }
                        }
                    }
                }
            } catch {
                // ignore corrupt data
            }
            if (active) setIsLoaded(true);
        })();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    slots: slots.map(({ id, videoId, label }) => ({ id, videoId, label })),
                })
            );
        } catch {
            // storage may be unavailable (private mode etc.)
        }
    }, [slots, isLoaded]);

    useEffect(() => {
        if (isAddModalOpen) modalInputRef.current?.focus();
    }, [isAddModalOpen]);

    const showToast = useCallback((message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2200);
    }, []);

    const applySlot = useCallback(
        (id: string) => {
            const videoId = extractVideoId(inputs[id] ?? "");
            if (!videoId) {
                setError("Masukkan Video ID atau link YouTube yang valid.");
                return;
            }
            setError(null);
            setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, videoId } : s)));
            showToast("Stream diterapkan ✅");
        },
        [inputs, showToast]
    );

    const handleKeyDown = (id: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            applySlot(id);
        }
    };

    const resetAll = useCallback(() => {
        setSlots((prev) => prev.map((s) => ({ ...s, videoId: "" })));
        setInputs((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, ""])));
        setError(null);
        showToast("Semua slot dikosongkan");
    }, [showToast]);

    const openAddModal = () => {
        if (slots.length >= MAX_SLOTS) {
            showToast(`Maksimum ${MAX_SLOTS} stream tercapai`);
            return;
        }
        setModalInput("");
        setModalError(null);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setModalInput("");
        setModalError(null);
    };

    const submitAddModal = () => {
        const videoId = extractVideoId(modalInput);
        if (!videoId) {
            setModalError("Masukkan Video ID atau link YouTube yang valid.");
            return;
        }
        setSlots((prev) => [...prev, makeSlot(`Stream ${prev.length + 1}`, videoId)]);
        showToast("Stream ditambahkan ✅");
        closeAddModal();
    };

    const removeSlot = useCallback(
        (id: string) => {
            if (slots.length <= MIN_SLOTS) return;
            setSlots((prev) => prev.filter((s) => s.id !== id));
            setInputs((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        },
        [slots.length]
    );

    const updateLabel = useCallback((id: string, label: string) => {
        setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
    }, []);

    const toggleMuteAll = () => {
        const nextMuted = !isAllMuted;
        setIsAllMuted(nextMuted);
        setMuteCommand({ token: Date.now(), muted: nextMuted });
    };

    const activeCount = useMemo(() => slots.filter((s) => s.videoId).length, [slots]);

    return (
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 pb-8 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">MultiStream</h1>
                        <p className="text-xs text-zinc-500 sm:text-sm">Watch multiple YouTube live streams simultaneously on one screen.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                        <span className={`h-2 w-2 rounded-full ${activeCount > 0 ? "bg-emerald-500" : "bg-zinc-600"}`} />
                        {activeCount}/{slots.length} active streams
                    </div>

                    <button type="button" onClick={openAddModal} disabled={slots.length >= MAX_SLOTS} title="Add new stream" className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600/50 hover:text-red-400 disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:border-zinc-800">+ Add Stream</button>

                    <button type="button" onClick={toggleMuteAll} title={isAllMuted ? "Unmute all streams" : "Mute all streams"} className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-600/50 hover:text-red-400">{isAllMuted ? "🔊 Unmute All" : "🔇 Mute All"}</button>

                    {activeCount > 0 && (
                        <button type="button" onClick={resetAll} className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-600/50 hover:text-red-400">Reset All</button>
                    )}
                </div>
            </header>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-2.5 text-sm text-red-400">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            <div className={`grid items-start gap-4 lg:gap-5 ${GRID_COLS_CLASS}`}>
                {slots.map((slot, i) => (
                    <div key={slot.id} className="flex flex-col gap-2.5">
                        <YoutubePlayer
                            videoId={slot.videoId}
                            playerId={`player-${slot.id}`}
                            label={slot.label}
                            onLabelChange={(label) => updateLabel(slot.id, label)}
                            muteCommand={muteCommand}
                        />
                        <div className="flex items-center gap-2">
                            <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-500">{i + 1}</span>
                            <input
                                type="text"
                                value={inputs[slot.id] ?? ""}
                                onChange={(e) => setInputs((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                                onKeyDown={handleKeyDown(slot.id)}
                                placeholder="Video ID or YouTube link…"
                                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-red-600/70 focus:ring-2 focus:ring-red-600/20"
                            />
                            <button type="button" onClick={() => applySlot(slot.id)} disabled={!(inputs[slot.id] ?? "").trim()} className="h-9 shrink-0 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none">Apply</button>
                            {slots.length > MIN_SLOTS && (
                                <button type="button" onClick={() => removeSlot(slot.id)} title="Remove this slot" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-500 transition-colors hover:border-red-600/50 hover:text-red-400"
                                >✕</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <footer className="absolute bottom-5 left-0 right-0 mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-xs text-zinc-600">
                <span>© Copyright {new Date().getFullYear()} | <Link href="https://github.com/rezakurniawan88/multistream-view-yt" target="_blank" className="underline">Reza Kurniawan</Link></span>
            </footer>

            {toast && (
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/95 px-5 py-2.5 text-sm font-medium text-zinc-100 shadow-2xl backdrop-blur">{toast}</div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={closeAddModal} onKeyDown={(e) => { if (e.key === "Escape") closeAddModal(); }}>
                    <div role="dialog" aria-modal="true" aria-label="Add new stream" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-bold text-white">Add Stream</h2>
                            <button type="button" onClick={closeAddModal} title="Tutup" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white">✕</button>
                        </div>

                        <label className="mb-1.5 block text-xs font-medium text-zinc-400">Video ID or YouTube Link</label>
                        <input ref={modalInputRef} type="text" value={modalInput}
                            onChange={(e) => {
                                setModalInput(e.target.value);
                                if (modalError) setModalError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    submitAddModal();
                                } else if (e.key === "Escape") {
                                    closeAddModal();
                                }
                            }}
                            placeholder="https://youtube.com/watch?v=…"
                            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-red-600/70 focus:ring-2 focus:ring-red-600/20"
                        />
                        {modalError && (
                            <p className="mt-2 text-xs text-red-400">⚠️ {modalError}</p>
                        )}

                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={closeAddModal} className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">Cancel</button>
                            <button type="button" onClick={submitAddModal} disabled={!modalInput.trim()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}