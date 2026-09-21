"use client";

import { createContext, useContext, useMemo } from "react";
import { useFavorites, type FavoriteChannel } from "@/lib/favorites";
import { useLiveStatus, type ChannelStatus } from "@/lib/useLiveStatus";

interface LiveStatusContextValue {
    favorites: FavoriteChannel[];
    isLoaded: boolean;
    statuses: Record<string, ChannelStatus>;
    isRefreshing: boolean;
    lastUpdated: Date | null;
    error: string | null;
    refresh: () => Promise<void>;
    remove: (channelId: string) => void;
}

const LiveStatusContext = createContext<LiveStatusContextValue | null>(null);

export function LiveStatusProvider({ children }: { children: React.ReactNode }) {
    const { favorites, isLoaded, remove } = useFavorites();

    const channelIds = useMemo(() => favorites.map((f) => f.channelId), [favorites]);
    const live = useLiveStatus(channelIds, isLoaded && favorites.length > 0);

    const value = useMemo<LiveStatusContextValue>(
        () => ({ favorites, isLoaded, remove, ...live }),
        [favorites, isLoaded, remove, live],
    );

    return <LiveStatusContext.Provider value={value}>{children}</LiveStatusContext.Provider>;
}

export function useLiveStatusContext(): LiveStatusContextValue {
    const context = useContext(LiveStatusContext);
    if (!context) {
        throw new Error("useLiveStatusContext harus dipakai di dalam LiveStatusProvider.");
    }
    return context;
}