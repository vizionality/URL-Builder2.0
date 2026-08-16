// A screenshot figure for blog posts. Plain <img> (not next/image) so it drops
// straight into prerendered article content; width/height are the intrinsic
// pixel size so the browser reserves space and avoids layout shift.
export function BlogImage({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}) {
  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element -- static local screenshot, no loader needed */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="w-full rounded-xl border border-zinc-200 shadow-sm"
      />
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-zinc-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
