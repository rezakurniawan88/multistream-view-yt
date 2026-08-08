"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface YTPlayerInstance {
    mute: () => void;
    unMute: () => void;
    setVolume: (v: number) => void;
    loadVideoById: (videoId: string) => void;
    stopVideo: () => void;
    playVideo: () => void;
    clearVideo: () => void;
    destroy: () => void;
}

type PlayerStatus = "empty" | "loading" | "ready" | "error";

interface YoutubePlayerProps {
    videoId: string;
    playerId: string;
    label: string;
    onLabelChange: (label: string) => void;
    muteCommand: { token: number; muted: boolean } | null;
}

declare global {
    interface Window {
        YT?: {
            Player: new (
                element: HTMLElement,
                options: {
                    videoId: string;
                    width?: string | number;
                    height?: string | number;
                    playerVars?: Record<string, string | number>;
                    events?: {
                        onReady?: (event: { target: YTPlayerInstance }) => void;
                        onStateChange?: (event: { data: number }) => void;
                        onError?: () => void;
                    };
                },
            ) => YTPlayerInstance;
        };
        onYouTubeIframeAPIReady?: () => void;
        __ytPlayers?: Record<
            string,
            { mute: () => void; setVolume: (v: number) => void }
        >;
    }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (apiPromise) return apiPromise;

    apiPromise = new Promise<void>((resolve) => {
        if (window.YT?.Player) {
            resolve();
            return;
        }
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previous?.();
            resolve();
        };
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
    });

    return apiPromise;
}

const PLACEHOLDER_VIDEO_ID = "M7lc1UVf-VE";

function buildLiveChatUrl(videoId: string): string {
    const domain =
        typeof window !== "undefined" && window.location.hostname
            ? window.location.hostname
            : "localhost";
    const params = new URLSearchParams({
        v: videoId,
        embed_domain: domain,
        dark_theme: "1",
    });
    return `https://www.youtube.com/live_chat?${params.toString()}`;
}

const VOLUME_SLIDER_CLASSES = [
    "h-1 w-full cursor-pointer appearance-none rounded-full outline-none",
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-zinc-50",
    "[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)] [&::-webkit-slider-thumb]:transition-transform",
    "[&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:scale-[1.15]",
    "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full",
    "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-zinc-50",
    "[&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)]",
    "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-700",
].join(" ");

