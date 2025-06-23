import path from "node:path";
import fs from "node:fs/promises";
import { StateManager } from "./patterns.ts";
import { createSignal, createEffect } from "./patterns.ts";

export interface Script {
  name: string;
  id: string;
  isGlobal: boolean;
  filepath: string;
  tags: string[];
  isPinned: boolean;
  schedule?: string;
  logs: { filepath: string; createdAt: string }[];
  lastRun?: string;
}

export class ScriptsModel {
  #scripts: Script[] = [];
  private scriptsSignal: () => Script[];
  private setScriptsSignal: (newValue: Script[]) => void;

  constructor(private pathsHandler: PathsHandler, scripts: Script[] = []) {
    this.#scripts = scripts;
    const [scriptsSignal, setScriptsSignal] = createSignal(this.scripts);
    this.scriptsSignal = scriptsSignal;
    this.setScriptsSignal = setScriptsSignal;
  }

  onScriptsChange(cb: (scripts: Script[]) => void) {
    createEffect(() => {
      cb(this.scriptsSignal());
    });
  }

  addScript(
    script: Pick<Script, "name"> &
      Partial<Pick<Script, "tags" | "isGlobal" | "isPinned" | "schedule">>
  ) {
    const newScript = {
      ...script,
      id: crypto.randomUUID(),
    };
    const newNewScript: Script = {
      ...newScript,
      filepath: this.pathsHandler.getPathForScript(
        newScript.id,
        newScript.name
      ),
      logs: [],
      tags: script.tags || [],
      isGlobal: script.isGlobal || false,
      isPinned: script.isPinned || false,
    };
    this.scripts = [...this.scripts, newNewScript];
    return newNewScript;
  }

  editScript(script: Script, data: Partial<Script>) {
    const newScript = {
      ...script,
      ...data,
    };
    this.scripts = this.scripts.map((s) =>
      s.id === script.id ? newScript : s
    );
    return newScript;
  }

  queryScripts(cb: (script: Script) => boolean) {
    return this.scripts.filter(cb);
  }

  public get scripts() {
    return this.#scripts;
  }

  private set scripts(scripts: Script[]) {
    this.#scripts = scripts;
    this.setScriptsSignal(scripts);
  }

  getScriptByID(id: string) {
    return this.queryScripts((script) => script.id === id)[0];
  }

  getAddRunScriptInfo(script: Script, logPath?: string) {
    const lastRun = new Date().toISOString();
    const logs = logPath
      ? [
          {
            createdAt: lastRun,
            filepath: logPath,
          },
        ]
      : [];
    return {
      ...script,
      lastRun,
      logs: [...script.logs, ...logs],
    } as Script;
  }

  deleteScriptByID(id: string) {
    try {
      const scriptToDelete = this.getScriptByID(id);
      this.scripts = this.scripts.filter((script) => script.id !== id);
      return scriptToDelete;
    } catch (error) {
      console.log("script not found");
      return null;
    }
  }
}

type JSONFileStructure = {
  metadata: {
    tags: string[];
  };
  scripts: Script[];
};

export class PathsHandler {
  constructor(public jsonfolderpath: string, public scriptsPath: string) {}

  getPathForScript(id: string, name: string) {
    return path.join(this.scriptsPath, `${name}-${id}`, name);
  }

  getFolderPathForScript(script: Script) {
    return path.dirname(script.filepath);
  }

  public get jsonFilePath() {
    return path.join(this.jsonfolderpath, "scripts.json");
  }
}

export class ScriptsJSONHandler {
  public tags = new Set<string>();

  constructor(private pathsHandler: PathsHandler) {}

  private async upsertFolder() {
    const { isDirectory } = await fs.stat(this.pathsHandler.jsonfolderpath);
    if (!isDirectory) {
      await fs.mkdir(this.pathsHandler.jsonfolderpath, {
        recursive: true,
      });
    }
  }

  private async write(data: JSONFileStructure) {
    await fs.writeFile(
      this.pathsHandler.jsonFilePath,
      JSON.stringify(data, null, 2),
      {
        encoding: "utf-8",
      }
    );
  }

  async writeScriptsToFile(scripts: Script[]) {
    await this.upsertFolder();
    await this.write({
      metadata: {
        tags: [...this.tags],
      },
      scripts,
    });
  }

  addTags(tags: string[]) {
    tags.forEach((tag) => {
      this.tags.add(tag);
    });
  }

  async loadScriptsFromFile() {
    try {
      const data = await fs.readFile(this.pathsHandler.jsonFilePath, {
        encoding: "utf-8",
      });
      const parsedData = JSON.parse(data) as JSONFileStructure;
      this.tags = new Set([...this.tags, ...parsedData.metadata.tags]);
      return parsedData;
    } catch (e) {
      console.log("error when reading");
      console.error(e);
      return null;
    }
  }
}
