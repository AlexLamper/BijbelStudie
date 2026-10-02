/**
 * A friend's picture, or the first letter of their name on the brand tint.
 * The same circle the app draws at feed size, so a row reads the same on both
 * clients. A plain <img>: these are small, remote avatars that change per
 * person, so next/image would add a loader round trip for nothing.
 */
export function FriendAvatar({
  name,
  image,
  size = 36,
}: {
  name: string
  image?: string | null
  size?: number
}) {
  const trimmed = (name ?? "").trim()
  const initial = trimmed ? trimmed.charAt(0).toUpperCase() : "?"

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-teal-tint font-bold text-teal-dark dark:text-teal-400"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )
}
