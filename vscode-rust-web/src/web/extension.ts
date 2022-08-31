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
        vscode.window.showInformationMessage(rust.greet());
      });
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
