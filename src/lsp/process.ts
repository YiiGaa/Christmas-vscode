import * as config from './check/config';
import * as checkHead from './check/head';
import * as checkNode from './check/node';
import * as service from './service';
import * as lang from '../load/lang';
import {connection} from './service';
import {
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticTag,
} from 'vscode-languageserver/node';
import { TextEncoder } from 'util';

//TIPS::Init textList
export let fileHouse:any = {}
let totalLength = 0;
const LIMIT = 100*1024*2024; //1024*1024=1MB
export const Init = function(text:any, uri:string, version:any, connection:any){
    //STEP::Init textList
    const lines = text.split('\n');
    fileHouse[uri] = {
        "version":version,
        "indexPointer":0,
        "isChecking":false,
        "isClose":false,
        "uri":uri,
        "length":text.length* 2, //TIPS::Estimate memory usage size
        "highlight":null,
        "textList":[]
    }
    const textList:any = []
    for(const line of lines){
        const piece = Init_Piece(line)
        textList.push(piece)
    }
    fileHouse[uri].textList = textList;

    //WHEN::Show warning when cache much file
    totalLength = totalLength + fileHouse[uri].length;
    if(LIMIT<totalLength){
        connection.window.showInformationMessage(lang.LangGet("lsp>>limit"))
    }
}
const Init_Piece = function(line:string){
    //STEP::Remove comment
    const origin = line
    let comment:any = []
    let inSingle = false;
    let inDouble = false;
    let i = 0;
    while (i < line.length) {
        const char = line[i];
        if (char === '\\' && (inSingle || inDouble)) {
            i += 2;
            continue;
        }
        if (inSingle) {
            if (char === "'") {
                inSingle = false;
            }
        } else if (inDouble) {
            if (char === '"') {
                inDouble = false;
            }
        } else {
            if (char === "'") {
                inSingle = true;
            } else if (char === '"') {
                inDouble = true;
            } else if (char === '#' && (i ===0 || line[i-1] ===" ")) {
                comment.push({
                    char:i,
                    length:line.length - i,
                    type:config.tokenTypes.indexOf("comment"),
                    modifiers:0
                })
                line = line.substring(0, i).trimEnd();
            }
        }
        i++;
    }

    //STEP::Get indent
    const match = origin.match(/^ */);
    const indent = match?match[0].length : 0;

    //line.replace(/(?<=^[^"']*(?:(?:"[^"]*"|'[^']*')[^"']*)*)\s#.*$/, "")
    return {
        "text":line.trim(),
        "check":"init",
        "origin":origin,
        "key":"",
        "indent":indent,
        "highlight":comment.length>0?[...comment]:[],
        "useless":false,
        "error":[],
        "hint":[],
        "template":{
            "allowParam":false,
            "allowNode":false,
            "param":[],
            "node":[]
        }
    }
}

//TIPS::Call stop processing
export const Close = function(uri:string){
    if(fileHouse[uri] === undefined)
        return;
    totalLength = totalLength - fileHouse[uri].length;
    if(fileHouse[uri].isChecking === false)
        delete fileHouse[uri];
    else{
        fileHouse[uri].isChecking = false;
        fileHouse[uri].isClose = true;
    }
}

