import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import * as path from "path";
import proxyquire from "proxyquire";

suite("CreateBarrelFile Tests", function () {
  let showErrorMessageStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let helperStubs: any;
  let CreateBarrelFile: any;
  let getConfigurationStub: sinon.SinonStub;
  let readDirectoryStub: sinon.SinonStub;
  let fileExistsStub: sinon.SinonStub;
  let getFileContentsStub: sinon.SinonStub;
  let parseFileForNamedExportsStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;

  setup(() => {
    showErrorMessageStub = sinon.stub(vscode.window, "showErrorMessage");
    showInformationMessageStub = sinon.stub(vscode.window, "showInformationMessage");

    helperStubs = {
      readDirectory: sinon.stub().resolves([]),
      fileExists: sinon.stub().resolves(false),
      writeFile: sinon.stub().resolves(),
      getFileContents: sinon.stub().resolves(undefined),
      parseFileForNamedExports: sinon.stub().returns({ namedExports: [], typeExports: [] }),
    };

    // Use proxyquire to replace the helpers module
    CreateBarrelFile = proxyquire("../../commands/CreateBarrelFile", {
      "../helpers": helperStubs,
    }).CreateBarrelFile;

    getConfigurationStub = sinon.stub(vscode.workspace, "getConfiguration");
    readDirectoryStub = helperStubs.readDirectory;
    fileExistsStub = helperStubs.fileExists;
    getFileContentsStub = helperStubs.getFileContents;
    parseFileForNamedExportsStub = helperStubs.parseFileForNamedExports;
    writeFileStub = helperStubs.writeFile;
  });

  teardown(() => {
    sinon.restore();
  });

  test("Should show error message if no directories are selected", async () => {
    await CreateBarrelFile.create([]);
    assert.strictEqual(showErrorMessageStub.calledOnce, true);
  });

  test("Should create barrel file with named exports", async () => {
    const uri = vscode.Uri.file("/testDir");
    readDirectoryStub.resolves([["testFile.ts", vscode.FileType.File]]);
    fileExistsStub.resolves(true);
    getFileContentsStub.resolves("export const test = 1;");
    parseFileForNamedExportsStub.returns({ namedExports: ["test"], typeExports: [] });
    getConfigurationStub.returns({
      get: (key: string) => (key === "namedExports" ? true : key === "semis" ? true : "'"),
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(writeFileStub.calledOnce, true);
    const [barrelFilePath, content] = writeFileStub.firstCall.args;
    assert.strictEqual(path.normalize(barrelFilePath), path.normalize("/testDir/index.ts"));
    assert.strictEqual(content.includes("export { test } from './testFile';"), true);
  });

  test("Should create barrel file with export *", async () => {
    const uri = vscode.Uri.file("/testDir");
    readDirectoryStub.resolves([["testFile2.ts", vscode.FileType.File]]);
    fileExistsStub.resolves(true);
    getFileContentsStub.resolves("export const test2 = 2;");
    parseFileForNamedExportsStub.returns({ namedExports: [], typeExports: [] });
    getConfigurationStub.returns({
      get: (key: string) => (key === "namedExports" ? false : key === "semis" ? true : "'"),
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(writeFileStub.calledOnce, true);
    const [barrelFilePath, content] = writeFileStub.firstCall.args;
    assert.strictEqual(path.normalize(barrelFilePath), path.normalize("/testDir/index.ts"));
    assert.strictEqual(content.includes("export * from './testFile2';"), true);
  });

  test("Should show error message if no files found in directory", async () => {
    const uri = vscode.Uri.file("/emptyDir");
    readDirectoryStub.resolves([]);
    getConfigurationStub.returns({
      get: (key: string) => (key === "namedExports" ? true : key === "semis" ? true : "'"),
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(showErrorMessageStub.calledOnce, true);
    const expectedMessage = `No files found in the directory: ${path.normalize("/emptyDir")}`;
    const actualMessage = showErrorMessageStub.firstCall.args[0];
    assert.strictEqual(actualMessage, expectedMessage);
  });

  test("Should show error message if no files to export in directory", async () => {
    const uri = vscode.Uri.file("/dirWithNoExportableFiles");
    readDirectoryStub.resolves([["nonExportableFile.txt", vscode.FileType.File]]);
    getConfigurationStub.returns({
      get: (key: string) => (key === "namedExports" ? true : key === "semis" ? true : "'"),
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(showErrorMessageStub.calledOnce, true);
    const expectedMessage = `No files found to export in directory: ${path.normalize("/dirWithNoExportableFiles")}`;
    const actualMessage = showErrorMessageStub.firstCall.args[0];
    assert.strictEqual(actualMessage, expectedMessage);
  });

  test("Should create barrel file with sorted named exports", async () => {
    const uri = vscode.Uri.file("/testDir");
    readDirectoryStub.resolves([
      ["bFile.ts", vscode.FileType.File],
      ["aFile.ts", vscode.FileType.File],
    ]);
    fileExistsStub.resolves(true);
    getFileContentsStub.resolves("export const test = 1;");
    parseFileForNamedExportsStub.returns({ namedExports: ["test"], typeExports: [] });
    getConfigurationStub.returns({
      get: (key: string) =>
        key === "namedExports" ? true : key === "semis" ? true : key === "exportOrder" ? "alphabetical" : "'",
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(writeFileStub.calledOnce, true);
    const [barrelFilePath, content] = writeFileStub.firstCall.args;
    assert.strictEqual(path.normalize(barrelFilePath), path.normalize("/testDir/index.ts"));
    assert.strictEqual(content.includes("export { test } from './aFile';"), true);
    assert.strictEqual(content.includes("export { test } from './bFile';"), true);
  });

  test("Should create barrel file with type exports sorted by type", async () => {
    const uri = vscode.Uri.file("/testDir");
    readDirectoryStub.resolves([["testFile.ts", vscode.FileType.File]]);
    fileExistsStub.resolves(true);
    getFileContentsStub.resolves("export const test = 1; export type TestType = string;");
    parseFileForNamedExportsStub.returns({ namedExports: ["test"], typeExports: ["TestType"] });
    getConfigurationStub.returns({
      get: (key: string) =>
        key === "namedExports" ? true : key === "semis" ? true : key === "exportOrder" ? "byType" : "'",
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(writeFileStub.calledOnce, true);
    const [barrelFilePath, content] = writeFileStub.firstCall.args;
    assert.strictEqual(path.normalize(barrelFilePath), path.normalize("/testDir/index.ts"));
    assert.strictEqual(content.includes("export { test } from './testFile';"), true);
    assert.strictEqual(content.includes("export type { TestType } from './testFile';"), true);
  });

  test("Should handle errors during file processing", async () => {
    const uri = vscode.Uri.file("/testDir");
    readDirectoryStub.resolves([["testFile.ts", vscode.FileType.File]]);
    fileExistsStub.resolves(true);
    getFileContentsStub.rejects(new Error("File read error"));
    getConfigurationStub.returns({
      get: (key: string) => (key === "namedExports" ? true : key === "semis" ? true : "'"),
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(showErrorMessageStub.notCalled, true);
    assert.strictEqual(writeFileStub.notCalled, true);
  });

  test("Should handle errors during barrel file writing", async () => {
    const uri = vscode.Uri.file("/testDir");
    readDirectoryStub.resolves([["testFile.ts", vscode.FileType.File]]);
    fileExistsStub.resolves(true);
    getFileContentsStub.resolves("export const test = 1;");
    parseFileForNamedExportsStub.returns({ namedExports: ["test"], typeExports: [] });
    writeFileStub.rejects(new Error("File write error"));
    getConfigurationStub.returns({
      get: (key: string) => (key === "namedExports" ? true : key === "semis" ? true : "'"),
    });

    await CreateBarrelFile.create([uri]);

    assert.strictEqual(showErrorMessageStub.notCalled, true);
    assert.strictEqual(writeFileStub.calledOnce, true);
  });
});
