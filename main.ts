import path from "node:path";
import {
  getConfirm,
  showLoader,
  showQuickPick,
  TextStreamer,
} from "./api/cliUtilities.ts";
import {
  addToPath,
  createBashFile,
  FileManager,
  removeFromPath,
  upsertFolder,
} from "./api/FileManager.ts";
import {
  PathsHandler,
  Script,
  ScriptsJSONHandler,
  ScriptsModel,
} from "./api/ScriptModel.ts";
import { editTags, getTags } from "./api/tags.ts";
import { globals } from "./globals.ts";
import { bgGreen, bgRed, red, yellow } from "jsr:@std/internal@^1.0.5/styles";
import CLI from "./api/CLI.ts";
// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts

const pathsHandler = new PathsHandler(
  globals.jsonFolderPath,
  globals.scriptsPath
);
const jsonHandler = new ScriptsJSONHandler(pathsHandler);
const data = await jsonHandler.loadScriptsFromFile();
const scripts = data?.scripts || [];
const scriptModel = new ScriptsModel(pathsHandler, scripts);

const textStreamer = new TextStreamer(15, 1);

if (import.meta.main) {
  chooseAction();
}

async function chooseAction() {
  await textStreamer.stream(
    "Welcome to Global Scripts Manager. What would you like to do with your scripts today?"
  );

  // TODO: list actions here
  const actions = [
    "create script",
    "delete script",
    "edit script",
    "list scripts",
    "copy script to clipboard",
    "quit",
  ] as const;
  const chosenAction = await showQuickPick(actions, "choose an action:");

  switch (chosenAction) {
    case "create script":
      await createScript();
      break;
    case "delete script":
      await deleteScript();
      break;
    case "edit script":
      await editScript();
      break;
    case "list scripts":
      listScripts();
      break;
    case "copy script to clipboard":
      await copyScriptToClipboard();
      break;
    case "quit":
      await quit();
  }
}

async function copyScriptToClipboard() {
  const script = await chooseScript();
  if (!script) return;
  const scriptPath = script.filepath;
  try {
    await CLI.linux(`cat ${scriptPath} | pbcopy`);
    console.log("script copied to clipboard");
  } catch (e) {
    console.error("Error copying script to clipboard:", e);
  }
}

// quit action
async function quit() {
  const shouldQuit = await getConfirm("are you sure you want to quit?");
  if (shouldQuit) {
    console.log("Goodbye!");
    Deno.exit();
  } else {
    await chooseAction();
  }
}

// create script action
async function createScript() {
  let nameIsValid = false;
  let finalScriptName = "";
  while (!nameIsValid) {
    const scriptName = prompt(
      "what should the script name be? (No spaces or special characters)"
    );
    if (!scriptName) {
      console.log("Let's try that again ...");
      continue;
    }
    if (!scriptModel.isScriptNameUnique(finalScriptName)) {
      console.log(
        "Script name already exists. Please choose a different name."
      );
      continue;
    }
    const filenameRegex = /^([A-Za-z\-_]|\d)*$/;
    nameIsValid = filenameRegex.test(scriptName);
    finalScriptName = scriptName;
  }

  const tags = await getTags();
  jsonHandler.addTags(tags);

  const newScript = scriptModel.addScript({
    name: finalScriptName,
    tags,
  });

  // once you have final script name, you can create the folder, then create the script.
  const { succeed } = showLoader("Creating script...");
  await upsertFolder(pathsHandler.getFolderPathForScript(newScript));
  await createBashFile(newScript.filepath);
  succeed();

  /* Add to path */
  const shouldAddToPath = await getConfirm(
    "do you want to add the script to your path?"
  );
  if (shouldAddToPath) {
    const { succeed: succeed2, fail } = showLoader("Adding to path...");
    try {
      await addToPath(pathsHandler.getFolderPathForScript(newScript));
      scriptModel.editScript(newScript, { isGlobal: true });
      succeed2();
    } catch (e) {
      console.error(e);
      console.log("Error adding to path");
      fail();
    }
  }

  const { succeed: succeed2 } = showLoader("Saving script...");
  await jsonHandler.writeScriptsToFile(scriptModel.scripts);
  succeed2();
}

function listScripts() {
  const scriptInfo = scriptModel.scripts.map((s) => {
    return {
      name: s.name,
      tags: s.tags.join(", "),
      isGlobal: s.isGlobal ? "global" : "local",
      filepath: s.filepath,
    };
  });
  const allTags = [...jsonHandler.getTags()];
  console.log(bgGreen("all tags:"), allTags);
  console.log(JSON.stringify(scriptInfo, null, 2));
}