//TIPS::Check
let isProcessing = false;
let checkList:any = []
let uriPorcess = ""
export const Check = function(pointer:number, uri:string, isChange=false){
    if(fileHouse[uri] === undefined)
        return;
    pointer = pointer>=0?pointer:0;
    fileHouse[uri].indexPointer = pointer>=0 && pointer<fileHouse[uri].indexPointer?pointer:fileHouse[uri].indexPointer;
    if(isChange && uriPorcess !== uri){
        if(checkList.includes(uri))
            checkList.splice(checkList.indexOf(uri), 1);
        fileHouse[uriPorcess].isChecking = false;
    }
    if(checkList.length===0 || !checkList.includes(uri)){
        checkList.unshift(uri)
    }
    if(isProcessing === false){
        isProcessing = true;
        Check_DO();
    }
}
async function Check_DO(){
    while(checkList.length>0){
        const uri = checkList[0];
        uriPorcess = uri;
        const target = fileHouse[uri];
        const textList = target.textList;
        let isCheckHead = target.indexPointer === 0? false: true
        target.isChecking = true;
        target.highlight = null;

        //STEP::Cheange config
        config.ChangeFile(uri)

        let index:number = target.indexPointer
        for(;index<textList.length;index++) {
            //STEP::Release thread
            target.indexPointer = index;
            if(target.isChecking === false){
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 0));
            if(target.indexPointer !== index)
                index=target.indexPointer;

            //STEP::Get line
            const line = textList[index];
            const lineText:string = line.text;

            //WHEN::No need deal
            if(line.check !== "init")
                continue;
            
            //WHEN::Empty line
            if(/^\s*$/.test(lineText)){
                line.check = "empty"
                continue;
            }

            //STEP::Check line
            if(config.currentNode==null){
                line.check="empty"
            }
            else if(config.currentNode!=null && config.currentNode.test(lineText)){
                if(!isCheckHead){
                    checkHead.Check(textList, index)
                    isCheckHead = true
                }
                checkNode.Check(textList, index, lineText.trim(), line.origin)
            } else {
                isCheckHead = true
                checkHead.Check(textList, index)
            }
        }

        //STEP::Chagne status
        isProcessing = false;
        target.isChecking = false;

        //WHEN::File is closed during check
        if(target.isClose === true){
            checkList.splice(checkList.indexOf(uri), 1);
            delete fileHouse[uri];
        } 
        //WHEN::Orther, send result
        else {
            service.SendResult(textList, target.uri);
        }

        //STEP::Remove from check list
        if(index === textList.length)
            checkList.splice(checkList.indexOf(uri), 1);
    }
}

//TIPS::Change text and restart check
export function Change(changes:any, uri:string, version:any){
    //STEP::Change textList
    let newPointer = 0;
    const target = fileHouse[uri];
    if(target === undefined)
        return;
    const textList = target.textList;
    target.version = version;
    for(let index = 0;index<changes.length;index++){
        //STEP-IN::Init change list
        const change:any = changes[index];
        const newList:any = []
        newPointer = change.range.start.line;
        const start = change.range.start
        const end = change.range.end
        const changeList = change.text.split('\n');
        const startText = textList[start.line].origin.substring(0, start.character)
        const endText = textList[end.line].origin.substring(end.character)
        changeList[0] = `${startText}${changeList[0]}`
        changeList[changeList.length-1] = changeList[changeList.length-1] + endText;
        for(const item of changeList){
            newList.push(Init_Piece(item))
        }

        //STEP::Clean check
        let newIndex = start.line-1;
        for(;newIndex>=0;newIndex--){
            if(textList[newIndex].check === "root"){
                textList[newIndex] = Init_Piece(textList[newIndex].origin)
                break;
            }
            textList[newIndex] = Init_Piece(textList[newIndex].origin)
        }
        newIndex = newIndex>=0?newIndex:0;
        newPointer = newPointer>newIndex?newIndex:newPointer;
        for(let index = end.line+1;index<textList.length;index++){
            if(textList[index].check === "root")
                break;
            textList[index] = Init_Piece(textList[index].origin)
        }

        //STEP-IN::Insert list into textList
        textList.splice(start.line, (end.line-start.line+1), ...newList)
    }
    
    //STEP::Start check
    Check(newPointer,uri,true);
}

