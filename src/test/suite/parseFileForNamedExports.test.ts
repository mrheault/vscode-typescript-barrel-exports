import * as assert from "assert";
import { parseFileForNamedExports } from "../../helpers";

suite("parseFileForNamedExports", () => {
  test("should parse named exports correctly", () => {
    const fileContents = `
      export const foo = 42;
      export function bar() {}
      export class Baz {}
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, ["foo", "bar", "Baz"]);
    assert.deepStrictEqual(result.typeExports, []);
  });

  test("should parse type exports correctly", () => {
    const fileContents = `
      export type MyType = string;
      export interface MyInterface {}
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, []);
    assert.deepStrictEqual(result.typeExports, ["MyType", "MyInterface"]);
  });

  test("should handle default exports", () => {
    const fileContents = `
      const foo = 42;
      export default foo;
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, ["default as foo"]);
    assert.deepStrictEqual(result.typeExports, []);
  });

  test("should parse export declarations correctly", () => {
    const fileContents = `
      const foo = 42;
      const bar = 43;
      export { foo, bar };
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, ["foo", "bar"]);
    assert.deepStrictEqual(result.typeExports, []);
  });

  test("should parse export assignments correctly", () => {
    const fileContents = `
      const foo = 42;
      export = foo;
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, ["foo"]);
    assert.deepStrictEqual(result.typeExports, []);
  });

  test("should parse variable declaration exports correctly", () => {
    const fileContents = `
      export const foo = 42, bar = 43;
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, ["foo", "bar"]);
    assert.deepStrictEqual(result.typeExports, []);
  });

  test("should parse enum exports correctly", () => {
    const fileContents = `
      export enum MyEnum { A, B, C }
    `;
    const result = parseFileForNamedExports(fileContents, "testFile.ts");
    assert.deepStrictEqual(result.namedExports, ["MyEnum"]);
    assert.deepStrictEqual(result.typeExports, []);
  });
});
