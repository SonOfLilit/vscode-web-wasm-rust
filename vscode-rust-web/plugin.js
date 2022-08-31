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
  constructor({ generateLoadBinaryCode, supportsStreaming }) {
    super("wasm loading", webpack.RuntimeModule.STAGE_NORMAL);
    this.generateLoadBinaryCode = generateLoadBinaryCode;
    this.supportsStreaming = supportsStreaming;
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
        `var req = ${this.generateLoadBinaryCode(wasmModuleSrcPath)};`,
        this.supportsStreaming
          ? Template.asString([
              "if (typeof WebAssembly.instantiateStreaming === 'function') {",
              Template.indent([
                "return WebAssembly.instantiateStreaming(req, importsObj)",
                Template.indent([
                  `.then(${runtimeTemplate.returningFunction(
                    "Object.assign(exports, res.instance.exports)",
                    "res"
                  )});`,
                ]),
              ]),
              "}",
            ])
          : "// no support for streaming compilation",
        "return req",
        Template.indent([
          `.then(${runtimeTemplate.returningFunction("x.arrayBuffer()", "x")})`,
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
  constructor({ type = "async-vscode", import: useImport = false } = {}) {
    this._type = type;
    this._import = useImport;
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
        const generateLoadBinaryCode = this._import
          ? (path) =>
              Template.asString([
                "Promise.all([import('fs'), import('url')]).then(([{ readFile }, { URL }]) => new Promise((resolve, reject) => {",
                Template.indent([
                  `readFile(new URL(${path}, import.meta.url), (err, buffer) => {`,
                  Template.indent([
                    "if (err) return reject(err);",
                    "",
                    "// Fake fetch response",
                    "resolve({",
                    Template.indent(["arrayBuffer() { return buffer; }"]),
                    "});",
                  ]),
                  "});",
                ]),
                "}))",
              ])
          : (path) =>
              Template.asString([
                "new Promise(function (resolve, reject) {",
                Template.indent([
                  "try {",
                  Template.indent([
                    "var { readFile } = require('fs');",
                    "var { join } = require('path');",
                    "",
                    `readFile(join(__dirname, ${path}), function(err, buffer){`,
                    Template.indent([
                      "if (err) return reject(err);",
                      "",
                      "// Fake fetch response",
                      "resolve({",
                      Template.indent(["arrayBuffer() { return buffer; }"]),
                      "});",
                    ]),
                    "});",
                  ]),
                  "} catch (err) { reject(err); }",
                ]),
                "})",
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
                supportsStreaming: false,
              })
            );
          });
      }
    );
  }
}

module.exports = ReadFileVsCodeWebCompileAsyncWasmPlugin;