//TIPS::Get error list
function EscapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export const GetResult = function(textList:any){
    //STEP::Get error/waring list
    const diagnostics: Diagnostic[] = [];
    const rootRepeat:any = []
    let index = 0;
    const rootDefine:any = {}
    const recheck:any = []
    for(const item of textList){
        //WHEN-IN::Check root repeat
        if("node-repeat" in item){
            if(rootRepeat.includes(item["node-repeat"])){
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start: { line: index, character: 0 },
                        end: { line: index, character: item.origin.length } 
                    },
                    message: lang.LangGet("check>>node>>root repeat")
                });
            } else {
                rootRepeat.push(item["node-repeat"])
            }
        }
        //WHEN-IN::Get all root define
        if("node-define" in item){
            const value = item["node-define"]
            const key = item["key"]
            if(!(key in rootDefine))
                rootDefine[key] = []
            rootDefine[key].push(value)
        }
        //WHEN-IN::Need to check with root define
        if("check-param" in item){
            recheck.push(index)
        }
        //STEP::Mark useless line
        if(item.useless === true && item.check != "empty"){
            diagnostics.push({
                range: {
                    start: { line: index, character: 0 },
                    end: { line: index, character: item.origin.length } 
                },
                message: lang.LangGet("check>>node>>useless"), 
                severity: DiagnosticSeverity.Warning,
                //tags: [DiagnosticTag.Unnecessary]
            })
        }
        //STEP::Convert error list
        if(item.error.length>0){
            for(const item_error of item.error){
                diagnostics.push({
                    severity: item_error.level==="warn"?DiagnosticSeverity.Warning:DiagnosticSeverity.Error,
                    range: {
                        start: { line: index, character: item_error.start },
                        end: { line: index, character: item_error.end } 
                    },
                    message: item_error.text
                });
            }
        }
        index++;
    }

    //STEP::Recheck with root define
    for(const index of recheck){
        const item = textList[index]
        let isPass = false;
        for(const item_check of item["check-param"]){
            if(!(item_check[1] in rootDefine))
                continue;
            const define=rootDefine[item_check[1]]
            const checkList:any=[]
            for(const item_define of define){
                const match = item_define.match(item_check[2])
                if(!match)
                    continue;
                for(let i=0;i<match.length;i++){
                    if(checkList.length<=i)
                        checkList.push([])
                    checkList[i].push(match[i])
                }
            }
            if(checkList.length===0)
                continue;
            let regex = item_check[0]
            for(let i=0;i<checkList.length;i++){
                const escapedString = checkList[i].map(EscapeRegExp).join('|');
                regex = regex.replaceAll(`${config.currentSign}${i}`, escapedString)
            }
            if((new RegExp(regex)).test(item.text.trim())){
                isPass = true;
                break;
            }
        }
        if(!isPass){
            const errorTips = item["check-errorTips"]
            diagnostics.push({
                severity: errorTips.level==="warn"?DiagnosticSeverity.Warning:DiagnosticSeverity.Error,
                range: {
                    start: { line: index, character: errorTips.start },
                    end: { line: index, character: errorTips.end } 
                },
                message: errorTips.text
            });
        }
    }
    return [diagnostics, rootDefine];
}

//TIPS::Get highlight result
export const GetHighLight = async function(range:any, uri:string){
    //STEP::Wait check done
    while(true){
        if(fileHouse[uri] === undefined)
            return [];
        if(!checkList.includes(uri))
            break;
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    //STEP::Get range
    const target = fileHouse[uri];
    if(target === undefined)
        return [];

    //STEP::Try cache
    if(range === -1 && target.highlight !== null){
        return target.highlight;
    }

    //STEP::Get handler
    const textList = target.textList;
    const start = range===-1?0:range.start.line;
    const end = range===-1?textList.length:range.end.line;
    let prevLine = 0;
    let prevChar = 0;

    //STEP::Get highlight list
    const result:any = [];
    for (let index =0;index<textList.length;index++){
        if(index<start)
            continue;
        if(index>end)
            break;

        for(const item of textList[index].highlight){
            const deltaLine = index - prevLine;
            const deltaChar = deltaLine === 0 ? item.char - prevChar : item.char;
            result.push(deltaLine, deltaChar, item.length, item.type, item.modifiers);
            prevLine = index;
            prevChar = item.char;
        }
    }

    //STEP::Cache highlight result
    if(range === -1)
        target.highlight = result

    return result;
}
