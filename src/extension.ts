// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DepNodeProvider, Menu } from './nodeDependencies';
import * as path from 'path';
import { readFile } from 'fs';

let terminalId: Thenable<number | undefined> | undefined = undefined;
const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : '';

function runChristmas(command:String){
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
		terminal.sendText(`python3 Christmas.py ${command}`, true);
		terminal.show();
}

let lastClickTime = 0;
const doubleClickThreshold = 300;
function runChristmas_DoubleClick(command:String) {
	const currentTime = new Date().getTime();
	if (currentTime - lastClickTime < doubleClickThreshold) {
		runChristmas(command);
	}
	lastClickTime = currentTime;
}

function openTargetFile(element:any){
	if(element.targetFile === ""){
		//STEP::Try tp get real target file path
		readFile(path.join(element.rootPath,'config.json'), 'utf-8', (err, jsonData) => {
			if (err) {
				console.error('Error reading file:', err);
				return;
			}
			const data = JSON.parse(jsonData);

			//WHEN::Setting other place
			if("targetFile" in data){
				element.targetFile = path.join(rootPath,'Christmas',data["targetFile"]);
				vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(rootPath,'Christmas',data["targetFile"])));
			}
			//WHEN::Normal path
			else{
				element.targetFile = path.join(element.rootPath,'target.json');
				vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath,'target.json')));
			}
		});
	}else{
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(element.targetFile))
	}
}

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

	disposable = vscode.commands.registerCommand('Christmas.runDouble', (element) => {
		runChristmas_DoubleClick(element)
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('Christmas.run', (element) => {
		runChristmas(element.task)
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('Christmas.open', (element) => {
		openTargetFile(element)
	});
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('Christmas.config', (element) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(element.rootPath,'config.json')));
	});
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
