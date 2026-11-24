import { FOUNDER_PHOTO_ALT, FOUNDER_PHOTO_SRC } from './founderCopy';

type FounderPhotoProps = {
  className?: string;
  /** Empty when the name sits in the same line and the picture is only a portrait. */
  alt?: string;
};

/** Circular crop is already in the file. Callers set the on-screen size. */
export function FounderPhoto({
  className = '',
  alt = FOUNDER_PHOTO_ALT,
}: FounderPhotoProps) {
  return (
    <img
      src={FOUNDER_PHOTO_SRC}
      alt={alt}
      width={400}
      height={400}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-full object-cover ring-2 ring-print ${className}`}
    />
  );
}
