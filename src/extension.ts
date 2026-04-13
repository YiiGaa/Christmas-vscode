// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DepNodeProvider } from './base/nodeDependencies';
import * as path from 'path';
import * as base from './base/base';
import * as lang from './load/lang'
import * as fs from 'fs';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

export let client: LanguageClient;
let isXmas = false;
let serverModule:any = null;
let nodeDependenciesProvider:any = null;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	//*****Follow is base progrom****//
	vscode.commands.executeCommand('setContext', 'viewEnabled', true);

	//STEP::Get editor lang
    lang.LangLoad(vscode.env.language);

	//STEP::Active menu
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	nodeDependenciesProvider = new DepNodeProvider(path.join(rootPath,'Christmas'));
	vscode.window.registerTreeDataProvider('christmas-menu', nodeDependenciesProvider);

	//STEP::Listen refresh button
	let disposable = vscode.commands.registerCommand('Christmas.refresh', () => {
		reload();
	});
	context.subscriptions.push(disposable);

	//STEP::Listen line double click
	disposable = vscode.commands.registerCommand('Christmas.runDouble', (element) => {
		base.runChristmas_DoubleClick(element)
	});
	context.subscriptions.push(disposable);

	//STEP::Listen run button
	disposable = vscode.commands.registerCommand('Christmas.run', (element) => {
		base.runChristmas(element.task)
	});
	context.subscriptions.push(disposable);

	//STEP::Listen open button
	disposable = vscode.commands.registerCommand('Christmas.open', (element) => {
		base.openTargetFile(element)
	});
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('Christmas.config', (element) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath,'config.json')));
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

export function reload(){
	nodeDependenciesProvider.refresh();
	if(isXmas){
		if(client)
			client.stop();
		lspService();
	}
}

function lspService(){
	//STEP::Create LSP thread
    const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	const settingPath = path.join(rootPath, 'Christmas', 'Xmas.File.json');
	if(!fs.existsSync(settingPath)){
		return false;
	}
	
    const serverOptions: ServerOptions = {
        // run: { module: serverModule, transport: TransportKind.ipc },
        // debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } }
    };
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'christmas' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        },
        initializationOptions:{"lang":vscode.env.language, "root":rootPath, "ide":"vscode"},
        markdown: {
            isTrusted: true,
            supportHtml: true
        }
    };

    client = new LanguageClient(
        'christmasLanguageServer',
        'Language Support for Christmas',
        serverOptions,
        clientOptions
    );
    client.start();
}

//TISP::This method is called when your extension is deactivated
export function deactivate() {
	if (!client) {
        return undefined;
    }
    return client.stop();
}

//TIPS::Open readme file
const triggerOpen = async function(filePath:string){
    try {
        const readmeUri = vscode.Uri.file(filePath);  
        await vscode.commands.executeCommand('markdown.showPreviewToSide', readmeUri, vscode.ViewColumn.Beside);
    } catch (err) {
        vscode.window.showErrorMessage(`${lang.LangGet("readme>>path")}${filePath}`);
    }
}
