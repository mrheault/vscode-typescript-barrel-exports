import * as vscode from "vscode";
import { getConfiguration } from "../helpers";

export async function updateConfigArray(configKey: string, uri: vscode.Uri, add: boolean): Promise<boolean> {
  const config = getConfiguration("tsBarrelGenerator.config");
  const configArray = config.get<string[]>(configKey, []);
  const relativePath = vscode.workspace.asRelativePath(uri.fsPath);
  const index = configArray.indexOf(relativePath);

  if (add && index === -1) {
    configArray.push(relativePath);
    await config.update(configKey, configArray, vscode.ConfigurationTarget.Global);
    return true;
  } else if (!add && index !== -1) {
    configArray.splice(index, 1);
    await config.update(configKey, configArray, vscode.ConfigurationTarget.Global);
    return true;
  }
  return false;
}
