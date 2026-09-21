"use client";

import { useCallback, useEffect, useState } from "react";

export const FAVORITES_KEY = "multistream-favorites-v1";
export const STREAM_STATE_KEY = "multistream-state-v2";
const MAX_SLOTS = 9;

export interface FavoriteChannel {
    channelId: string;
    title: string;
    avatar?: string;
    handle?: string;
}

function readFavorites(): FavoriteChannel[] {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((c) => c && typeof c.channelId === "string" && c.channelId)
            .map((c) => ({
                channelId: c.channelId,
                title: typeof c.title === "string" && c.title ? c.title : c.channelId,
                avatar: typeof c.avatar === "string" ? c.avatar : undefined,
                handle: typeof c.handle === "string" ? c.handle : undefined,
            }));
    } catch {
        return [];
    }
}

function writeFavorites(list: FavoriteChannel[]) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch {
        // storage bisa tidak tersedia (mode private)
    }
}


export function useFavorites() {
    const [favorites, setFavorites] = useState<FavoriteChannel[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setFavorites(readFavorites());
        setIsLoaded(true);

        const sync = () => setFavorites(readFavorites());
        window.addEventListener("multistream:favorites", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("multistream:favorites", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    const commit = useCallback((next: FavoriteChannel[]) => {
        writeFavorites(next);
        setFavorites(next);
        window.dispatchEvent(new Event("multistream:favorites"));
    }, []);

    const add = useCallback(
        (channel: FavoriteChannel) => {
            const current = readFavorites();
            if (current.some((c) => c.channelId === channel.channelId)) return false;
            commit([...current, channel]);
            return true;
        },
        [commit],
    );

    const remove = useCallback(
        (channelId: string) => {
            commit(readFavorites().filter((c) => c.channelId !== channelId));
        },
        [commit],
    );

    const move = useCallback(
        (channelId: string, direction: -1 | 1) => {
            const current = readFavorites();
            const index = current.findIndex((c) => c.channelId === channelId);
            const target = index + direction;
            if (index === -1 || target < 0 || target >= current.length) return;
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            commit(next);
        },
        [commit],
    );

    return { favorites, isLoaded, add, remove, move };
}

export function pushToStreamGrid(videoId: string, label: string): "added" | "exists" | "full" {
    type Slot = { id: string; videoId: string; label: string };
    let slots: Slot[] = [];

    try {
        const raw = localStorage.getItem(STREAM_STATE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed.slots)) slots = parsed.slots;
    } catch {
        slots = [];
    }

    if (slots.some((s) => s.videoId === videoId)) return "exists";

    const makeId = () =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const emptyIndex = slots.findIndex((s) => !s.videoId);
    if (emptyIndex !== -1) {
        slots[emptyIndex] = { ...slots[emptyIndex], videoId, label };
    } else if (slots.length < MAX_SLOTS) {
        slots.push({ id: makeId(), videoId, label });
    } else {
        return "full";
    }

    try {
        localStorage.setItem(STREAM_STATE_KEY, JSON.stringify({ slots }));
    } catch {
        // ignore
    }
    return "added";
}