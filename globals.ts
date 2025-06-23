import path from "node:path";
import os from "node:os";

const rootPath =
  import.meta.dirname || path.join(os.homedir(), ".global_scripts_manager");

export const globals = {
  scriptsPath: path.join(rootPath, "scripts"),
  jsonFolderPath: rootPath,
};
