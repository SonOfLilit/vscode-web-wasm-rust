// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  __webpack_public_path__ =
    context.extensionUri.toString().replace("file:///", "") + "/dist/web/";

  let disposable = vscode.commands.registerCommand(
    "vscode-rust-web.helloWorld",
    () => {
      require("rust-wasm").then((rust: any) => {
        console.log("imported", rust);
        console.log("imported transpile", rust.transpile);
        vscode.window.showInformationMessage(rust.greet());
        /*
        let wasmModuleHash = () => {
          var vscode = require("vscode");
          var wasmPath =
            __webpack_require__.p + "" + wasmModuleHash + ".module.wasm";
          console.log("reading from", wasmPath);
          var req = vscode.workspace.fs.readFile(vscode.Uri.file(wasmPath));
          return req
            .then((bytes) => WebAssembly.instantiate(bytes, importsObj))
            .then((res) => Object.assign(exports, res.instance.exports));
        }; */
      });
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
