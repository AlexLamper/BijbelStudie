/**
 * Renders one JSON-LD block.
 *
 * `</script>` inside a string value would close the tag early and let the rest
 * of the payload be parsed as HTML, so the closing angle bracket is escaped.
 * JSON.stringify already escapes quotes, but not that sequence.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
