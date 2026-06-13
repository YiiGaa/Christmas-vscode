"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trigger = exports.ChangeFile = exports.Init = exports.Clean = void 0;
//import * as vscode from 'vscode';
const process = require("../process");
function Trigger_EscapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function Trigger_LeadingWhitespace(str) {
    const match = str.match(/^\s*/);
    return match ? match[0].length : 0;
}
//TIPS::Setting init/Clean
let setting = {};
let currentSet = null;
let tab = {};
let currentTab = null;
let currentUri = "";
const Clean = function () { setting = {}; currentSet = null; tab = {}; currentTab = null; currentUri = ""; };
exports.Clean = Clean;
const Init = function (target, Xmas_setting, Xmas_tab) {
    //STEP::Clean setting
    setting[target] = {};
    const pointer = setting[target];
    //STEP::Set tab
    tab[target] = Xmas_tab;
    //STEP::Deal node
    for (const key in Xmas_setting) {
        if (key.length > 1)
            continue;
        const Xmas_node = Xmas_setting[key]?.Xmas_node ?? "";
        let node = "unknow";
        let pair = [];
        //WHEN-IN::String mode
        if (Xmas_node === "node" || Xmas_node === "root" || Xmas_node === "leaf")
            node = Xmas_node;
        //WHEN-IN::Array mode, means "node pair" setting
        else if (Array.isArray(Xmas_node)) {
            for (const item of Xmas_node) {
                if (Object.prototype.toString.call(item) === '[object Object]' && !Array.isArray(item)) {
                    if (!("line" in item && typeof item.line === "string" &&
                        "match" in item && typeof item.match === "string"))
                        continue;
                    const temp = {
                        "line": RegExp(item.line),
                        "match": RegExp(item.match),
                    };
                    pair.push(temp);
                }
            }
            if (pair.length > 0)
                node = "node";
        }
        //WHEN-IN::Array mode, means "root" setting
        else if (Object.prototype.toString.call(Xmas_node) === '[object Object]' && !Array.isArray(Xmas_node)) {
            if ("repeat" in Xmas_node || "define" in Xmas_node)
                node = "root";
        }
        //STEP-IN::Check node
        if (node === "unknow")
            continue;
        //STEP-IN::Mark node setting
        pointer[key] = {
            node: node,
            pair: pair,
            regex: RegExp("\\s*" + Trigger_EscapeRegExp(key))
        };
    }
};
exports.Init = Init;
//TIPS::Change file
const ChangeFile = function (path) {
    if (path === null) {
        currentSet = null;
        currentTab = null;
        return;
    }
    for (const key in setting) {
        if ((new RegExp(key)).test(path)) {
            currentSet = setting[key];
            currentTab = tab[key];
            currentUri = path;
            return;
        }
    }
    currentUri = "";
    currentTab = null;
    currentSet = null;
};
exports.ChangeFile = ChangeFile;
//TIPS::Trigger new line
const TriggerLine = function (changeText, change, textList) {
    //STEP::Init handler
    const tabSize = currentTab;
    const lastText = textList[change.range.start.line].origin;
    const lastAlign = Trigger_LeadingWhitespace(lastText);
    const newText = changeText.replace(/[ ]+$/, '') + ' '.repeat(lastAlign + tabSize);
    const lineAlign = (changeText.substring(changeText.replace(/[ ]+$/, '').length)).length;
    //STEP::New line
    for (const sign in currentSet) {
        if (currentSet[sign].regex.test(lastText)) {
            return {
                "newText": newText,
                "range": {
                    "start": { line: change.range.start.line, character: change.range.start.character },
                    "end": { line: change.range.start.line + 1, character: lineAlign }
                }
            };
        }
    }
    if (/\: $/.test(lastText)) {
        return {
            "newText": newText,
            "range": {
                "start": { line: change.range.start.line, character: change.range.start.character },
                "end": { line: change.range.start.line + 1, character: lineAlign }
            }
        };
    }
    if (/^\s+- /.test(lastText)) {
        return {
            "newText": ' '.repeat(lastAlign) + "- ",
            "range": {
                "start": { line: change.range.start.line + 1, character: 0 },
                "end": { line: change.range.start.line + 1, character: lineAlign }
            }
        };
    }
    return;
};
//TIPS::Trigger yaml
const TriggerYaml = function (currentLine, change, textList) {
    //STEP::Init handler
    let currentContent = currentLine.trim();
    const tabSize = currentTab;
    //WHEN::Yaml key:
    if (currentLine.endsWith(":")) {
        for (const sign in currentSet) {
            if (currentSet[sign].regex.test(currentLine))
                return;
        }
        return {
            "newText": ": ",
            "range": {
                "start": { line: change.range.start.line, character: change.range.end.character },
                "end": { line: change.range.start.line, character: change.range.end.character + 1 }
            }
        };
    }
    //WHEN::Change '-  ' to '  '
    if (currentLine.endsWith('-  ')) {
        return {
            "newText": "  ",
            "range": {
                "start": { line: change.range.start.line, character: change.range.end.character - 2 },
                "end": { line: change.range.start.line, character: change.range.end.character + 1 }
            }
        };
    }
    //WHEN::Change '-' to '- '
    if (currentContent === '-') {
        const currentAlign = Trigger_LeadingWhitespace(currentLine);
        for (let index = change.range.start.line - 1; index >= 0; index--) {
            const line = textList[index].origin;
            const lineAlign = Trigger_LeadingWhitespace(line);
            if (change.range.start.line - 1 === index && /\: *$/.test(line)) {
                return {
                    "newText": ' '.repeat(lineAlign + tabSize) + '- ',
                    "range": {
                        "start": { line: change.range.start.line, character: 0 },
                        "end": { line: change.range.start.line, character: change.range.end.character + 1 }
                    }
                };
            }
            if (lineAlign > currentAlign)
                continue;
            for (const sign in currentSet) {
                if (currentSet[sign].regex.test(line)) {
                    return;
                }
            }
            if (/\s*- /.test(line)) {
                return {
                    "newText": ' '.repeat(lineAlign) + '- ',
                    "range": {
                        "start": { line: change.range.start.line, character: 0 },
                        "end": { line: change.range.start.line, character: change.range.end.character + 1 }
                    }
                };
            }
        }
        return;
    }
};
//TIPS::Check change(text)
const Trigger = function (change) {
    //STEP::Get file text
    if (currentUri === "" || process.fileHouse[currentUri] === undefined)
        return [];
    const textList = process.fileHouse[currentUri].textList;
    //WHEN::Need to change yaml new line
    const changeText = change.text;
    if (/^(\r?\n)\s*$/.test(changeText))
        return TriggerLine(changeText, change, textList);
    //STEP::Get text
    if (changeText.length !== 1)
        return;
    const start = change.range.start;
    const end = change.range.end;
    const linePrefix = textList[start.line].origin.substring(0, start.character) + changeText;
    const currentLine = linePrefix + textList[end.line].origin.substring(end.character);
    //WHEN::No need to alignment
    if (currentLine !== linePrefix)
        return;
    //STEP::Cheak yaml
    if ((changeText === ':' && !linePrefix.includes(": ")) || (changeText === ' ' && /^\s*(-\s\s)$/.test(linePrefix)) || (changeText === '-' && /^\s*(-)/.test(linePrefix))) {
        return TriggerYaml(currentLine, change, textList);
    }
    //STEP::Check node sign
    //const text = linePrefix.trim();
    // if (text !== changeText)
    //     return;
    // for (const key in currentSet) {
    //     if (key === changeText) {
    //         return TriggerNode(changeText, change.range.end.line, change.range.end.character);
    //     }
    // }
    //STEP::Check node pair
    // if(text.length === changeText.length +1){
    //     for (const key in currentSet) {
    //         if(text.startsWith(key) && currentSet[key].pair.length>0){
    //             for(const item of currentSet[key].pair){
    //                 if(item.line.test(linePrefix)){
    //                     return TriggerNode(currentLine, change.range.end.line, change.range.end.character);
    //                 }
    //             }
    //         }
    //     }
    // }
    return;
};
exports.Trigger = Trigger;
//TIPS::Trigger node
// const TriggerNode = function (currentLine: string, lineNumber:any, characters:any) {
//     //STEP::Init handler
//     let currentContent = currentLine.trim();
//     //STEP::No need to alignment
//     if (currentSet === null)
//         return;
//     //STEP::Get align setting
//     let node = null;
//     for (const key in currentSet) {
//         if (currentContent.startsWith(key)) {
//             node = currentSet[key];
//             break;
//         }
//     }
//     if (node === null)
//         return;
//     //WHEN::"root" type
//     if (node.node === "root") {
//         let newLine = '\n'
//         if (lineNumber !== 0) {
//             const line = process.textList[lineNumber - 1];
//             if (/^\s*(?:#|$)/.test(line.origin))
//                 newLine = ''
//         } else
//             newLine = ''
//         const currentAlign = Trigger_LeadingWhitespace(currentLine);
//         if (currentAlign === 0 && newLine === '')
//             return;
//         return {
//             "newText": newLine + currentContent,
//             "range": {
//                 "start": {line: lineNumber, character: 0 },
//                 "end": {line: lineNumber, character: characters+1 }
//             }
//         };
//     }
//     //STEP::Get param
//     let tabSize = currentTab;
//     const currentAlign = Trigger_LeadingWhitespace(currentLine);
//     //WHEN::"node" type, with pair
//     if(node.pair.length>0){
//         //STEP-IN::Get pair target
//         let pairRegex = null;
//         for(const item of node.pair){
//             if(item.line.test(currentContent)){
//                 pairRegex = item.match;
//                 break;
//             }
//         }
//         //WHEN-IN::Need to find pair target
//         if(pairRegex!==null){
//             const currentAlign = Trigger_LeadingWhitespace(currentLine);
//             let lastAlign = -1;
//             let lastLine = null;
//             let leafAlign = -1
//             for (let index = lineNumber - 1; index >= 0; index--) {
//                 const line = process.textList[index].origin;
//                 const lineAlign = Trigger_LeadingWhitespace(line);
//                 if(lineAlign > currentAlign)
//                     continue;
//                 if(lastAlign!==-1 && lastAlign<lineAlign)
//                     continue;
//                 if(leafAlign!==-1 && leafAlign<=lineAlign)
//                     continue;
//                 lastAlign = lastAlign===-1||lineAlign<lastAlign?lineAlign:lastAlign;
//                 if(pairRegex.test(line)){
//                     lastAlign = lineAlign;
//                     lastLine = line;
//                     break;
//                 }
//                 for (const sign in currentSet) {
//                     if(currentSet[sign].regex.test(line)){
//                         if(currentSet[sign].node === "leaf"){
//                             leafAlign = (leafAlign===-1||lineAlign<leafAlign)?lineAlign:leafAlign;
//                             break;
//                         }
//                         if(currentSet[sign].node === "root") {
//                             break;
//                         }
//                     }
//                 }
//                 if (lastLine !== null)
//                     break;
//             }
//             if (lastLine === null)
//                 return;
//             //STEP-IN-IN::Check alignment
//             if (currentAlign === lastAlign)
//                 return;
//             //STEP-IN-IN::Change alignment
//             const newText = ' '.repeat(lastAlign) + currentContent;
//             return {
//                 "newText": newText,
//                 "range": {
//                     "start": {line: lineNumber, character: 0 },
//                     "end": {line: lineNumber, character: characters+1 }
//                 }
//             };
//         }
//     }
//     //WHEN::"node/leaf" type
//     let lastAlign = 0;
//     let lastLine = null;
//     let lastNode = null;
//     let leafAlign = -1
//     for (let index = lineNumber - 1; index >= 0; index--) {
//         const line = process.textList[index].origin;
//         const lineAlign = Trigger_LeadingWhitespace(line);
//         if(lineAlign > currentAlign)
//             continue;
//         for (const sign in currentSet) {
//             if (currentSet[sign].regex.test(line)) {
//                 if(currentSet[sign].node === "leaf"){
//                     leafAlign = (leafAlign===-1||lineAlign<leafAlign)?lineAlign:leafAlign;
//                     break;
//                 }
//                 if((currentSet[sign].node !== "root") && (leafAlign!==-1 && (lineAlign >= leafAlign))){
//                     continue;
//                 }
//                 lastAlign = lineAlign;
//                 lastLine = line
//                 lastNode = currentSet[sign];
//                 break;
//             }
//         }
//         if (lastLine !== null)
//             break;
//     }
//     if (lastLine === null)
//         return;
//     //STEP-IN::Check alignment
//     if (lastNode.node === "root" && currentAlign === (lastAlign + tabSize))
//         return;
//     if (lastNode.node === "node" && (currentAlign === (lastAlign + tabSize) || currentAlign === (lastAlign)))
//         return;
//     //STEP-IN::Change alignment
//     const newText = ' '.repeat(lastAlign + tabSize)+currentContent;
//     return {
//         "newText": newText,
//         "range": {
//             "start": {line: lineNumber, character: 0 },
//             "end": {line: lineNumber, character: characters+1 }
//         }
//     };
// };
//TIPS::Check change(node)
// export const TriggerHint = function (position:any, context:any) {
//     if(currentSet===null)
//         return
//     let line = position.line
//     let character = position.character
//     if(line >= process.textList.length)
//         return
//     let lineContent = process.textList[line].origin;
//     if(lineContent.length !== character)
//         return
//     let node = null
//     for (const key in currentSet) {
//         if (context === key) {
//             node = currentSet[key];
//             return TriggerNode(lineContent, line, character);
//         }
//     }
//     if(node === null)
//         return
// }
//# sourceMappingURL=node.js.map