async function chooseScript() {
  // List all scripts by name and return the selected script object
  if (scriptModel.scripts.length === 0) {
    console.log("No scripts found.");
    return null;
  }
  const scriptNames = scriptModel.scripts.map((s) => s.name);
  const chosenName = await showQuickPick(
    scriptNames as unknown as readonly string[],
    "Select a script:",
    scriptNames[0]
  );
  return scriptModel.scripts.find((s) => s.name === chosenName) || null;
}

async function deleteScript() {
  // List scripts and get the chosen script
  const script = await chooseScript();
  if (!script) return;

  // GetConfiawait getConfirm deletion of logs and script file
  const deleteLogs = await getConfirm("Delete all logs for this script?");
  const deleteFile = await getConfirm(
    "Delete the script file and folder as well?"
  );

  // if isglobal, remove from path
  if (script.isGlobal) {
    const { succeed: succeed2 } = showLoader("Removing from path...");
    await removeFromPath(pathsHandler.getFolderPathForScript(script));
    succeed2();
  }

  // Remove logs if requested
  if (deleteLogs && script.logs && script.logs.length > 0) {
    for (const log of script.logs) {
      try {
        await FileManager.removeFile(log.filepath);
      } catch (e) {
        console.error("Error deleting log file:", e);
      }
    }
  }
  if (!deleteLogs) console.log("user chose not to delete the logs");

  // Remove script file and folder if requested
  if (deleteFile) {
    const folderPath = pathsHandler.getFolderPathForScript(script);
    try {
      await FileManager.removeDirectory(folderPath);
    } catch (e) {
      // Ignore errors if folder doesn't exist
      console.error("Error deleting folder:", e);
    }
  }
  if (!deleteFile) console.log("user chose not to delete the script file");

  // Remove from model and update JSON
  const deletedScript = scriptModel.deleteScriptByID(script.id);
  if (!deletedScript) {
    console.error("Error deleting script");
    return;
  }
  await jsonHandler.writeScriptsToFile(scriptModel.scripts);
  console.log(`Deleted script: ${deletedScript.name}`);
}

async function editScript() {
  const script = await chooseScript();
  if (!script) return;

  await textStreamer.stream(`editing script at path: ${script.filepath}`);

  async function editName(script: Script) {
    const newName = prompt("what should the new name be?");
    if (newName) {
      if (!scriptModel.isScriptNameUnique(newName)) {
        console.log(
          "Script name already exists. Please choose a different name."
        );
        return script;
      }
      const { succeed: succeed2 } = showLoader("Renaming file...");
      try {
        const newFilepath = path.join(
          pathsHandler.getFolderPathForScript(script),
          newName
        );
        // 1. first rename file
        await FileManager.renameFile(script.filepath, newFilepath);
        // 2. udpate state
        const updatedScript = scriptModel.editScript(script, {
          name: newName,
          filepath: newFilepath,
        });
        succeed2();
        return updatedScript;
      } catch (e) {
        console.error(red("whoops, couldn't rename file"));
      }
    }
    return script;
  }

  async function editTagsAction(script: Script) {
    const tags = await editTags(script.tags);
    if (tags.length > 0) {
      const updatedScript = scriptModel.editScript(script, { tags });
      jsonHandler.addTags(tags);
      return updatedScript;
    }
    return script;
  }

  async function editIsGlobalAction(script: Script) {
    const isGlobal = script.isGlobal;
    if (isGlobal) {
      const newIsGlobal = await getConfirm("remove from path?");
      if (newIsGlobal) {
        const { succeed: succeed2 } = showLoader("Removing from path...");
        await removeFromPath(pathsHandler.getFolderPathForScript(script));
        const updatedScript = scriptModel.editScript(script, {
          isGlobal: false,
        });
        succeed2();
        return updatedScript;
      }
    }

    if (!isGlobal) {
      const newIsGlobal = await getConfirm("add to path?");
      if (newIsGlobal) {
        const { succeed: succeed2 } = showLoader("Adding to path...");
        await addToPath(pathsHandler.getFolderPathForScript(script));
        const updatedScript = scriptModel.editScript(script, {
          isGlobal: true,
        });
        succeed2();
        return updatedScript;
      }
    }
    return script;
  }

  async function saveChanges() {
    const { succeed: succeed2 } = showLoader("Saving script...");
    await jsonHandler.writeScriptsToFile(scriptModel.scripts);
    succeed2();
  }

  const actions = [
    "edit name",
    "edit tags",
    "add/remove from path",
    "save changes",
  ] as const;
  let chosenAction: (typeof actions)[number];
  let updatedScript = script;
  do {
    chosenAction = await showQuickPick(actions, "choose an action:");
    switch (chosenAction) {
      case "edit name":
        updatedScript = await editName(updatedScript);
        break;
      case "edit tags":
        updatedScript = await editTagsAction(updatedScript);
        break;
      case "add/remove from path":
        updatedScript = await editIsGlobalAction(updatedScript);
        break;
    }
  } while (chosenAction !== "save changes");

  await saveChanges();
}