export default function YoutubePlayer({ videoId, playerId, label, onLabelChange, muteCommand }: YoutubePlayerProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const mountNodeRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const [status, setStatus] = useState<PlayerStatus>(videoId ? "loading" : "empty");
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(100);
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [labelDraft, setLabelDraft] = useState(label);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (!isEditingLabel) setLabelDraft(label);
    }, [label, isEditingLabel]);

    useEffect(() => {
        if (!videoId) setIsChatOpen(false);
    }, [videoId]);

    const videoIdRef = useRef(videoId);
    const controlsRef = useRef({ muted: false, volume: 100 });
    useEffect(() => {
        videoIdRef.current = videoId;
    }, [videoId]);
    useEffect(() => {
        controlsRef.current = { muted: isMuted, volume };
    }, [isMuted, volume]);

    const applyControls = useCallback(() => {
        const player = playerRef.current;
        if (!player) return;
        const { muted, volume: vol } = controlsRef.current;
        if (muted) {
            player.mute();
        } else {
            player.unMute();
            player.setVolume(vol);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        loadYouTubeApi().then(() => {
            if (cancelled || !wrapperRef.current || !window.YT) return;

            const mountNode = document.createElement("div");
            mountNode.style.width = "100%";
            mountNode.style.height = "100%";
            wrapperRef.current.appendChild(mountNode);
            mountNodeRef.current = mountNode;

            const player = new window.YT.Player(mountNode, {
                videoId: PLACEHOLDER_VIDEO_ID,
                width: "100%",
                height: "100%",
                playerVars: {
                    autoplay: 0,
                    rel: 0,
                    controls: 1,
                    modestbranding: 1,
                    playsinline: 1,
                },
                events: {
                    onReady: () => {
                        playerRef.current = player;
                        if (videoIdRef.current) {
                            try {
                                player.loadVideoById(videoIdRef.current);
                                setStatus("ready");
                                applyControls();
                            } catch {
                                setStatus("error");
                            }
                        } else {
                            player.stopVideo();
                            setStatus("empty");
                        }
                    },
                    onError: () => {
                        setStatus("error");
                    },
                },
            });
            window.__ytPlayers = window.__ytPlayers ?? {};
            window.__ytPlayers[playerId] = {
                mute: () => player.mute(),
                setVolume: (v: number) => player.setVolume(v),
            };
        });

        return () => {
            cancelled = true;
            delete window.__ytPlayers?.[playerId];
            try {
                playerRef.current?.destroy?.();
            } catch {
                console.warn("Gagal destroy player — mungkin sudah dihapus/destroy sebelumnya");
            }
            playerRef.current = null;
            if (wrapperRef.current) {
                wrapperRef.current.replaceChildren();
            }
            mountNodeRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        if (!videoId) {
            try {
                player.stopVideo();
                player.clearVideo?.();
            } catch {
                console.warn("Gagal menghapus video — mungkin sudah dihapus/sebelumnya");
            }
            queueMicrotask(() => setStatus("empty"));
            return;
        }

        queueMicrotask(() => setStatus("loading"));
        try {
            player.loadVideoById(videoId);
            queueMicrotask(() => {
                setStatus("ready");
                applyControls();
            });
        } catch {
            queueMicrotask(() => setStatus("error"));
        }
    }, [videoId, applyControls]);

    useEffect(() => {
        if (!muteCommand) return;
        const player = playerRef.current;
        if (!player) return;
        if (muteCommand.muted) {
            player.mute();
            setIsMuted(true);
        } else {
            player.unMute();
            player.setVolume(controlsRef.current.volume || 100);
            setIsMuted(false);
        }
    }, [muteCommand]);

    const commitLabel = () => {
        const trimmed = labelDraft.trim();
        setIsEditingLabel(false);
        if (trimmed && trimmed !== label) {
            onLabelChange(trimmed);
        } else {
            setLabelDraft(label);
        }
    };

    const cancelLabelEdit = () => {
        setLabelDraft(label);
        setIsEditingLabel(false);
    };

    const toggleMute = () => {
        const player = playerRef.current;
        if (!player) return;
        if (isMuted) {
            player.unMute();
            player.setVolume(volume);
            setIsMuted(false);
        } else {
            player.mute();
            setIsMuted(true);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setVolume(value);
        const player = playerRef.current;
        if (!player) return;
        if (value === 0) {
            player.mute();
            setIsMuted(true);
        } else {
            player.unMute();
            if (isMuted) setIsMuted(false);
            player.setVolume(value);
        }
    };

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40 transition-colors hover:border-zinc-700">
            <div className="flex w-full flex-1 flex-col">
                <div className="relative aspect-video w-full flex-1 bg-black">
                    {status === "empty" && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-950">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-zinc-600">
                                    <path strokeLinecap="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-zinc-500">No video yet.</p>
                            <p className="text-xs text-zinc-600">Enter the YouTube link below.</p>
                        </div>
                    )}
                    {status === "loading" && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-red-600" />
                            <p className="text-xs font-medium text-zinc-500">Loading player…</p>
                        </div>
                    )}
                    {status === "error" && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-950 px-4 text-center">
                            <span className="text-2xl">⚠️</span>
                            <p className="text-sm text-zinc-400">Video cannot be loaded</p>
                            <p className="text-xs text-zinc-600">Please check the Video ID / link that you entered.</p>
                        </div>
                    )}
                    <div ref={wrapperRef} className="h-full w-full" />
                </div>

                <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900/80 px-3 py-2.5 backdrop-blur">
                    <button type="button" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-all ${isMuted
                            ? "bg-red-600/20 text-red-400 ring-1 ring-red-600/40"
                            : "text-zinc-300 hover:bg-zinc-700/60 hover:text-white"
                            }`}
                    >
                        {isMuted ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                            </svg>
                        )}
                    </button>

                    <div className="flex flex-1 items-center gap-2">
                        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-400">
                            {isMuted ? 0 : volume}%
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className={VOLUME_SLIDER_CLASSES}
                            style={
                                {
                                    "--fill": `${isMuted ? 0 : volume}%`,
                                    backgroundImage: `linear-gradient(to right, #ef4444 0%, #ef4444 var(--fill), #3f3f46 var(--fill), #3f3f46 100%)`,
                                } as React.CSSProperties
                            }
                            aria-label={`Volume ${label}`}
                        />
                    </div>

                    {videoId && (
                        <button type="button" onClick={() => setIsChatOpen((v) => !v)} title={isChatOpen ? "Hide live chat" : "Show live chat"} aria-pressed={isChatOpen} className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors sm:flex ${isChatOpen ? "bg-red-600/20 text-red-400 ring-1 ring-red-600/40" : "text-zinc-400 hover:bg-zinc-700/60 hover:text-white"}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" /></svg>
                        </button>
                    )}

                    {videoId && (
                        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" title="Open in YouTube" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white sm:flex">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                            </svg>
                        </a>
                    )}

                    {isEditingLabel ? (
                        <input
                            autoFocus
                            type="text"
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            onBlur={commitLabel}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitLabel();
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelLabelEdit();
                                }
                            }}
                            maxLength={24}
                            className="h-7 w-24 shrink-0 rounded-md border border-red-600/50 bg-zinc-950 px-2 text-xs font-medium text-zinc-100 outline-none focus:ring-2 focus:ring-red-600/20 sm:w-28"
                        />
                    ) : (
                        <button type="button" onClick={() => setIsEditingLabel(true)} title="Click to change stream name" className="hidden max-w-28 shrink-0 truncate rounded-md px-1.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-white sm:block">{label}</button>
                    )}
                </div>

                {isChatOpen && videoId && (
                    <div className="h-80 w-full shrink-0 border-t border-zinc-800 bg-zinc-950">
                        <iframe
                            src={buildLiveChatUrl(videoId)}
                            title={`Live chat ${label}`}
                            className="h-full w-full"
                            style={{ border: 0 }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}