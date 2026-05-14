import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shinba Service",
    short_name: "Shinba Service",
    description:
      "馬の現場に合わせた業務サポートとShinba Reportの相談窓口。競走馬牧場の月次レポート作成、音声入力、個別ツール化を支援します。",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e7",
    theme_color: "#183b2d",
    icons: [
      {
        src: "/favicon.png?v=20260514a",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png?v=20260514a",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
