import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { CreateBarrelFile } from "./commands/CreateBarrelFile";
import { FolderListener } from "./commands/FolderListener";
import { FolderTreeViewProvider } from "./providers/FolderTreeViewProvider";
import { getConfiguration, Logger } from "./helpers";

export function activate(context: vscode.ExtensionContext) {
  console.log('"vscode-typescript-barrel-exports" is now active.');
  const folderTreeViewProvider = new FolderTreeViewProvider();

  const generateBarrel = vscode.commands.registerCommand(
    "ts.barrel-exports.generateBarrel",
    async (_, selectedFilesOrDirectories: vscode.Uri[]) => {
      if (selectedFilesOrDirectories) {
        await CreateBarrelFile.create(selectedFilesOrDirectories);
        vscode.window.showInformationMessage("Barrel file created/updated successfully.");
      } else {
        vscode.window.showErrorMessage("No folder path selected");
      }
    },
  );

  const addFolderToListenerCommand = vscode.commands.registerCommand(
    "ts.barrel-exports.addFolderToListener",
    async (uri: vscode.Uri) => {
      if (uri) {
        await FolderListener.addFolder(uri);
      } else {
        vscode.window.showErrorMessage(`There was no folder path provided`);
      }
    },
  );

  const removeFolderFromListenerCommand = vscode.commands.registerCommand(
    "ts.barrel-exports.removeFolderFromListener",
    async (folderItem: any) => {
      const folder = folderItem.folder;
      const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
      const folderUri = vscode.Uri.file(path.join(workspaceFolder, folder));
      await FolderListener.removeFolder(folderUri);
    },
  );

  const excludePathCommand = vscode.commands.registerCommand(
    "ts.barrel-exports.excludePath",
    async (uri: vscode.Uri) => {
      if (uri) {
        await FolderListener.excludePath(uri);
      } else {
        vscode.window.showErrorMessage(`There was no path provided`);
      }
    },
  );
  const removeExcludePathCommand = vscode.commands.registerCommand(
    "ts.barrel-exports.removeExcludePath",
    async (uri: vscode.Uri) => {
      if (uri) {
        await FolderListener.removeExcludePath(uri);
      } else {
        vscode.window.showErrorMessage(`There was no path provided`);
      }
    },
  );

  context.subscriptions.push(
    generateBarrel,
    addFolderToListenerCommand,
    removeFolderFromListenerCommand,
    excludePathCommand,
    removeExcludePathCommand,
  );

  FolderListener.setupListeners();
  FolderListener.initializeTreeViewProvider(context);
}

export function deactivate() {
  FolderListener.disposeWatchers();
}
