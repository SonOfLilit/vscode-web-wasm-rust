export = ReadFileVSCodeWebCompileAsyncWasmPlugin;
/** @typedef {import("webpack/Compiler")} Compiler */
declare class ReadFileVSCodeWebCompileAsyncWasmPlugin {
  constructor(type?: string);
  _type: string;
  _import: boolean;
  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler: any): void;
}
declare namespace ReadFileVSCodeWebCompileAsyncWasmPlugin {
  export { Compiler };
}
type Compiler = any;
//# sourceMappingURL=plugin.d.ts.map
