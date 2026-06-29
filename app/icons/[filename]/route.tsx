import { ImageResponse } from "next/og";

interface Props {
  params: Promise<{ filename: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { filename } = await params;
  const size = filename.includes("512") ? 512 : 192;
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.36);

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
        <div
          style={{
            color: "#ffffff",
            fontSize,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          RC
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
