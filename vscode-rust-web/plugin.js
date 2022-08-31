/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, modified by Aur Saraf
*/

"use strict";

const webpack = require("webpack");
const RuntimeGlobals = webpack.RuntimeGlobals;
const Template = webpack.Template;

/** @typedef {import("webpack/Compiler")} Compiler */

class VsCodeAsyncWasmLoadingRuntimeModule extends webpack.RuntimeModule {
  constructor({ generateLoadBinaryCode }) {
    super("wasm loading", webpack.RuntimeModule.STAGE_NORMAL);
    this.generateLoadBinaryCode = generateLoadBinaryCode;
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    const { compilation, chunk } = this;
    const { outputOptions, runtimeTemplate } = compilation;
    const fn = RuntimeGlobals.instantiateWasm;
    const wasmModuleSrcPath = compilation.getPath(
      JSON.stringify(outputOptions.webassemblyModuleFilename),
      {
        hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
        hashWithLength: (length) =>
          `" + ${RuntimeGlobals.getFullHash}}().slice(0, ${length}) + "`,
        module: {
          id: '" + wasmModuleId + "',
          hash: `" + wasmModuleHash + "`,
          hashWithLength(length) {
            return `" + wasmModuleHash.slice(0, ${length}) + "`;
          },
        },
        runtime: chunk.runtime,
      }
    );
    return `${fn} = ${runtimeTemplate.basicFunction(
      "exports, wasmModuleId, wasmModuleHash, importsObj",
      [
        "var vscode = require('vscode');",
        `${this.generateLoadBinaryCode(wasmModuleSrcPath)};`,
        "return req",
        Template.indent([
          `.then(${runtimeTemplate.returningFunction(
            "WebAssembly.instantiate(bytes, importsObj)",
            "bytes"
          )})`,
          `.then(${runtimeTemplate.returningFunction(
            "Object.assign(exports, res.instance.exports)",
            "res"
          )});`,
        ]),
      ]
    )};`;
  }
}

class ReadFileVsCodeWebCompileAsyncWasmPlugin {
  constructor(type = "async-vscode") {
    this._type = type;
  }
  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    webpack.wasm.EnableWasmLoadingPlugin.setEnabled(compiler, this._type);
    compiler.hooks.thisCompilation.tap(
      "ReadFileVsCodeWebCompileAsyncWasmPlugin",
      (compilation) => {
        const globalWasmLoading = compilation.outputOptions.wasmLoading;
        const isEnabledForChunk = (chunk) => {
          const options = chunk.getEntryOptions();
          const wasmLoading =
            options && options.wasmLoading !== undefined
              ? options.wasmLoading
              : globalWasmLoading;
          return wasmLoading === this._type;
        };
        const generateLoadBinaryCode = (path) =>
          Template.asString([
            "var wasmPath = __webpack_require__.p + wasmModuleHash + '.module.wasm';",
            "var req = vscode.workspace.fs.readFile(vscode.Uri.file(wasmPath));",
          ]);

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.instantiateWasm)
          .tap("ReadFileVsCodeWebCompileAsyncWasmPlugin", (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            const chunkGraph = compilation.chunkGraph;
            if (
              !chunkGraph.hasModuleInGraph(
                chunk,
                (m) => m.type === "webassembly/async"
              )
            ) {
              return;
            }
            set.add(RuntimeGlobals.publicPath);
            compilation.addRuntimeModule(
              chunk,
              new VsCodeAsyncWasmLoadingRuntimeModule({
                generateLoadBinaryCode,
              })
            );
          });
      }
    );
  }
}

module.exports = ReadFileVsCodeWebCompileAsyncWasmPlugin;
