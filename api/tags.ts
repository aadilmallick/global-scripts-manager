import { getConfirm } from "./cliUtilities.ts";

export function parseTags(tags: string) {
  return tags
    .trim()
    .split(",")
    .map((t) => t.trim());
}
/* ADD TAGS */
export async function getTags() {
  const shouldAddTags = await getConfirm(
    "do you want to add any tags to the script?"
  );
  let tags: string[] = [];
  if (shouldAddTags) {
    const tagsToParse = prompt("type in a comma separated list of tags:");
    if (tagsToParse) {
      tags = parseTags(tagsToParse);
    }
  }
  return [...new Set(tags)];
}

export async function editTags(currentTags: string[]) {
  const shoulEditTags = await getConfirm("do you want to edit your tags?");
  if (!shoulEditTags) return currentTags;
  let tags: string[] = currentTags;
  if (shoulEditTags) {
    const tagsToParse = prompt(`edit your tags (old: ${tags.join(", ")}):`);
    if (tagsToParse) {
      tags = parseTags(tagsToParse);
    }
  }
  return [...new Set(tags)];
}
