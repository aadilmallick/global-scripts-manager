import { assertEquals } from "@std/assert";
import { ScriptsJSONHandler, ScriptsModel } from "./api/ScriptModel.ts";
import { globals } from "./globals.ts";
import { getTextChunks } from "./api/cliUtilities.ts";

Deno.test(async function textChunks() {
  const textChunks = [...getTextChunks("ohh my god", 2)];
  console.log(textChunks);
  assertEquals(textChunks.length, 5);
});
