import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

async function getShellProfileContents() {
  // Detect the user's shell and profile file
  const shell = process.env.SHELL || "";
  let profileFile = "";
  if (shell.includes("zsh")) {
    profileFile = path.join(os.homedir(), ".zshrc");
  } else if (shell.includes("bash")) {
    profileFile = path.join(os.homedir(), ".bashrc");
  } else {
    // fallback
    profileFile = path.join(os.homedir(), ".profile");
  }

  // Check if already present
  let content = "";
  try {
    content = await fs.readFile(profileFile, { encoding: "utf-8" });
  } catch (e) {
    console.error(e);
    // File may not exist, will be created
  }
  return { profileFile, content };
}

export async function addToPath(folderPath: string) {
  const { profileFile, content } = await getShellProfileContents();
  const exportLine = `export PATH="$PATH:${folderPath}"\n`;

  if (content.includes(exportLine.trim())) {
    console.log(`${folderPath} already in your PATH.`);
    return;
  }

  // Append to profile
  await fs.appendFile(profileFile, exportLine);
  console.log(`Added ${folderPath} to your PATH in ${profileFile}.`);
  console.log(`Please run: source ${profileFile} or restart your terminal.`);
}

export async function removeFromPath(folderPath: string) {
  const { profileFile, content } = await getShellProfileContents();

  const exportLine = `export PATH="$PATH:${folderPath}"\n`;

  if (content.includes(exportLine.trim())) {
    const newContent = content.replace(exportLine, "");
    await fs.writeFile(profileFile, newContent);
    console.log(`Removed ${folderPath} from your PATH in ${profileFile}.`);
    console.log(`Please run: source ${profileFile} or restart your terminal.`);
  } else {
    console.log(`${folderPath} not found in your PATH.`);
  }
}

export async function upsertFolder(folderPath: string) {
  try {
    const { isDirectory } = await fs.stat(folderPath);
  } catch (e) {
    await fs.mkdir(folderPath, {
      recursive: true,
    });
  }
}

export async function createBashFile(filepath: string) {
  await fs.writeFile(filepath, "#!/bin/bash\n\necho 'hello'", {
    mode: 0o777,
  });
}

export class FileManager {
  static async exists(filePath: string) {
    try {
      await fs.access(filePath);
      return true; // The file exists
    } catch (_) {
      return false; // The file does not exist
    }
  }

  static async removeFile(filepath: string) {
    if (await this.exists(filepath)) {
      await fs.rm(filepath);
    }
  }

  static async removeDirectory(directoryPath: string) {
    if (await this.exists(directoryPath)) {
      await fs.rm(directoryPath, { recursive: true, force: true });
    }
  }

  static async renameFile(oldPath: string, newPath: string) {
    if (!(await this.exists(oldPath))) {
      throw new Error(`File not found: ${oldPath}`);
    }
    await fs.rename(oldPath, newPath);
  }

  static async createFile(
    filepath: string,
    content: string,
    options?: {
      override?: boolean;
    }
  ) {
    if ((await this.exists(filepath)) && options?.override) {
      await fs.rm(filepath);
    }
    await fs.writeFile(filepath, content);
  }

  static async createDirectory(
    directoryPath: string,
    options?: {
      overwrite?: boolean;
    }
  ) {
    if (await this.exists(directoryPath)) {
      if (options?.overwrite) {
        await fs.rm(directoryPath, { recursive: true, force: true });
        await fs.mkdir(directoryPath, { recursive: true });
      }
    } else {
      await fs.mkdir(directoryPath, { recursive: true });
    }
  }

  static async readFile(filepath: string): Promise<string> {
    if (!(await this.exists(filepath))) {
      throw new Error(`File not found: ${filepath}`);
    }
    return await fs.readFile(filepath, {
      encoding: "utf-8",
    });
  }

  static async listFiles(directoryPath: string): Promise<string[]> {
    if (!(await this.exists(directoryPath))) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  }

  static async listDirectories(directoryPath: string): Promise<string[]> {
    if (!(await this.exists(directoryPath))) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  static async copyFile(
    sourcePath: string,
    destinationPath: string
  ): Promise<void> {
    if (!(await this.exists(sourcePath))) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }
    await fs.copyFile(sourcePath, destinationPath);
  }

  static async moveFile(
    sourcePath: string,
    destinationPath: string
  ): Promise<void> {
    if (!(await this.exists(sourcePath))) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }
    await fs.rename(sourcePath, destinationPath);
  }

  static async getFileSize(filepath: string): Promise<number> {
    if (!(await this.exists(filepath))) {
      throw new Error(`File not found: ${filepath}`);
    }
    const stats = await fs.stat(filepath);
    return stats.size;
  }
}
