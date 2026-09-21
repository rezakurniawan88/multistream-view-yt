import StreamGrid from "@/components/StreamGrid";

export const metadata = {
    title: "Multistream — Tonton beberapa stream sekaligus",
    description:
        "Tonton multistream YouTube sekaligus dalam satu layar dengan kontrol volume & mute per video.",
};

export default function MultistreamPage() {
    return (
        <div className="relative flex min-h-full flex-col bg-zinc-950">
            <StreamGrid />
        </div>
    );
}