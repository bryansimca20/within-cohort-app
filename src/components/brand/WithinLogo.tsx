import Image from "next/image"

/** Props for the WITHIN brand mark. */
interface WithinLogoProps {
  /** Which mark: the full wordmark or the angular "W". */
  kind?: "logotype" | "logomark"
  /** Ink color; `white` inverts the black PNG for dark surfaces. */
  color?: "black" | "white"
  /** Rendered height in px; width scales to the mark's aspect ratio. */
  height?: number
  /** Accessible label; pass "" when decorative alongside visible text. */
  alt?: string
  className?: string
  /** Eager-load above the fold. */
  priority?: boolean
}

/** Shipped PNGs per mark and ink, plus intrinsic aspect ratio (width / height) — measured from source. */
const SOURCES = {
  logotype: {
    black: "/brand/within-logotype.png",
    white: "/brand/within-logotype-white.png",
    ratio: 5.54,
  },
  logomark: {
    black: "/brand/within-logomark.png",
    white: "/brand/within-logomark-white.png",
    ratio: 1.68,
  },
} as const

/** The WITHIN logotype/logomark, drawn from the official assets. Never redraw the mark. */
export function WithinLogo({
  kind = "logotype",
  color = "black",
  height = 24,
  alt = "WITHIN",
  className,
  priority = false,
}: WithinLogoProps) {
  const { ratio } = SOURCES[kind]
  return (
    <Image
      src={SOURCES[kind][color]}
      alt={alt}
      height={height}
      width={Math.round(height * ratio)}
      priority={priority}
      className={className}
    />
  )
}
