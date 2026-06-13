"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trigger = exports.UpdateDefine = exports.ChangeFile = exports.GetKey = exports.Init = exports.Clean = void 0;
//import * as vscode from 'vscode';
const node_1 = require("vscode-languageserver/node");
const lang = require("../../load/lang");
const process = require("../process");
function EscapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function GetStringValue(value) {
    if (typeof value === 'string')
        return value;
    return "";
}
function Init_Hint(hint, icon) {
    let kind = node_1.CompletionItemKind.Module;
    const result = [];
    switch (icon) {
        case "constructor":
            kind = node_1.CompletionItemKind.Constructor;
            break;
        case "enum":
            kind = node_1.CompletionItemKind.Enum;
            break;
        case "class":
            kind = node_1.CompletionItemKind.Class;
            break;
        case "function":
            kind = node_1.CompletionItemKind.Function;
            break;
        case "property":
            kind = node_1.CompletionItemKind.Property;
            break;
        case "module":
            kind = node_1.CompletionItemKind.Module;
            break;
    }
    let index = 0;
    for (const item of hint) {
        if (item.length > 3)
            continue;
        const completionItem = {
            label: item?.[0] ?? "",
            kind: kind,
            detail: lang.LangText(item?.[1] ?? ""),
            insertText: item?.[2] ?? item?.[0] ?? "",
            sortText: index.toString().padStart(5, '0')
        };
        index++;
        result.push(completionItem);
    }
    return result;
}
//TIPS::Init/Clean setting
let setting = {};
let nodeCheck = {};
let keyNode = {};
let currentSet = null;
let currentNode = null;
let currentKey = null;
let sign = {};
let currentUri = "";
let currentSign = null;
let ide = "";
const Clean = function () { setting = {}; currentSet = null; nodeCheck = {}; currentNode = null; sign = {}; currentSign = null; currentKey = null; currentUri = ""; };
exports.Clean = Clean;
const Init = function (target, Xmas_sign, Xmas_setting, ideSet) {
    //STEP::Clean setting
    setting[target] = {};
    keyNode[target] = [];
    nodeCheck[target] = null;
    sign[target] = Xmas_sign;
    const pointer = setting[target];
    ide = ideSet;
    //STEP::Deal node
    const nodeList = [];
    for (const key in Xmas_setting) {
        if (key.length > 1)
            continue;
        nodeList.push(key);
        const Xmas_hint = Xmas_setting[key]?.Xmas_hint ?? "";
        if (!Array.isArray(Xmas_hint))
            continue;
        for (const item of Xmas_hint) {
            let keyPress = GetStringValue(item.key);
            const node = GetStringValue(item.node);
            const line = GetStringValue(item.line);
            const hint = item.hint;
            if (!Array.isArray(hint))
                continue;
            if (node === "" && line === "") {
                if (keyPress === "")
                    keyPress = key;
            }
            else if (keyPress === "")
                continue;
            keyNode[target].push(keyPress);
            if (!(key in pointer))
                pointer[key] = [];
            const piece = {
                line: RegExp(line),
                node: RegExp(node),
                icon: item.icon,
                hint: hint,
                key: keyPress,
                hintObject: Init_Hint(hint, item.icon)
            };
            pointer[key].push(piece);
        }
    }
    const escapedString = nodeList.map(EscapeRegExp).join('|');
    nodeCheck[target] = new RegExp(`^\\s*(${escapedString})`);
};
exports.Init = Init;
//TIPS::Get all key
const GetKey = function () {
    const result = [];
    for (const key in keyNode) {
        for (const item of keyNode[key]) {
            if (!result.includes(item)) {
                result.push(item);
            }
        }
    }
    return result;
};
exports.GetKey = GetKey;
//TIPS::Change file
const ChangeFile = function (path) {
    if (path === null) {
        currentSet = null;
        currentNode = null;
        currentSign = null;
        currentKey = null;
        currentUri = "";
        return;
    }
    for (const key in setting) {
        if ((new RegExp(key)).test(path)) {
            currentSet = setting[key];
            currentNode = nodeCheck[key];
            currentKey = keyNode[key];
            currentSign = sign[key];
            currentUri = path;
            return;
        }
    }
    currentUri = "";
    currentSign = null;
    currentSet = null;
    currentNode = null;
    currentKey = null;
};
exports.ChangeFile = ChangeFile;
//TIPS::Update root define
const UpdateDefine = function (data) {
    for (let key in currentSet) {
        for (let item_hint of currentSet[key]) {
            const hint = item_hint.hint;
            const defineHint = [];
            let isNeedUpdate = false;
            for (const item of hint) {
                if (item.length <= 3) {
                    defineHint.push(item);
                }
                else if (item[3] in data) {
                    const checkList = [];
                    const defineList = data[item[3]];
                    for (const item_define of defineList) {
                        const match = item_define.match(item[4]);
                        if (!match)
                            continue;
                        checkList.push(match);
                    }
                    for (let i = 0; i < checkList.length; i++) {
                        let item_1 = item[0];
                        let item_2 = lang.LangText(item[1]);
                        let item_3 = item[2];
                        for (let i_2 = 0; i_2 < checkList[i].length; i_2++) {
                            item_1 = item_1.replaceAll(`${currentSign}${i_2}`, checkList[i][i_2]);
                            item_2 = item_2.replaceAll(`${currentSign}${i_2}`, checkList[i][i_2]);
                            item_3 = item_3.replaceAll(`${currentSign}${i_2}`, checkList[i][i_2]);
                        }
                        isNeedUpdate = true;
                        defineHint.push([item_1, item_2, item_3]);
                    }
                }
            }
            if (isNeedUpdate)
                item_hint.hintObject = Init_Hint(defineHint, item_hint.icon);
        }
    }
};
exports.UpdateDefine = UpdateDefine;
//TIPS::Trigger hint
const Trigger = function (position, context) {
    //STEP::Get file text
    if (currentUri === "" || process.fileHouse[currentUri] === undefined)
        return [];
    const textList = process.fileHouse[currentUri].textList;
    let line = position.line;
    let character = position.character;
    if (line >= textList.length)
        return [];
    //STEP::Check whether key in list
    let isAddKey = false;
    if (context === undefined) {
        if ((character - 1) < 0) {
            return [];
        }
        isAddKey = true;
        context = textList[line].origin[character - 1];
    }
    if (currentKey === null || !currentKey.includes(context))
        return [];
    //STEP::Get line
    let lineContent = textList[line].origin.substring(0, character).trim();
    //STEP::Find node
    let nodeText = "";
    for (let index = line; index >= 0; index--) {
        if (textList[index].check === "node" ||
            textList[index].check === "root" ||
            textList[index].check === "leaf") {
            nodeText = textList[index].text;
            break;
        }
        if (textList[index].check !== "init")
            continue;
        const tempText = textList[index].text;
        if (currentNode.test(tempText)) {
            nodeText = tempText;
            break;
        }
    }
    if (nodeText === "")
        return [];
    //STEP::Get node setting
    const nodeKey = nodeText[0];
    if (!(nodeKey in currentSet))
        return [];
    const hintList = currentSet[nodeKey];
    //STEP::Find match hint
    let returnResult = [];
    for (const item of hintList) {
        if (item.key !== context)
            continue;
        if (!item.line.test(lineContent))
            continue;
        if (!item.node.test(nodeText))
            continue;
        if (!isAddKey)
            returnResult = item.hintObject;
        else {
            const result = [];
            for (const item_result of item.hintObject) {
                const completionItem = {
                    label: item_result.label,
                    kind: item_result.kind,
                    detail: item_result.detail,
                    insertText: context + item_result.insertText,
                };
                result.push(completionItem);
            }
            returnResult = result;
        }
    }
    //STEP::Check Multi-line
    if (textList[line].indent === 0 || ide === 'vscode')
        return returnResult;
    for (const item of returnResult) {
        item.insertText = item.insertText.replace(/\r?\n/g, "\n" + " ".repeat(textList[line].indent));
    }
    return returnResult;
};
exports.Trigger = Trigger;
//# sourceMappingURL=hint.js.map