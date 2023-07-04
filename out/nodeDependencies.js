"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = exports.Menu = exports.DepNodeProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class DepNodeProvider {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No Menu in empty workspace');
            return Promise.resolve([]);
        }
        if (element) {
            const list = this.readDirectory(path.join(this.workspaceRoot, 'Input', element.label));
            const result = [];
            for (const temp of list) {
                const rootPath = path.join(this.workspaceRoot, 'Input', element.label, temp);
                result.push(new Task(temp, vscode.TreeItemCollapsibleState.None, rootPath, `${path.join('Input', element.label, temp)}`, { command: 'Christmas.open', title: '', arguments: [rootPath] }));
            }
            return Promise.resolve(result);
        }
        else {
            const list = this.readDirectory(path.join(this.workspaceRoot, 'Input'));
            const result = [];
            for (const temp of list) {
                result.push(new Menu(temp, vscode.TreeItemCollapsibleState.Collapsed));
            }
            return Promise.resolve(result);
        }
    }
    readDirectory(url) {
        const list = [];
        const files = fs.readdirSync(url);
        for (const file of files) {
            var stats = fs.statSync(path.join(url, file));
            if (stats.isDirectory()) {
                list.push(file);
            }
        }
        return list;
    }
}
exports.DepNodeProvider = DepNodeProvider;
class Menu extends vscode.TreeItem {
    constructor(label, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
    }
}
exports.Menu = Menu;
class Task extends vscode.TreeItem {
    constructor(label, collapsibleState, rootPath, task, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.rootPath = rootPath;
        this.task = task;
        this.command = command;
        this.iconPath = {
            light: path.join(__filename, '../', '../', 'resources', 'light', 'circle-outline.svg'),
            dark: path.join(__filename, '../', '../', 'resources', 'dark', 'circle-outline.svg')
        };
        this.contextValue = 'task';
        this.tooltip = this.label;
    }
}
exports.Task = Task;
//# sourceMappingURL=nodeDependencies.js.map