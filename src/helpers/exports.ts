import {
  Node,
  ClassDeclaration,
  EnumDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  VariableStatement,
  SyntaxKind,
} from "typescript";

export const hasExport = (
  node:
    | ClassDeclaration
    | EnumDeclaration
    | FunctionDeclaration
    | InterfaceDeclaration
    | TypeAliasDeclaration
    | VariableStatement,
) =>
  node.modifiers?.some(
    (child) =>
      child.kind === SyntaxKind.ExportKeyword ||
      child.kind === SyntaxKind.DefaultKeyword,
  );

export const isDefaultExport = (node: Node) => {
  return node.getText().startsWith("export default");
};
