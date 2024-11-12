import * as vscode from "vscode";

export class FolderTreeViewProvider implements vscode.TreeDataProvider<FolderItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FolderItem | undefined | void> = new vscode.EventEmitter<
    FolderItem | undefined | void
  >();
  readonly onDidChangeTreeData: vscode.Event<FolderItem | undefined | void> = this._onDidChangeTreeData.event;

  private folders: string[] = [];
  private excluded: string[] = [];

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const config = vscode.workspace.getConfiguration("tsBarrelGenerator.config");
    this.folders = config.get<string[]>("foldersToWatch", []);
    this.excluded = config.get<string[]>("excludedPaths", []);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FolderItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FolderItem): Thenable<FolderItem[]> {
    if (!element) {
      return Promise.resolve([
        new FolderItem("Folder Listeners", vscode.TreeItemCollapsibleState.Collapsed, true),
        new FolderItem("Excluded Folders", vscode.TreeItemCollapsibleState.Collapsed, true),
      ]);
    } else if (element.label === "Folder Listeners") {
      return Promise.resolve(this.folders.map((folder) => new FolderItem(folder)));
    } else if (element.label === "Excluded Folders") {
      return Promise.resolve(this.excluded.map((folder) => new FolderItem(folder)));
    }
    return Promise.resolve([]);
  }

  setContextForFolder(folder: string) {
    const isInListenerArray = this.folders.includes(folder);
    vscode.commands.executeCommand("setContext", "folderInListenerArray", isInListenerArray);

    const isInExcludedArray = this.excluded.includes(folder);
    vscode.commands.executeCommand("setContext", "folderInExcludedArray", isInExcludedArray);
  }
}

class FolderItem extends vscode.TreeItem {
  constructor(
    public readonly folder: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    isParent: boolean = false,
  ) {
    super(folder, collapsibleState);
    this.contextValue = isParent ? "folderParent" : "folderItem";
    if (!isParent) {
      this.command = {
        command: "tsBarrelGenerator.openIndexFile",
        title: "Open Index File",
        arguments: [folder],
      };
    }
  }

  iconPath = new vscode.ThemeIcon("folder");
}
