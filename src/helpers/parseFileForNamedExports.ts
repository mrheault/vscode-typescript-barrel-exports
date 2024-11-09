import * as typescript from "typescript";
import { hasExport, isDefaultExport } from ".";
import { Logger } from "./logger";

export const parseFileForNamedExports = (fileContents: string, filename: string) => {
  const namedExports = new Set<string>();
  const typeExports = new Set<string>();

  try {
    const sourceFile = typescript.createSourceFile(
      "temp.ts",
      fileContents,
      typescript.ScriptTarget.Latest,
      true,
      typescript.ScriptKind.TS,
    );

    const addExport = (set: Set<string>, name: string, isDefault: boolean) => {
      if (isDefault) {
        set.add(`default as ${name}`);
      } else {
        set.add(name);
      }
    };

    const parseFile = (node: typescript.Node) => {
      try {
        const isDefault = isDefaultExport(node);

        if ((typescript.isTypeAliasDeclaration(node) || typescript.isInterfaceDeclaration(node)) && hasExport(node)) {
          addExport(typeExports, node.name.getText(), isDefault);
        } else if (
          typescript.isExportDeclaration(node) &&
          node.exportClause &&
          typescript.isNamedExports(node.exportClause)
        ) {
          const isTypeExport = node.getText().startsWith("export type");
          const targetSet = isTypeExport ? typeExports : namedExports;

          node.exportClause.elements.forEach((element) => {
            if (typescript.isExportSpecifier(element)) {
              targetSet.add(element.name.getText());
            }
          });
        } else if (typescript.isEnumDeclaration(node) && hasExport(node)) {
          namedExports.add(node.name.getText());
        } else if (typescript.isClassDeclaration(node) && hasExport(node)) {
          const className = node.name?.getText() || filename;
          addExport(namedExports, className, isDefault);
        } else if (typescript.isExportAssignment(node)) {
          const expression = node.expression.getText();
          const exportName = typescript.isIdentifier(node.expression) ? expression : filename;
          addExport(namedExports, exportName, isDefault);
        } else if (typescript.isFunctionDeclaration(node) && hasExport(node)) {
          const funcName = node.name?.getText() || filename;
          addExport(namedExports, funcName, isDefault);
        } else if (typescript.isVariableDeclarationList(node)) {
          const parent = node.parent.kind === typescript.SyntaxKind.VariableStatement ? node.parent : null;
          if (parent && hasExport(parent)) {
            node.declarations.forEach((d) => {
              namedExports.add(d.name.getText());
            });
          }
        }

        typescript.forEachChild(node, parseFile);
      } catch (error) {
        Logger.logError("Error parsing node", error);
      }
    };

    parseFile(sourceFile);
  } catch (error) {
    Logger.logError("Error creating source file", error);
  }

  return {
    namedExports: Array.from(namedExports),
    typeExports: Array.from(typeExports),
  };
};
