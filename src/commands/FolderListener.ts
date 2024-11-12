import * as vscode from "vscode";
import * as path from "path";

import { getConfiguration, Logger } from "../helpers";
import { CreateBarrelFile } from "./CreateBarrelFile";
import { Uri } from "vscode";
import { FolderTreeViewProvider } from "../providers/FolderTreeViewProvider";
import { updateConfigArray } from "../helpers/updateConfig";

export class FolderListener {
  private static watchers: { [key: string]: vscode.FileSystemWatcher } = {};
  private static treeViewProvider: FolderTreeViewProvider;

  public static initializeTreeViewProvider(context: vscode.ExtensionContext) {
    this.treeViewProvider = new FolderTreeViewProvider();
    vscode.window.registerTreeDataProvider("tsBarrelGenerator.folderTreeView", this.treeViewProvider);
    vscode.commands.registerCommand("tsBarrelGenerator.openIndexFile", this.openIndexFile);
  }

  private static async openIndexFile(folder: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
    const indexPath = path.join(workspaceFolder, folder, "index.ts");
    const indexUri = vscode.Uri.file(indexPath);
    const document = await vscode.workspace.openTextDocument(indexUri);
    await vscode.window.showTextDocument(document);
  }

  public static async addFolder(uri: vscode.Uri) {
    const added = await updateConfigArray("foldersToWatch", uri, true);
    if (added) {
      await this.setupListeners();
      await CreateBarrelFile.create([uri]);
      vscode.window.showInformationMessage(`Added ${vscode.workspace.asRelativePath(uri.fsPath)} to barrel listener.`);
      Logger.info(`Added ${vscode.workspace.asRelativePath(uri.fsPath)} to barrel listener.`);
      this.treeViewProvider.refresh();
      this.treeViewProvider.setContextForFolder(vscode.workspace.asRelativePath(uri.fsPath));
    } else {
      vscode.window.showInformationMessage(
        `${vscode.workspace.asRelativePath(uri.fsPath)} is already being watched or excluded.`,
      );
    }
  }

  public static async removeFolder(uri: vscode.Uri) {
    const removed = await updateConfigArray("foldersToWatch", uri, false);
    if (removed) {
      await this.setupListeners();
      vscode.window.showInformationMessage(
        `Removed ${vscode.workspace.asRelativePath(uri.fsPath)} from barrel listener.`,
      );
      Logger.info(`Removed ${vscode.workspace.asRelativePath(uri.fsPath)} from barrel listener.`);
      this.disposeWatcher(vscode.workspace.asRelativePath(uri.fsPath));
      this.treeViewProvider.refresh();
      this.treeViewProvider.setContextForFolder(vscode.workspace.asRelativePath(uri.fsPath));
    } else {
      vscode.window.showInformationMessage(`${vscode.workspace.asRelativePath(uri.fsPath)} is not being watched.`);
    }
  }

  public static async excludePath(uri: vscode.Uri) {
    const added = await updateConfigArray("excludedPaths", uri, true);
    if (added) {
      vscode.window.showInformationMessage(
        `Excluded ${vscode.workspace.asRelativePath(uri.fsPath)} from barrel creation.`,
      );
      Logger.info(`Excluded ${vscode.workspace.asRelativePath(uri.fsPath)} from barrel creation.`);
      this.treeViewProvider.refresh();
      this.treeViewProvider.setContextForFolder(vscode.workspace.asRelativePath(uri.fsPath));
    } else {
      vscode.window.showInformationMessage(`${vscode.workspace.asRelativePath(uri.fsPath)} is already excluded.`);
    }
  }

  public static async removeExcludePath(uri: vscode.Uri) {
    const removed = await updateConfigArray("excludedPaths", uri, false);
    if (removed) {
      vscode.window.showInformationMessage(
        `Removed ${vscode.workspace.asRelativePath(uri.fsPath)} from excluded paths.`,
      );
      Logger.info(`Removed ${vscode.workspace.asRelativePath(uri.fsPath)} from excluded paths.`);
      this.treeViewProvider.refresh();
      this.treeViewProvider.setContextForFolder(vscode.workspace.asRelativePath(uri.fsPath));
    } else {
      vscode.window.showInformationMessage(
        `${vscode.workspace.asRelativePath(uri.fsPath)} is not in the excluded paths.`,
      );
    }
  }

  private static disposeWatcher(relativePath: string) {
    const absolutePath = vscode.Uri.file(relativePath).fsPath;
    const paths = Object.keys(FolderListener.watchers);
    for (const path of paths) {
      if (path === absolutePath) {
        FolderListener.watchers[path].dispose();
        delete FolderListener.watchers[path];
      }
    }
  }

  private static async listener(uri: vscode.Uri) {
    if (!this.isIndexFile(uri)) {
      const folderPath = Uri.file(path.dirname(uri.fsPath));
      await CreateBarrelFile.create([folderPath]);
    }
  }

  private static isIndexFile(uri: vscode.Uri) {
    return uri.fsPath.toLowerCase().endsWith("index.ts");
  }

  public static async setupListeners() {
    const config = getConfiguration("tsBarrelGenerator.config");
    const foldersToWatch = config.get<string[]>("foldersToWatch", []);
    const excludedPaths = config.get<string[]>("excludedPaths", []);

    FolderListener.disposeWatchers();

    for (const folder of foldersToWatch) {
      if (excludedPaths.includes(folder)) continue;

      const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
      const absolutePath = path.join(workspaceFolder, folder);
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(absolutePath, "**/*.{ts,tsx}"),
      );

      watcher.onDidCreate(async (uri) => {
        if (excludedPaths.includes(vscode.workspace.asRelativePath(uri.fsPath))) return;
        Logger.info(`File created: ${uri.fsPath}`);
        await this.listener(uri);
        vscode.window.showInformationMessage(`Barrel file updated due to file creation: ${uri.fsPath}`);
      });

      watcher.onDidDelete(async (uri) => {
        if (excludedPaths.includes(vscode.workspace.asRelativePath(uri.fsPath))) return;
        Logger.info(`File deleted: ${uri.fsPath}`);
        await this.listener(uri);
        vscode.window.showInformationMessage(`Barrel file updated due to file deletion: ${uri.fsPath}`);
      });

      watcher.onDidChange(async (uri) => {
        if (excludedPaths.includes(vscode.workspace.asRelativePath(uri.fsPath))) return;
        Logger.info(`File changed: ${uri.fsPath}`);
        await this.listener(uri);
        vscode.window.showInformationMessage(`Barrel file updated due to file change: ${uri.fsPath}`);
      });

      FolderListener.watchers[absolutePath] = watcher;
    }
  }

  public static disposeWatchers() {
    // Dispose all the current watchers
    Object.values(FolderListener.watchers).forEach((watcher) => watcher.dispose());
    FolderListener.watchers = {};
  }
}
