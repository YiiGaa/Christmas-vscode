"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetHighLight = exports.GetResult = exports.Change = exports.Check = exports.Close = exports.Init = exports.fileHouse = void 0;
const config = require("./check/config");
const checkHead = require("./check/head");
const checkNode = require("./check/node");
const service = require("./service");
const lang = require("../load/lang");
const node_1 = require("vscode-languageserver/node");
//TIPS::Init textList
exports.fileHouse = {};
let totalLength = 0;
const LIMIT = 100 * 1024 * 2024; //1024*1024=1MB
const Init = function (text, uri, version, connection) {
    //STEP::Init textList
    const lines = text.split('\n');
    exports.fileHouse[uri] = {
        "version": version,
        "indexPointer": 0,
        "isChecking": false,
        "isClose": false,
        "uri": uri,
        "length": text.length * 2,
        "highlight": null,
        "textList": []
    };
    const textList = [];
    for (const line of lines) {
        const piece = Init_Piece(line);
        textList.push(piece);
    }
    exports.fileHouse[uri].textList = textList;
    //WHEN::Show warning when cache much file
    totalLength = totalLength + exports.fileHouse[uri].length;
    if (LIMIT < totalLength) {
        connection.window.showInformationMessage(lang.LangGet("lsp>>limit"));
    }
};
exports.Init = Init;
const Init_Piece = function (line) {
    //STEP::Remove comment
    const origin = line;
    let comment = [];
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
        }
        else if (inDouble) {
            if (char === '"') {
                inDouble = false;
            }
        }
        else {
            if (char === "'") {
                inSingle = true;
            }
            else if (char === '"') {
                inDouble = true;
            }
            else if (char === '#' && (i === 0 || line[i - 1] === " ")) {
                comment.push({
                    char: i,
                    length: line.length - i,
                    type: config.tokenTypes.indexOf("comment"),
                    modifiers: 0
                });
                line = line.substring(0, i).trimEnd();
            }
        }
        i++;
    }
    //STEP::Get indent
    const match = origin.match(/^ */);
    const indent = match ? match[0].length : 0;
    //line.replace(/(?<=^[^"']*(?:(?:"[^"]*"|'[^']*')[^"']*)*)\s#.*$/, "")
    return {
        "text": line.trim(),
        "check": "init",
        "origin": origin,
        "key": "",
        "indent": indent,
        "highlight": comment.length > 0 ? [...comment] : [],
        "useless": false,
        "error": [],
        "hint": [],
        "template": {
            "allowParam": false,
            "allowNode": false,
            "param": [],
            "node": []
        }
    };
};
//TIPS::Call stop processing
const Close = function (uri) {
    if (exports.fileHouse[uri] === undefined)
        return;
    totalLength = totalLength - exports.fileHouse[uri].length;
    if (exports.fileHouse[uri].isChecking === false)
        delete exports.fileHouse[uri];
    else {
        exports.fileHouse[uri].isChecking = false;
        exports.fileHouse[uri].isClose = true;
    }
};
exports.Close = Close;
//TIPS::Check
let isProcessing = false;
let checkList = [];
let uriPorcess = "";
const Check = function (pointer, uri, isChange = false) {
    if (exports.fileHouse[uri] === undefined)
        return;
    pointer = pointer >= 0 ? pointer : 0;
    exports.fileHouse[uri].indexPointer = pointer >= 0 && pointer < exports.fileHouse[uri].indexPointer ? pointer : exports.fileHouse[uri].indexPointer;
    if (isChange && uriPorcess !== uri) {
        if (checkList.includes(uri))
            checkList.splice(checkList.indexOf(uri), 1);
        exports.fileHouse[uriPorcess].isChecking = false;
    }
    if (checkList.length === 0 || !checkList.includes(uri)) {
        checkList.unshift(uri);
    }
    if (isProcessing === false) {
        isProcessing = true;
        Check_DO();
    }
};
exports.Check = Check;
async function Check_DO() {
    while (checkList.length > 0) {
        const uri = checkList[0];
        uriPorcess = uri;
        const target = exports.fileHouse[uri];
        const textList = target.textList;
        let isCheckHead = target.indexPointer === 0 ? false : true;
        target.isChecking = true;
        target.highlight = null;
        //STEP::Cheange config
        config.ChangeFile(uri);
        let index = target.indexPointer;
        for (; index < textList.length; index++) {
            //STEP::Release thread
            target.indexPointer = index;
            if (target.isChecking === false) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 0));
            if (target.indexPointer !== index)
                index = target.indexPointer;
            //STEP::Get line
            const line = textList[index];
            const lineText = line.text;
            //WHEN::No need deal
            if (line.check !== "init")
                continue;
            //WHEN::Empty line
            if (/^\s*$/.test(lineText)) {
                line.check = "empty";
                continue;
            }
            //STEP::Check line
            if (config.currentNode == null) {
                line.check = "empty";
            }
            else if (config.currentNode != null && config.currentNode.test(lineText)) {
                if (!isCheckHead) {
                    checkHead.Check(textList, index);
                    isCheckHead = true;
                }
                checkNode.Check(textList, index, lineText.trim(), line.origin);
            }
            else {
                isCheckHead = true;
                checkHead.Check(textList, index);
            }
        }
        //STEP::Chagne status
        isProcessing = false;
        target.isChecking = false;
        //WHEN::File is closed during check
        if (target.isClose === true) {
            checkList.splice(checkList.indexOf(uri), 1);
            delete exports.fileHouse[uri];
        }
        //WHEN::Orther, send result
        else {
            service.SendResult(textList, target.uri);
        }
        //STEP::Remove from check list
        if (index === textList.length)
            checkList.splice(checkList.indexOf(uri), 1);
    }
}
//TIPS::Change text and restart check
function Change(changes, uri, version) {
    //STEP::Change textList
    let newPointer = 0;
    const target = exports.fileHouse[uri];
    if (target === undefined)
        return;
    const textList = target.textList;
    target.version = version;
    for (let index = 0; index < changes.length; index++) {
        //STEP-IN::Init change list
        const change = changes[index];
        const newList = [];
        newPointer = change.range.start.line;
        const start = change.range.start;
        const end = change.range.end;
        const changeList = change.text.split('\n');
        const startText = textList[start.line].origin.substring(0, start.character);
        const endText = textList[end.line].origin.substring(end.character);
        changeList[0] = `${startText}${changeList[0]}`;
        changeList[changeList.length - 1] = changeList[changeList.length - 1] + endText;
        for (const item of changeList) {
            newList.push(Init_Piece(item));
        }
        //STEP::Clean check
        let newIndex = start.line - 1;
        for (; newIndex >= 0; newIndex--) {
            if (textList[newIndex].check === "root") {
                textList[newIndex] = Init_Piece(textList[newIndex].origin);
                break;
            }
            textList[newIndex] = Init_Piece(textList[newIndex].origin);
        }
        newIndex = newIndex >= 0 ? newIndex : 0;
        newPointer = newPointer > newIndex ? newIndex : newPointer;
        for (let index = end.line + 1; index < textList.length; index++) {
            if (textList[index].check === "root")
                break;
            textList[index] = Init_Piece(textList[index].origin);
        }
        //STEP-IN::Insert list into textList
        textList.splice(start.line, (end.line - start.line + 1), ...newList);
    }
    //STEP::Start check
    (0, exports.Check)(newPointer, uri, true);
}
exports.Change = Change;
//TIPS::Get error list
function EscapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const GetResult = function (textList) {
    //STEP::Get error/waring list
    const diagnostics = [];
    const rootRepeat = [];
    let index = 0;
    const rootDefine = {};
    const recheck = [];
    for (const item of textList) {
        //WHEN-IN::Check root repeat
        if ("node-repeat" in item) {
            if (rootRepeat.includes(item["node-repeat"])) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: index, character: 0 },
                        end: { line: index, character: item.origin.length }
                    },
                    message: lang.LangGet("check>>node>>root repeat")
                });
            }
            else {
                rootRepeat.push(item["node-repeat"]);
            }
        }
        //WHEN-IN::Get all root define
        if ("node-define" in item) {
            const value = item["node-define"];
            const key = item["key"];
            if (!(key in rootDefine))
                rootDefine[key] = [];
            rootDefine[key].push(value);
        }
        //WHEN-IN::Need to check with root define
        if ("check-param" in item) {
            recheck.push(index);
        }
        //STEP::Mark useless line
        if (item.useless === true && item.check != "empty") {
            diagnostics.push({
                range: {
                    start: { line: index, character: 0 },
                    end: { line: index, character: item.origin.length }
                },
                message: lang.LangGet("check>>node>>useless"),
                severity: node_1.DiagnosticSeverity.Warning,
                //tags: [DiagnosticTag.Unnecessary]
            });
        }
        //STEP::Convert error list
        if (item.error.length > 0) {
            for (const item_error of item.error) {
                diagnostics.push({
                    severity: item_error.level === "warn" ? node_1.DiagnosticSeverity.Warning : node_1.DiagnosticSeverity.Error,
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
    for (const index of recheck) {
        const item = textList[index];
        let isPass = false;
        for (const item_check of item["check-param"]) {
            if (!(item_check[1] in rootDefine))
                continue;
            const define = rootDefine[item_check[1]];
            const checkList = [];
            for (const item_define of define) {
                const match = item_define.match(item_check[2]);
                if (!match)
                    continue;
                for (let i = 0; i < match.length; i++) {
                    if (checkList.length <= i)
                        checkList.push([]);
                    checkList[i].push(match[i]);
                }
            }
            if (checkList.length === 0)
                continue;
            let regex = item_check[0];
            for (let i = 0; i < checkList.length; i++) {
                const escapedString = checkList[i].map(EscapeRegExp).join('|');
                regex = regex.replaceAll(`${config.currentSign}${i}`, escapedString);
            }
            if ((new RegExp(regex)).test(item.text.trim())) {
                isPass = true;
                break;
            }
        }
        if (!isPass) {
            const errorTips = item["check-errorTips"];
            diagnostics.push({
                severity: errorTips.level === "warn" ? node_1.DiagnosticSeverity.Warning : node_1.DiagnosticSeverity.Error,
                range: {
                    start: { line: index, character: errorTips.start },
                    end: { line: index, character: errorTips.end }
                },
                message: errorTips.text
            });
        }
    }
    return [diagnostics, rootDefine];
};
exports.GetResult = GetResult;
//TIPS::Get highlight result
const GetHighLight = async function (range, uri) {
    //STEP::Wait check done
    while (true) {
        if (exports.fileHouse[uri] === undefined)
            return [];
        if (!checkList.includes(uri))
            break;
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    //STEP::Get range
    const target = exports.fileHouse[uri];
    if (target === undefined)
        return [];
    //STEP::Try cache
    if (range === -1 && target.highlight !== null) {
        return target.highlight;
    }
    //STEP::Get handler
    const textList = target.textList;
    const start = range === -1 ? 0 : range.start.line;
    const end = range === -1 ? textList.length : range.end.line;
    let prevLine = 0;
    let prevChar = 0;
    //STEP::Get highlight list
    const result = [];
    for (let index = 0; index < textList.length; index++) {
        if (index < start)
            continue;
        if (index > end)
            break;
        for (const item of textList[index].highlight) {
            const deltaLine = index - prevLine;
            const deltaChar = deltaLine === 0 ? item.char - prevChar : item.char;
            result.push(deltaLine, deltaChar, item.length, item.type, item.modifiers);
            prevLine = index;
            prevChar = item.char;
        }
    }
    //STEP::Cache highlight result
    if (range === -1)
        target.highlight = result;
    return result;
};
exports.GetHighLight = GetHighLight;
//# sourceMappingURL=process.js.map