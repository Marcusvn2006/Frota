import { ImageResponse } from "next/og";

interface Props {
  params: Promise<{ filename: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { filename } = await params;
  const size = filename.includes("512") ? 512 : 192;
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.36);

  const iconSize = Math.round(size * 0.52);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#1d4ed8",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="5" cy="18" r="2" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
