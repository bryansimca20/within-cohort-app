import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 96, height: 96 };
export const contentType = "image/png";

/**
 * Favicon: the WITHIN logomark on paper. ImageResponse (Satori) only accepts
 * inline styles and rasterizes the shipped PNG — this is not a UI component.
 */
export default async function Icon() {
  const data = await readFile(join(process.cwd(), "public/brand/within-logomark.png"));
  const src = `data:image/png;base64,${data.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <img src={src} width={62} height={37} alt="" />
      </div>
    ),
    { ...size }
  );
}
