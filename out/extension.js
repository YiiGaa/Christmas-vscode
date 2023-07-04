"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const nodeDependencies_1 = require("./nodeDependencies");
const path = require("path");
let terminalId = undefined;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    vscode.commands.executeCommand('setContext', 'viewEnabled', true);
    // if(vscode.env.language === "zh-cn"){
    // 	vscode.window.showInformationMessage('你好，更多 Christmas 信息请访问 https://stoprefactoring.com。');
    // } else {
    // 	vscode.window.showInformationMessage('Hi, for more Christmas info please visit https://stoprefactoring.com.');
    // }
    const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    const nodeDependenciesProvider = new nodeDependencies_1.DepNodeProvider(path.join(rootPath, 'Christmas'));
    vscode.window.registerTreeDataProvider('christmas-menu', nodeDependenciesProvider);
    let disposable = vscode.commands.registerCommand('Christmas.refresh', () => {
        nodeDependenciesProvider.refresh();
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('Christmas.run', (element) => {
        let terminal = undefined;
        if (terminalId) {
            for (const list of vscode.window.terminals) {
                if (terminalId === list.processId) {
                    terminal = list;
                    terminal.dispose();
                    terminal = undefined;
                    break;
                }
            }
        }
        if (!terminal) {
            terminal = vscode.window.createTerminal({
                name: "Christmas",
                cwd: path.join(rootPath, 'Christmas'),
                isTransient: true,
                hideFromUser: true
            });
            terminalId = terminal.processId;
        }
        terminal.sendText('clear', true);
        terminal.sendText(`python3 Christmas.py ${element.task}`, true);
        terminal.show();
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('Christmas.open', (url) => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(url, 'target.json')));
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('Christmas.config', (element) => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath, 'config.json')));
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map