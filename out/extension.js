"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.reload = exports.activate = exports.client = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const nodeDependencies_1 = require("./base/nodeDependencies");
const path = require("path");
const base = require("./base/base");
const lang = require("./load/lang");
const fs = require("fs");
const node_1 = require("vscode-languageclient/node");
let isXmas = false;
let serverModule = null;
let nodeDependenciesProvider = null;
// This method is called when your extension is activated
function activate(context) {
    //*****Follow is base progrom****//
    vscode.commands.executeCommand('setContext', 'viewEnabled', true);
    //STEP::Get editor lang
    lang.LangLoad(vscode.env.language);
    //STEP::Active menu
    const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    nodeDependenciesProvider = new nodeDependencies_1.DepNodeProvider(path.join(rootPath, 'Christmas'));
    vscode.window.registerTreeDataProvider('christmas-menu', nodeDependenciesProvider);
    //STEP::Listen refresh button
    let disposable = vscode.commands.registerCommand('Christmas.refresh', () => {
        reload();
    });
    context.subscriptions.push(disposable);
    //STEP::Listen line double click
    disposable = vscode.commands.registerCommand('Christmas.runDouble', (element) => {
        base.runChristmas_DoubleClick(element);
    });
    context.subscriptions.push(disposable);
    //STEP::Listen run button
    disposable = vscode.commands.registerCommand('Christmas.run', (element) => {
        base.runChristmas(element.task);
    });
    context.subscriptions.push(disposable);
    //STEP::Listen open button
    disposable = vscode.commands.registerCommand('Christmas.open', (element) => {
        base.openTargetFile(element);
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('Christmas.config', (element) => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath, 'config.json')));
    });
    context.subscriptions.push(disposable);
    //*****Follow is Xmas support****//
    //STEP::Load settings
    isXmas = true;
    //STEP::Listen readme link
    const eventReadmeOpen = vscode.commands.registerCommand('xmas-language.openReadme', triggerOpen);
    context.subscriptions.push(eventReadmeOpen);
    //STEP::Create LSP thread
    serverModule = context.asAbsolutePath(path.join('out', 'lsp', 'service.js'));
    lspService();
}
exports.activate = activate;
function reload() {
    nodeDependenciesProvider.refresh();
    if (isXmas) {
        if (exports.client)
            exports.client.stop();
        lspService();
    }
}
exports.reload = reload;
function lspService() {
    //STEP::Create LSP thread
    const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    const settingPath = path.join(rootPath, 'Christmas', 'Xmas.File.json');
    if (!fs.existsSync(settingPath)) {
        return false;
    }
    const serverOptions = {
        // run: { module: serverModule, transport: TransportKind.ipc },
        // debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: { module: serverModule, transport: node_1.TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'christmas' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        },
        initializationOptions: { "lang": vscode.env.language, "root": rootPath, "ide": "vscode" },
        markdown: {
            isTrusted: true,
            supportHtml: true
        }
    };
    exports.client = new node_1.LanguageClient('christmasLanguageServer', 'Language Support for Christmas', serverOptions, clientOptions);
    exports.client.start();
}
//TISP::This method is called when your extension is deactivated
function deactivate() {
    if (!exports.client) {
        return undefined;
    }
    return exports.client.stop();
}
exports.deactivate = deactivate;
//TIPS::Open readme file
const triggerOpen = async function (filePath) {
    try {
        const readmeUri = vscode.Uri.file(filePath);
        await vscode.commands.executeCommand('markdown.showPreviewToSide', readmeUri, vscode.ViewColumn.Beside);
    }
    catch (err) {
        vscode.window.showErrorMessage(`${lang.LangGet("readme>>path")}${filePath}`);
    }
};
//# sourceMappingURL=extension.js.map