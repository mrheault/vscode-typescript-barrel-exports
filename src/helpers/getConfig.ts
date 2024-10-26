import { workspace, WorkspaceConfiguration } from "vscode";

export function getConfiguration(section: string): WorkspaceConfiguration {
  return workspace.getConfiguration(section);
}
