"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LiveVideoInfo {
    videoId: string;
    title: string;
    thumbnail: string;
    concurrentViewers: number | null;
    startedAt: string | null;
}

export interface ChannelStatus {
    channelId: string;
    channelTitle: string | null;
    isLive: boolean;
    video: LiveVideoInfo | null;
    latestVideo: { videoId: string; title: string; thumbnail: string; published: string } | null;
    error?: string;
}

const POLL_INTERVAL_MS = 90_000;

export function useLiveStatus(channelIds: string[], enabled = true) {
    const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const key = channelIds.join(",");
    const inFlight = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (!key) {
            setStatuses({});
            setLastUpdated(new Date());
            return;
        }

        inFlight.current?.abort();
        const controller = new AbortController();
        inFlight.current = controller;

        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/live-status?channels=${encodeURIComponent(key)}`, {
                signal: controller.signal,
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error ?? "Gagal memuat status live.");
                return;
            }

            const next: Record<string, ChannelStatus> = {};
            for (const channel of data.channels as ChannelStatus[]) {
                next[channel.channelId] = channel;
            }
            setStatuses(next);
            setLastUpdated(new Date(data.fetchedAt ?? Date.now()));
            setError(
                (data.channels as ChannelStatus[]).find((c) => c.error)?.error ?? null,
            );
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                setError("Tidak bisa terhubung ke server.");
            }
        } finally {
            if (inFlight.current === controller) {
                setIsRefreshing(false);
                inFlight.current = null;
            }
        }
    }, [key]);

    useEffect(() => {
        if (!enabled) return;

        let timer: number | undefined;

        const tick = () => {
            if (document.visibilityState === "visible") void refresh();
        };

        tick();
        timer = window.setInterval(tick, POLL_INTERVAL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") void refresh();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            if (timer) window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
            inFlight.current?.abort();
        };
    }, [refresh, enabled]);

    return { statuses, isRefreshing, lastUpdated, error, refresh };
}

export function useLiveNotifications(statuses: Record<string, ChannelStatus>, enabled: boolean) {
    const seen = useRef<Set<string> | null>(null);

    useEffect(() => {
        const liveNow = new Set(
            Object.values(statuses)
                .filter((s) => s.isLive && s.video)
                .map((s) => s.video!.videoId),
        );

        if (seen.current === null) {
            seen.current = liveNow;
            return;
        }

        if (enabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const status of Object.values(statuses)) {
                if (!status.isLive || !status.video) continue;
                if (seen.current.has(status.video.videoId)) continue;

                new Notification(`${status.channelTitle ?? "Channel favorit"} sedang live`, {
                    body: status.video.title,
                    icon: status.video.thumbnail,
                    tag: status.video.videoId,
                });
            }
        }

        seen.current = liveNow;
    }, [statuses, enabled]);
}