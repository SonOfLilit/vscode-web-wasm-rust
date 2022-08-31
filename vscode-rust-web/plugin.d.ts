export = ReadFileVSCodeWebCompileAsyncWasmPlugin;
/** @typedef {import("webpack/Compiler")} Compiler */
type ReadFileOptions = {
  type?: string;
  import?: boolean;
};
declare class ReadFileVSCodeWebCompileAsyncWasmPlugin {
  constructor(options?: ReadFileOptions);
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
