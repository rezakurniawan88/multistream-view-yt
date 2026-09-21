const RSS_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id=";
const API_BASE = "https://www.googleapis.com/youtube/v3";

const ENTRIES_PER_CHANNEL = 4;
const MAX_IDS_PER_CALL = 50;

export interface FeedEntry {
    videoId: string;
    channelId: string;
    channelTitle: string;
    title: string;
    published: string;
}

export interface LiveVideo {
    videoId: string;
    title: string;
    thumbnail: string;
    concurrentViewers: number | null;
    startedAt: string | null;
}

export interface ChannelLiveStatus {
    channelId: string;
    channelTitle: string | null;
    isLive: boolean;
    video: LiveVideo | null;
    latestVideo: { videoId: string; title: string; thumbnail: string; published: string } | null;
    error?: string;
}

function decodeXmlEntities(value: string): string {
    return value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&amp;/g, "&");
}

function matchTag(source: string, tag: string): string | null {
    const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return match ? decodeXmlEntities(match[1].trim()) : null;
}

export function parseChannelFeed(xml: string): FeedEntry[] {
    const channelTitle =
        matchTag(xml.split("<entry>")[0] ?? "", "title") ?? "";

    const entries: FeedEntry[] = [];
    const blocks = xml.split("<entry>").slice(1);

    for (const block of blocks.slice(0, ENTRIES_PER_CHANNEL)) {
        const body = block.split("</entry>")[0];
        const videoId = matchTag(body, "yt:videoId");
        const channelId = matchTag(body, "yt:channelId");
        if (!videoId || !channelId) continue;

        entries.push({
            videoId,
            channelId,
            channelTitle: matchTag(body, "name") ?? channelTitle,
            title: matchTag(body, "title") ?? "",
            published: matchTag(body, "published") ?? "",
        });
    }

    return entries;
}

export async function fetchChannelFeed(
    channelId: string,
    revalidate: number,
): Promise<FeedEntry[]> {
    const res = await fetch(`${RSS_BASE}${encodeURIComponent(channelId)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MultiStream/1.0)" },
        next: { revalidate },
    });
    if (!res.ok) throw new Error(`Feed channel gagal dimuat (${res.status})`);
    return parseChannelFeed(await res.text());
}

interface VideoItem {
    id: string;
    snippet?: {
        title?: string;
        channelId?: string;
        channelTitle?: string;
        liveBroadcastContent?: string;
        publishedAt?: string;
        thumbnails?: Record<string, { url?: string }>;
    };
    liveStreamingDetails?: {
        concurrentViewers?: string;
        actualStartTime?: string;
    };
}

function pickThumbnail(item: VideoItem): string {
    const thumbs = item.snippet?.thumbnails ?? {};
    return (
        thumbs.maxres?.url ??
        thumbs.standard?.url ??
        thumbs.high?.url ??
        thumbs.medium?.url ??
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`
    );
}

export async function fetchVideoDetails(
    videoIds: string[],
    apiKey: string,
    revalidate: number,
): Promise<Map<string, VideoItem>> {
    const result = new Map<string, VideoItem>();

    for (let i = 0; i < videoIds.length; i += MAX_IDS_PER_CALL) {
        const batch = videoIds.slice(i, i + MAX_IDS_PER_CALL);
        const url = new URL(`${API_BASE}/videos`);
        url.searchParams.set("part", "snippet,liveStreamingDetails");
        url.searchParams.set("id", batch.join(","));
        url.searchParams.set("key", apiKey);
        url.searchParams.set("fields",
            "items(id,snippet(title,channelId,channelTitle,liveBroadcastContent,publishedAt,thumbnails),liveStreamingDetails(concurrentViewers,actualStartTime))");

        const res = await fetch(url.toString(), { next: { revalidate } });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new Error(
                res.status === 403
                    ? "Kuota YouTube API habis atau API key tidak valid."
                    : `videos.list gagal (${res.status}) ${detail.slice(0, 200)}`,
            );
        }

        const data = (await res.json()) as { items?: VideoItem[] };
        for (const item of data.items ?? []) result.set(item.id, item);
    }

    return result;
}

export function buildStatus(
    channelId: string,
    entries: FeedEntry[],
    details: Map<string, VideoItem>,
): ChannelLiveStatus {
    const channelTitle = entries[0]?.channelTitle ?? null;

    for (const entry of entries) {
        const item = details.get(entry.videoId);
        if (item?.snippet?.liveBroadcastContent !== "live") continue;

        const viewers = item.liveStreamingDetails?.concurrentViewers;
        return {
            channelId,
            channelTitle: item.snippet.channelTitle ?? channelTitle,
            isLive: true,
            video: {
                videoId: entry.videoId,
                title: item.snippet.title ?? entry.title,
                thumbnail: pickThumbnail(item),
                concurrentViewers: viewers ? Number(viewers) : null,
                startedAt: item.liveStreamingDetails?.actualStartTime ?? null,
            },
            latestVideo: null,
        };
    }

    const newest = entries[0];
    return {
        channelId,
        channelTitle,
        isLive: false,
        video: null,
        latestVideo: newest
            ? {
                videoId: newest.videoId,
                title: newest.title,
                thumbnail: `https://i.ytimg.com/vi/${newest.videoId}/hqdefault.jpg`,
                published: newest.published,
            }
            : null,
    };
}