// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DepNodeProvider, Menu } from './nodeDependencies';
import * as path from 'path';

let terminalId: Thenable<number | undefined> | undefined = undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'viewEnabled', true);
	// if(vscode.env.language === "zh-cn"){
	// 	vscode.window.showInformationMessage('你好，更多 Christmas 信息请访问 https://stoprefactoring.com。');
	// } else {
	// 	vscode.window.showInformationMessage('Hi, for more Christmas info please visit https://stoprefactoring.com.');
	// }

	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
	const nodeDependenciesProvider = new DepNodeProvider(path.join(rootPath,'Christmas'));
	vscode.window.registerTreeDataProvider('christmas-menu', nodeDependenciesProvider);

	let disposable = vscode.commands.registerCommand('Christmas.refresh', () => {
		nodeDependenciesProvider.refresh();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('Christmas.run', (element) => {
		let terminal = undefined;
		if(terminalId){
			for(const list of vscode.window.terminals){
				if(terminalId === list.processId){
					terminal = list;
					terminal.dispose();
					terminal = undefined;
					break;
				}
			}
		}
		if(!terminal){
			terminal = vscode.window.createTerminal({
				name:"Christmas",
				cwd:path.join(rootPath,'Christmas'),
				isTransient:true,
				hideFromUser:true
			});
			terminalId = terminal.processId;
		}
		terminal.sendText('clear', true);
		terminal.sendText(`python3 Christmas.py ${element.task}`, true);
		terminal.show();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('Christmas.open', (url) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(url,'target.json')));
	});
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('Christmas.config', (element) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath,'config.json')));
	});
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
