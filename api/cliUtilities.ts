import ora from "npm:ora";
import { pastel } from "npm:gradient-string";
import figlet from "npm:figlet";
import inquirer from "npm:inquirer";
import { input, confirm as confirmPrompt } from "npm:@inquirer/prompts";
import process from "node:process";

export async function showQuickPick<T extends readonly string[]>(
  choices: T,
  message?: string,
  defaultChoice?: T[number]
) {
  const result = await inquirer.prompt({
    name: "template",
    type: "list",
    message: message ?? "Choose an option:",
    choices,
    default: defaultChoice
      ? (() => {
          return defaultChoice;
        })()
      : undefined,
  });
  return result.template as T[number] | undefined;
}

export async function getConfirm(message: string) {
  const result = await confirmPrompt({
    message,
  });
  return result;
}

export async function getInput(
  message: string,
  { required = true }: { required?: boolean }
) {
  const result = await input({
    message,
    validate: (input) => {
      if (input.trim() === "") {
        return "Input cannot be empty";
      }
      return true;
    },
    required,
  });
  return result;
}

export const showLoader = (text: string) => {
  const spinner = ora({
    text,
    color: "cyan",
  }).start();

  return {
    stop: () => spinner.stop(),
    succeed: (text?: string) => spinner.succeed(text),
    fail: (text?: string) => spinner.fail(text),
    update: (text: string) => (spinner.text = text),
  };
};

export function gradientText(text: string) {
  return new Promise((resolve, reject) => {
    figlet(text, (err: unknown, data: string) => {
      console.log(pastel.multiline(data));
      resolve(data);
    });
  });
}

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function* getTextChunks(text: string, chunkSize: number) {
  let startIndex = 0;
  const stopIndex = text.length;
  while (startIndex < stopIndex) {
    yield text.slice(startIndex, startIndex + chunkSize);
    startIndex += chunkSize;
  }
  return;
}

export class TextStreamer {
  constructor(private delayMs: number, private chunkSize = 1) {}

  async stream(text: string) {
    // let startIndex = 0;
    // const stopIndex = text.length;
    const generator = getTextChunks(text, this.chunkSize);

    for (const chunk of generator) {
      process.stdout.write(chunk);
      await delay(this.delayMs);
    }
    console.log();
  }
}
