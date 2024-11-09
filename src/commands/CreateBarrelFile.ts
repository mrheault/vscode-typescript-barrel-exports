import * as vscode from "vscode";
import { join, basename, extname, normalize } from "path";
import {
  fileExists,
  getConfiguration,
  writeFile,
  showInformationMessage,
  showErrorMessage,
  getFileContents,
  parseFileForNamedExports,
  readDirectory,
  Logger,
} from "../helpers";

export const BarrelFiles = ["index.ts", "index.tsx"];

export class CreateBarrelFile {
  public static async create(uris: vscode.Uri[]): Promise<void> {
    if (!uris || uris.length === 0) {
      showErrorMessage("No directories selected");
      Logger.error("No directories selected for barrel file creation.");
      return;
    }

    const config = getConfiguration("tsBarrelGenerator.config");
    const namedExports = config.get("namedExports", true);
    const includeFolders = config.get("includeFolders", true);
    const exportOrder = config.get<"none" | "alphabetical" | "byType">("exportOrder", "none");

    for (const uri of uris) {
      const dirPath = normalize(uri.fsPath);
      Logger.info(`Processing directory: ${dirPath}`);
      const files = await readDirectory(uri);
      if (!files.length) {
        showErrorMessage(`No files found in the directory: ${dirPath}`);
        Logger.error(`No files found in the directory: ${dirPath}`);
        continue;
      }

      const filesToExport = [];

      for (const file of files) {
        const fileName = file[0];
        const absPath = normalize(join(dirPath, fileName));

        if (
          (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) &&
          BarrelFiles.indexOf(fileName.toLowerCase()) === -1
        ) {
          filesToExport.push(absPath);
        }
        if (includeFolders) {
          // Only allow folder which contain an index file
          if (await fileExists(absPath)) {
            for (const indexFile of BarrelFiles) {
              const indexPath = normalize(join(absPath, indexFile));
              if (await fileExists(indexPath)) {
                filesToExport.push(absPath);
                break;
              }
            }
          }
        }
      }

      if (!filesToExport.length) {
        showErrorMessage(`No files found to export in directory: ${dirPath}`);
        Logger.error(`No files found to export in directory: ${dirPath}`);
        continue;
      }

      const output: string[] = [];

      for (const file of filesToExport) {
        const fileWithoutExtension = basename(file, extname(file));
        const semis = config.get("semis", true);
        const quotes = config.get("quotes", "'");

        try {
          if (namedExports) {
            const fileContents = await getFileContents(file);
            const { namedExports, typeExports } = parseFileForNamedExports(fileContents || "", fileWithoutExtension);
            // Sort the output based on the exportOrder configuration
            if (exportOrder === "alphabetical") {
              namedExports.sort();
              typeExports.sort();
            }
            const namedExportsStr = namedExports.filter(Boolean).join(", ");
            const typeExportsStr = typeExports.filter(Boolean).join(", ");
            let exportStr = "";
            if (namedExportsStr) {
              exportStr += `export { ${namedExportsStr} } from ${quotes}./${fileWithoutExtension}${quotes}${semis ? ";" : ""}\n`;
            }
            if (typeExportsStr) {
              exportStr += `export type { ${typeExportsStr} } from ${quotes}./${fileWithoutExtension}${quotes}${semis ? ";" : ""}\n`;
            }
            if (exportOrder === "byType") {
              const typeExportsArr = typeExportsStr
                ? [
                    `export type { ${typeExportsStr} } from ${quotes}./${fileWithoutExtension}${quotes}${semis ? ";" : ""}\n`,
                  ]
                : [];
              const valueExportsArr = namedExportsStr
                ? [
                    `export { ${namedExportsStr} } from ${quotes}./${fileWithoutExtension}${quotes}${semis ? ";" : ""}\n`,
                  ]
                : [];
              output.push(...valueExportsArr, ...typeExportsArr);
            } else {
              output.push(exportStr);
            }
          } else {
            output.push(`export * from ${quotes}./${fileWithoutExtension}${quotes}${semis ? ";" : ""}\n`);
          }
        } catch (error) {
          Logger.logError(`Error processing file: ${file}`, error);
        }
      }

      // Sort the output based on the exportOrder configuration
      if (exportOrder === "alphabetical") {
        output.sort((a, b) => a.localeCompare(b));
      } else if (exportOrder === "byType") {
        output.sort((a, b) => {
          if (a.startsWith("export type") && !b.startsWith("export type")) {
            return 1;
          }
          if (!a.startsWith("export type") && b.startsWith("export type")) {
            return -1;
          }
          return a.localeCompare(b);
        });
      }

      try {
        const barrelFilePath = normalize(join(dirPath, "index.ts"));
        if (!(await fileExists(barrelFilePath))) {
          writeFile(barrelFilePath, "");
        }
        const fileContents = await getFileContents(barrelFilePath);
        const newContent = output.join("");

        if (fileContents !== newContent) {
          writeFile(barrelFilePath, newContent);
        }
      } catch (error) {
        Logger.logError(`Error writing barrel file in directory: ${dirPath}`, error);
      }
    }

    showInformationMessage("Barrel files created successfully!");
    Logger.info("Barrel files created successfully!");
  }
}
