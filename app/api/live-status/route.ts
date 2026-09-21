import { NextResponse } from "next/server";
import {
    buildStatus,
    fetchChannelFeed,
    fetchVideoDetails,
    type ChannelLiveStatus,
    type FeedEntry,
} from "@/lib/youtube";

const MAX_CHANNELS = 30;
const REVALIDATE = 60;

export const revalidate = 60;

export async function GET(request: Request) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "YOUTUBE_API_KEY belum diatur di environment variable." },
            { status: 500 },
        );
    }

    const param = new URL(request.url).searchParams.get("channels") ?? "";
    const channelIds = [
        ...new Set(
            param
                .split(",")
                .map((id) => id.trim())
                .filter((id) => /^UC[\w-]{22}$/.test(id)),
        ),
    ].slice(0, MAX_CHANNELS);

    if (channelIds.length === 0) {
        return NextResponse.json({ channels: [], fetchedAt: new Date().toISOString() });
    }

    const feeds = await Promise.all(
        channelIds.map(async (channelId) => {
            try {
                return { channelId, entries: await fetchChannelFeed(channelId, REVALIDATE) };
            } catch (err) {
                return {
                    channelId,
                    entries: [] as FeedEntry[],
                    error: err instanceof Error ? err.message : "Feed tidak terbaca",
                };
            }
        }),
    );

    const allVideoIds = feeds.flatMap((f) => f.entries.map((e) => e.videoId));

    let details = new Map();
    let quotaError: string | null = null;
    if (allVideoIds.length > 0) {
        try {
            details = await fetchVideoDetails(allVideoIds, apiKey, REVALIDATE);
        } catch (err) {
            quotaError = err instanceof Error ? err.message : "Gagal memuat detail video";
        }
    }

    const channels: ChannelLiveStatus[] = feeds.map((feed) => {
        const status = buildStatus(feed.channelId, feed.entries, details);
        const error = feed.error ?? quotaError ?? undefined;
        return error ? { ...status, error } : status;
    });

    channels.sort((a, b) => Number(b.isLive) - Number(a.isLive));

    return NextResponse.json({
        channels,
        fetchedAt: new Date().toISOString(),
        quotaUsed: allVideoIds.length > 0 ? Math.ceil(allVideoIds.length / 50) : 0,
    });
}