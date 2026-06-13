"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openTargetFile = exports.runChristmas_DoubleClick = exports.runChristmas = void 0;
const vscode = require("vscode");
const path = require("path");
const fs_1 = require("fs");
const JSON5 = require("json5");
let terminalId = undefined;
const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
    ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
const runChristmas = function (command) {
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
    terminal.sendText(`python3 Christmas.py ${command.replace(/\\/g, "/")}`, true);
    terminal.show();
};
exports.runChristmas = runChristmas;
let lastClickTime = 0;
const doubleClickThreshold = 300;
const runChristmas_DoubleClick = function (command) {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime < doubleClickThreshold) {
        (0, exports.runChristmas)(command);
    }
    lastClickTime = currentTime;
};
exports.runChristmas_DoubleClick = runChristmas_DoubleClick;
const openTargetFile = function (element) {
    if (element.targetFile === "") {
        //STEP::Try tp get real target file path
        (0, fs_1.readFile)(path.join(element.rootPath, 'config.json'), 'utf-8', (err, jsonData) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }
            const data = JSON5.parse(jsonData);
            //WHEN::Setting other place
            if ("targetFile" in data) {
                element.targetFile = path.join(rootPath, 'Christmas', data["targetFile"]);
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(rootPath, 'Christmas', data["targetFile"])));
            }
            //WHEN::Normal path
            else {
                element.targetFile = path.join(element.rootPath, 'target.json');
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath, 'target.json')));
            }
        });
    }
    else {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(element.targetFile));
    }
};
exports.openTargetFile = openTargetFile;
//# sourceMappingURL=base.js.map