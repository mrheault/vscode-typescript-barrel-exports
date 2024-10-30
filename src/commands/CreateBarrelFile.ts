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
} from "../helpers";

export const BarrelFiles = ["index.ts", "index.tsx"];

export class CreateBarrelFile {
  public static async create(uris: vscode.Uri[]): Promise<void> {
    if (!uris || uris.length === 0) {
      showErrorMessage("No directories selected");
      return;
    }

    const config = getConfiguration("tsBarrelGenerator.config");
    const namedExports = config.get("namedExports", true);
    const includeFolders = config.get("includeFolders", true);

    for (const uri of uris) {
      const dirPath = normalize(uri.fsPath);
      const files = await readDirectory(uri);
      if (!files.length) {
        showErrorMessage(`No files found in the directory: ${dirPath}`);
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
        continue;
      }

      const output: string[] = [];

      for (const file of filesToExport) {
        const fileWithoutExtension = basename(file, extname(file));
        const semis = config.get("semis", true);
        const quotes = config.get("quotes", "'");

        if (namedExports) {
          const fileContents = await getFileContents(file);
          const { namedExports, typeExports } = parseFileForNamedExports(fileContents || "", fileWithoutExtension);

          const namedExportsStr = namedExports.filter(Boolean).join(", ");
          const typeExportsStr = typeExports.filter(Boolean).join(", ");
          let exportStr = "";
          if (namedExportsStr) {
            exportStr += `export { ${namedExportsStr} } from ${quotes}./${fileWithoutExtension}${quotes}${
              semis ? ";" : ""
            }\n`;
          }
          if (typeExportsStr) {
            exportStr += `export type { ${typeExportsStr} } from ${quotes}./${fileWithoutExtension}${quotes}${
              semis ? ";" : ""
            }\n`;
          }
          output.push(exportStr);
        } else {
          output.push(`export * from ${quotes}./${fileWithoutExtension}${quotes}${semis ? ";" : ""}\n`);
        }
      }

      const barrelFilePath = normalize(join(dirPath, "index.ts"));
      if (!(await fileExists(barrelFilePath))) {
        writeFile(barrelFilePath, "");
      }
      const fileContents = await getFileContents(barrelFilePath);
      const newContent = output.join("");

      if (fileContents !== newContent) {
        writeFile(barrelFilePath, newContent);
      }
    }

    showInformationMessage("Barrel files created successfully!");
  }
}
