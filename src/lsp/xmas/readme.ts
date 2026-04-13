//import * as vscode from 'vscode';
import * as pathLib from 'path';
// import * as setting from '../load/setting'
import * as lang from '../../load/lang'
import * as process from '../process'

function EscapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function GetStringValue(value: any): string {
    if (typeof value === 'string')
        return value;
    return "";
}

function GetWhitespace(str: string): number {
    const match = str.match(/^\s*/);
    return match ? match[0].length : 0;
}

let rootPath = "";

//TIPS::Init/Clean setting
let setting: any = {};
let nodeCheck: any = {};
let currentSet: any = null;
let currentNode: any = null;
let currentUri: any = "";
export const Clean = function () { setting = {}; currentSet = null; nodeCheck ={}; currentNode =null; currentUri = "";}
export const Init = function (target: string, Xmas_setting: any, path: string, ide: string) {
    //STEP::Clean setting
    setting[target] = {};
    nodeCheck[target] = null;
    const pointer = setting[target];
    rootPath = path;

    //STEP::Deal node
    const nodeList = []
    for (const key in Xmas_setting) {
        if (key.length > 1)
            continue;
        nodeList.push(key)
        const Xmas_readme = Xmas_setting[key]?.Xmas_readme ?? "";
        if(!Array.isArray(Xmas_readme))
            continue;
        if(!(key in pointer))
            pointer[key] = [];
        
        for(const item of Xmas_readme){
            const node = GetStringValue(item.node)
            const line = GetStringValue(item.line)
            let tips = lang.LangText(item.tips)
            const paths = lang.LangText(item.path)
            if(tips===""&&paths==="")
                continue;
            if(paths!==""){
                let filePath = pathLib.join(rootPath, paths);
                switch(ide){
                    case 'vscode':
                        const args = [filePath];
                        filePath = `(command:xmas-language.openReadme?${encodeURIComponent(JSON.stringify(args))})`
                        break;
                    case 'jetbrains':
                        filePath = `(xmas://${filePath})`
                        break;
                    default:
                }

                tips = `${tips}<br><br>[${lang.LangGet("more")}]${filePath}`
            }

            const piece = {
                line: RegExp(line),
                node: RegExp(node),
                tips: tips,
                path: paths
            }
            pointer[key].push(piece);
        }
    }
    const escapedString = nodeList.map(EscapeRegExp).join('|');
    nodeCheck[target] = new RegExp(`^\\s*(${escapedString})`)
}

//TIPS::Change file
export const ChangeFile = function (path: any) {
    if (path === null) {
        currentSet = null;
        currentNode = null;
        currentUri = "";
        return;
    }
    for (const key in setting) {
        if ((new RegExp(key)).test(path)) {
            currentSet = setting[key]
            currentNode = nodeCheck[key];
            currentUri = path;
            return;
        }
    }
    currentUri = "";
    currentSet = null;
    currentNode = null;
}

//TIPS::Trigger show readme
// export const triggerHover: vscode.HoverProvider = {
//     provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
//         //STEP::Check language
//         const editor = vscode.window.activeTextEditor;
//         if (!editor || editor.document.languageId !== 'christmas')
//             return;

//         //STEP::Init handler
//         if(currentSet===null)
//             return undefined;
//         const currentLine = document.lineAt(position.line);

//         //STEP::Find node
//         let nodeText = ""
//         let nodeKey = "";
//         for(let index = currentLine.lineNumber; index >= 0; index--) {
//             const line = document.lineAt(index).text;
//             const result = currentNode.exec(line)
//             if(result){
//                 nodeText = line.trimStart();
//                 const match = result[0];
//                 nodeKey = match[match.length-1]
//                 break;
//             }
//         }
//         if(nodeText === "")
//             return undefined;

//         //STEP::Find match hint
//         const readmeLit = currentSet[nodeKey]
//         let readmeMark = null;
//         let lineMath:any = null;
//         let indent = GetWhitespace(currentLine.text)
//         const currentText = currentLine.text.trimStart()
//         for(const item of readmeLit){
//             lineMath = item.line.exec(currentText)
//             if(!lineMath)
//                 continue;
//             if(!item.node.test(nodeText))
//                 continue;
//             readmeMark = item;
//             break;
//         }
//         if(readmeMark === null)
//             return undefined;

//         //STEP::Get hint/path
//         let tips:any = readmeMark.tips
//         let path = readmeMark.path
//         const filePath = pathLib.join(rootPath, path);

//         //STEP::Show message
//         //const range = document.getWordRangeAtPosition(position, readmeMark.line);
//         const range = new vscode.Range(currentLine.lineNumber, indent+lineMath.index, currentLine.lineNumber, indent+lineMath.index+lineMath[0].length);
//         const args = [filePath];
//         const link = path === ""?"":`[${lang.LangGet("more")}](command:xmas-language.openReadme?${encodeURIComponent(JSON5.stringify(args))})`
//         const hoverMessage = new vscode.MarkdownString(`${tips}${link}`);
//         hoverMessage.isTrusted = true;
//         return new vscode.Hover(hoverMessage, range);
//     }
// }

export const Trigger = function(position:any){
    if(currentSet === null)
        return null

    //STEP::Get file text
    if(currentUri === "" || process.fileHouse[currentUri] === undefined)
        return [];
    const textList = process.fileHouse[currentUri].textList;

    //STEP::Get line
    let line = position.line
    let character = position.character
    if(line >= textList.length)
        return null
    let lineContent = textList[line].text;

    //STEP::Find node
    let nodeText = ""
    for(let index = line; index >= 0; index--) {
        if(textList[index].check === "node" ||
           textList[index].check === "root" ||
           textList[index].check === "leaf"){
            nodeText = textList[index].text
            break;
        }
        if(textList[index].check !== "init")
            continue;
        const tempText = textList[index].text
        if(currentNode.test(tempText)){
            nodeText = tempText
            break;
        }
    }
    if(nodeText === "")
        return null

    //STEP::Get node setting
    const nodeKey = nodeText[0]
    if(!(nodeKey in currentSet))
        return null;

    //STEP::Find match hint
    const readmeList = currentSet[nodeKey]
    let readmeMark = null;
    let lineMath:any = null;
    let indent = GetWhitespace(textList[line].origin)
    for(const item of readmeList){
        lineMath = item.line.exec(lineContent)
        if(!lineMath)
            continue;
        if(!item.node.test(nodeText))
            continue;
        readmeMark = item.tips;
        break;
    }
    if(readmeMark === null)
        return null;

    //STEP::Get range
    const range = {
        start: { "line": line, character: indent+lineMath.index },
        end : { "line": line, character : indent+lineMath.index+lineMath[0].length }
    }
    return {
        "content":readmeMark,
        "range":range
    }
}