import { Suspense } from "react";
import FavoriteBoard from "@/components/FavoriteBoard";

export const metadata = {
  title: "Beranda — MultiStream",
  description: "Streamer favorit yang sedang live, dalam satu halaman.",
};

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-red-600" />
        </div>
      }
    >
      <FavoriteBoard />
    </Suspense>
  );
}