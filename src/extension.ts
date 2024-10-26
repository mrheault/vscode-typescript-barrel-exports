import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { CreateBarrelFile } from "./commands/CreateBarrelFile";

export function activate(context: vscode.ExtensionContext) {
  console.log('"vscode-typescript-barrel-exports" is now active.');

  const generateBarrel = vscode.commands.registerCommand(
    "ts.barrel-exports.generateBarrel",
    async (_, selectedFilesOrDirectories: vscode.Uri[]) => {
      if (selectedFilesOrDirectories) {
        await CreateBarrelFile.create(selectedFilesOrDirectories);
      } else {
        vscode.window.showErrorMessage("No folder path selected");
      }
    },
  );

  context.subscriptions.push(generateBarrel);
}

export function deactivate() {}
