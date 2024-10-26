import * as vscode from "vscode";

export function showInformationMessage(message: string): void {
  vscode.window.showInformationMessage(message);
}

export function showErrorMessage(message: string): void {
  vscode.window.showErrorMessage(message);
}
