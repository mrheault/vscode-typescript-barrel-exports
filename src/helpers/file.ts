import { workspace, Uri, WorkspaceConfiguration, FileType } from "vscode";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { BARREL_FILES } from "../constants";

export function createDirectoryIfNotExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function writeFile(filePath: string, content: string): void {
  writeFileSync(filePath, content);
}

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await workspace.fs.stat(Uri.file(filePath));
    return true;
  } catch (e) {
    return false;
  }
};

export const readFile = async (filePath: string): Promise<string | undefined> => {
  const file = await workspace.fs.readFile(Uri.file(filePath));
  if (!file) {
    return undefined;
  }

  return new TextDecoder().decode(file);
};

export const getFileContents = async (filePath: string): Promise<string | undefined> => {
  const stats = await workspace.fs.stat(Uri.file(filePath));
  if (stats.type === FileType.Directory) {
    for (const indexFile of BARREL_FILES) {
      const indexPath = join(filePath, indexFile);
      if (await fileExists(indexPath)) {
        return await readFile(indexPath);
      }
    }
    return undefined;
  } else if (stats.type === FileType.File) {
    return await readFile(filePath);
  }
  return undefined;
};
