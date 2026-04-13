import * as vscode from 'vscode';
import * as path from 'path';
import { readFile } from 'fs';
import * as JSON5 from 'json5'

let terminalId: Thenable<number | undefined> | undefined = undefined;
const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';

export const runChristmas = function(command:String){
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
    terminal.sendText(`python3 Christmas.py ${command.replace(/\\/g, "/")}`, true);
    terminal.show();
}

let lastClickTime = 0;
const doubleClickThreshold = 300;
export const runChristmas_DoubleClick = function(command:String) {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime < doubleClickThreshold) {
        runChristmas(command);
    }
    lastClickTime = currentTime;
}

export const openTargetFile = function(element:any){
    if(element.targetFile === ""){
        //STEP::Try tp get real target file path
        readFile(path.join(element.rootPath,'config.json'), 'utf-8', (err, jsonData) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }
            const data = JSON5.parse(jsonData);

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