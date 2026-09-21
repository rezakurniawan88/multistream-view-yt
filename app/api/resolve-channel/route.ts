import { NextResponse } from "next/server";

const CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/;

function toChannelUrl(input: string): string | null {
    const value = input.trim();
    if (!value) return null;

    if (CHANNEL_ID_PATTERN.test(value)) return `https://www.youtube.com/channel/${value}`;
    if (/^@[\w.-]+$/.test(value)) return `https://www.youtube.com/${value}`;

    const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
    let url: URL;
    try {
        url = new URL(withScheme);
    } catch {
        return null;
    }
    if (!/(^|\.)youtube\.com$/.test(url.hostname) && url.hostname !== "youtu.be") return null;

    const path = url.pathname.replace(/\/(videos|streams|live|featured|about|playlists)\/?$/, "");
    return `https://www.youtube.com${path}`;
}

function extract(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    return match ? match[1] : null;
}

function decode(value: string): string {
    return value
        .replace(/\\u0026/g, "&")
        .replace(/\\"/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

export async function POST(request: Request) {
    let input = "";
    try {
        input = String(((await request.json()) as { input?: string }).input ?? "");
    } catch {
        return NextResponse.json({ error: "Body permintaan tidak valid." }, { status: 400 });
    }

    const target = toChannelUrl(input);
    if (!target) {
        return NextResponse.json(
            { error: "Masukkan link channel YouTube, @handle, atau channel ID (UC…)." },
            { status: 400 },
        );
    }

    let html: string;
    try {
        const res = await fetch(target, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
                "Accept-Language": "id,en;q=0.9",
            },
            next: { revalidate: 86400 },
        });
        if (!res.ok) {
            return NextResponse.json(
                { error: `Channel tidak ditemukan (${res.status}).` },
                { status: 404 },
            );
        }
        html = await res.text();
    } catch {
        return NextResponse.json({ error: "Gagal menghubungi YouTube." }, { status: 502 });
    }

    const channelId =
        extract(html, /<meta itemprop="identifier" content="(UC[\w-]{22})"/) ??
        extract(html, /"channelId":"(UC[\w-]{22})"/) ??
        extract(html, /channel\/(UC[\w-]{22})/);

    if (!channelId) {
        return NextResponse.json(
            { error: "Channel ID tidak terbaca dari halaman itu. Coba pakai link /channel/UC…" },
            { status: 404 },
        );
    }

    const rawTitle =
        extract(html, /<meta property="og:title" content="([^"]+)"/) ??
        extract(html, /"channelMetadataRenderer":\{"title":"([^"]+)"/);
    const rawAvatar =
        extract(html, /<meta property="og:image" content="([^"]+)"/) ??
        extract(html, /"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/);
    const handle = extract(html, /"channelHandleText":\{"runs":\[\{"text":"(@[^"]+)"/);

    return NextResponse.json({
        channelId,
        title: rawTitle ? decode(rawTitle) : channelId,
        avatar: rawAvatar ? decode(rawAvatar) : null,
        handle: handle ?? null,
    });
}