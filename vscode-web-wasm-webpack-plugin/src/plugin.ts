/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, modified by Aur Saraf
*/

import { RuntimeGlobals, Template } from "webpack";
import * as webpack from "webpack";

/** @typedef {import("webpack/Compiler")} Compiler */

class VsCodeAsyncWasmLoadingRuntimeModule extends webpack.RuntimeModule {
  generateLoadBinaryCode: (path: string) => string;
  constructor(generateLoadBinaryCode: (path: string) => string) {
    super("wasm loading", webpack.RuntimeModule.STAGE_NORMAL);
    this.generateLoadBinaryCode = generateLoadBinaryCode;
  }

  generate(): string {
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

export class ReadFileVsCodeWebCompileAsyncWasmPlugin {
  _type: string;
  constructor(type = "async-vscode") {
    this._type = type;
  }
  apply(compiler: webpack.Compiler) {
    try {
      webpack.wasm.EnableWasmLoadingPlugin.setEnabled(compiler, this._type);
    } catch (e) {
      throw new Error(
        "Problem calling webpack.wasm.EnableWasmLoadingPlugin.setEnabled(), are you sure you're running the patched version (or a newer version that accepted the PR that still doesn't exist as of the writing of this error message)?: " +
          (e as Error).toString()
      );
    }
    compiler.hooks.thisCompilation.tap(
      "ReadFileVsCodeWebCompileAsyncWasmPlugin",
      (compilation) => {
        const { outputOptions, runtimeTemplate } = compilation;
        const globalWasmLoading = outputOptions.wasmLoading;
        const isEnabledForChunk = (chunk: webpack.Chunk) => {
          const options = chunk.getEntryOptions();
          const wasmLoading =
            options && options.wasmLoading !== undefined
              ? options.wasmLoading
              : globalWasmLoading;
          return wasmLoading === this._type;
        };
        const generateLoadBinaryCode = (wasmModulePath: string) =>
          Template.asString([
            "var wasmPath = __webpack_require__.p + wasmModuleHash + '.module.wasm';",
            `var req = wasmPath.startsWith('http') ? fetch(wasmPath).then(${runtimeTemplate.returningFunction(
              "x.arrayBuffer()",
              "x"
            )}) : vscode.workspace.fs.readFile(vscode.Uri.file(wasmPath));`,
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
              new VsCodeAsyncWasmLoadingRuntimeModule(generateLoadBinaryCode)
            );
          });
      }
    );
  }
}
