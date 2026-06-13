"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Check = void 0;
const yaml = require("js-yaml");
const lang = require("../../load/lang");
const config = require("./config");
const CheckNode_GetIndent = function (text) {
    const match = text.match(/^ */);
    return match ? match[0].length : 0;
};
function EscapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const CheckNode = function (textList, index, lineText, originText, nodeSetting) {
    //STEP::Check invalid tab
    if (/^\s*\t\s*/.test(originText)) {
        const match = originText.match(/^\s*\t\s*/);
        textList[index].error.push({ "text": `${lang.LangGet("check>>node>>tab key")}${config.currentTab}`, "start": 0, "end": match[0].length });
        return;
    }
    //STEP::Check indent unit
    const indent = textList[index].indent;
    if (indent % config.currentTab !== 0) {
        textList[index].error.push({ "text": `${lang.LangGet("check>>node>>tab size")}${config.currentTab}`, "start": 0, "end": indent });
        return;
    }
    //WHEN::"root" type
    if (nodeSetting.node === "root") {
        if (indent !== 0) {
            textList[index].error.push({ "text": `${lang.LangGet("check>>node>>root")}`, "start": 0, "end": indent });
            return;
        }
        if ("repeat" in nodeSetting["node-set"] && nodeSetting["node-set"]["repeat"].test(lineText)) {
            const match = lineText.match(nodeSetting["node-set"]["repeat"]);
            textList[index]["node-repeat"] = match[0];
        }
        if ("define" in nodeSetting["node-set"] && nodeSetting["node-set"]["define"].test(lineText)) {
            const match = lineText.match(nodeSetting["node-set"]["define"]);
            textList[index]["node-define"] = match[0];
        }
        if (config.currentHead["allowNode"] === false || !config.currentHead["node"].includes(nodeSetting['key'])) {
            textList[index].useless = true;
        }
        return;
    }
    //WHEN::"leaf" or "node" type
    let pairNodeRegex = null;
    let lastNode = null;
    if (nodeSetting.node === "node" && nodeSetting["node-set"]) {
        for (const item of nodeSetting["node-set"]) {
            if (item.line.test(lineText))
                pairNodeRegex = item.match;
        }
    }
    if (pairNodeRegex === null) {
        //STEP-IN::Find last node
        for (let lastIndex = index - 1; lastIndex >= 0; lastIndex--) {
            if (textList[lastIndex].key !== "" && indent > textList[lastIndex].indent) {
                lastNode = textList[lastIndex];
                break;
            }
            else if (textList[lastIndex].check === "root")
                break;
        }
        //WHEN-IN::Last node not found
        if (lastNode === null) {
            textList[index].error.push({ "text": `${lang.LangGet("check>>node>>illegal intent")}`, "start": 0, "end": indent });
            return;
        }
    }
    //WHEN::"node" type and need to pair
    else {
        lastNode = null;
        for (let lastIndex = index - 1; lastIndex >= 0; lastIndex--) {
            if (textList[lastIndex].key !== "" && indent > textList[lastIndex].indent) {
                break;
            }
            if (indent === textList[lastIndex].indent && textList[lastIndex].check === "node" && pairNodeRegex.test(textList[lastIndex].text)) {
                lastNode = textList[lastIndex];
                break;
            }
            else if (indent === textList[lastIndex].indent)
                break;
            else if (textList[lastIndex].check === "root")
                break;
        }
        //WHEN-IN::Last node not found
        if (lastNode === null || indent !== lastNode.indent) {
            textList[index].error.push({ "text": `${lang.LangGet("check>>node>>pair not found")}`, "start": 0, "end": textList[index].origin.length });
            return;
        }
    }
    //WHEN-IN::Not allow node
    if (lastNode.useless === true) {
        textList[index].useless = true;
        return;
    }
    if (lastNode.check === "leaf") {
        textList[index].useless = true;
        return;
    }
    if (pairNodeRegex === null && lastNode["template"]["allowNode"] === false) {
        textList[index].useless = true;
        return;
    }
};
const GetTemplate = function (textList, index, lineText, nodeSetting) {
    if (textList[index].useless === true)
        return;
    let isFound = false;
    for (const item of nodeSetting['template']) {
        if (item.node.test(lineText)) {
            textList[index].template = item.template;
            isFound = true;
        }
    }
    if (isFound === false)
        textList[index].useless = true;
    else if (Array.isArray(textList[index].template["pair"]) && textList[index].template["pair"].length > 0) {
        const match = [];
        for (const item of textList[index].template["pair"]) {
            match.push({
                'isNec': item['isNec'],
                'key': item['key'],
                'isMatch': false
            });
        }
        const indent = textList[index].indent;
        for (let nextIndex = index + 1; nextIndex < textList.length; nextIndex++) {
            if (textList[index].check === "root")
                break;
            if (config.currentNode.test(textList[nextIndex].text) && textList[nextIndex].indent < indent)
                break;
            if (config.currentNode.test(textList[nextIndex].text) && textList[nextIndex].indent === indent) {
                let isMatch = false;
                for (const item_match of match) {
                    if (item_match['key'].test(textList[nextIndex].text.trim())) {
                        item_match['isMatch'] = true;
                        isMatch = true;
                    }
                }
                if (!isMatch) {
                    break;
                }
            }
        }
        for (const item of match) {
            if (item['isNec'] && !item['isMatch']) {
                textList[index].error.push({ "text": `${lang.LangGet("check>>node>>pair lack match")}`, "start": 0, "end": textList[index].origin.length });
                break;
            }
        }
    }
};
function CheckParam_GetType(value) {
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'undefined';
    const type = typeof value;
    if (type === 'object') {
        if (Array.isArray(value))
            return 'array';
        if (value.constructor === Object)
            return 'object';
        return value.constructor.name.toLowerCase();
    }
    return type;
}
const CheckParam = function (textList, index, originText, nodeSetting) {
    //STEP::Get allow setting
    const indent = textList[index].indent;
    const isNodeError = textList[index].error.length > 0;
    let allow = textList[index].template;
    //STEP::Check param
    const allowParam = allow === null ? false : allow["allowParam"];
    let nextLine = index + 1;
    let paramText = [];
    let isParam = false;
    let isFirstParam = true;
    while (nextLine < textList.length) {
        const tempText = " ".repeat(textList[nextLine].indent) + textList[nextLine].text;
        if (config.currentNode.test(tempText))
            break;
        if (/^\s*$/.test(tempText)) {
            textList[nextLine].check = "empty";
        }
        else {
            textList[nextLine].check = "param";
        }
        //WHEN-IN::Useless node
        if (textList[index].useless === true) {
            textList[nextLine].useless = true;
        }
        //WHEN-IN::Allow param
        else if (allowParam) {
            paramText.push(tempText);
            if (!(/(^\s*$)|(^\s*#)/.test(tempText))) {
                isParam = true;
            }
        }
        //WHEN-IN::Useless node
        else
            textList[nextLine].useless = true;
        //STEP-IN::First indent check
        if (textList[nextLine].useless === false && isFirstParam && /\s*\S/.test(tempText)) {
            isFirstParam = false;
            if (indent >= textList[nextLine].indent) {
                textList[nextLine].error.push({ "level": "warn", "text": `${lang.LangGet("check>>node>>param intent")}`, "start": 0, "end": textList[nextLine].indent });
            }
        }
        nextLine++;
    }
    if (!isNodeError && textList[index].useless !== true && allowParam) {
        if (!isParam) {
            if (allow["param-all"] !== null && allow["param-all"]["isNec"]) {
                textList[index].error.push({ "text": `${lang.LangGet("check>>node>>param not found")}`, "start": 0, "end": originText.length });
                return;
            }
            else {
                paramText = ['{}'];
            }
        }
        try {
            const convert = yaml.load(paramText.join('\n'));
            if (!(Object.prototype.toString.call(convert) === '[object Object]' && !Array.isArray(convert))) {
                let tempIndex = index + 1;
                if (tempIndex >= nextLine)
                    textList[index].error.push({ "text": `${lang.LangGet("check>>node>>param not object")}`, "start": 0, "end": originText.length });
                while (tempIndex < nextLine) {
                    textList[tempIndex].error.push({ "text": `${lang.LangGet("check>>node>>param not object")}`, "start": 0, "end": textList[tempIndex].origin.length });
                    tempIndex++;
                }
                return;
            }
            const lackKey = [];
            const errorKey = [];
            const uselessKey = [];
            const keyList = [];
            for (const item of allow["param"]) {
                if (item['key'] in convert) {
                    if (item['default'] != null && CheckParam_GetType(item['default']) !== CheckParam_GetType(convert[item['key']])) {
                        errorKey.push(item['key']);
                    }
                }
                else if (item['isNec']) {
                    lackKey.push(item['key']);
                }
                keyList.push(item['key']);
            }
            if (allow["param-all"] === null && allow["param"].length > 0) {
                for (const key in convert) {
                    if (!keyList.includes(key)) {
                        uselessKey.push(key);
                    }
                }
            }
            if (lackKey.length > 0)
                textList[index].error.push({ "text": `${lang.LangGet("check>>node>>param key lack")}${lackKey.join(', ')}`, "start": 0, "end": textList[index].origin.length });
            if (errorKey.length > 0 || uselessKey.length > 0) {
                let tempIndex = index + 1;
                const indent = textList[tempIndex].indent;
                let escapedString = uselessKey.map(EscapeRegExp).join('|');
                const uselessRegex = new RegExp(`^\\s*(?:'${escapedString.replace(/'/g, "\\'")}'|"${escapedString.replace(/"/g, '\\"')}"|${escapedString})\\s*:`);
                escapedString = errorKey.map(EscapeRegExp).join('|');
                const errorRegex = new RegExp(`^\\s*(?:'${escapedString.replace(/'/g, "\\'")}'|"${escapedString.replace(/"/g, '\\"')}"|${escapedString})\\s*:`);
                let isUseless = false;
                while (tempIndex < nextLine) {
                    if (indent < textList[tempIndex].indent) {
                        if (isUseless === true)
                            textList[tempIndex].useless;
                        tempIndex++;
                        continue;
                    }
                    isUseless = false;
                    const tempText = textList[tempIndex].text;
                    if (errorKey.length > 0) {
                        if (tempText.match(errorRegex))
                            textList[tempIndex].error.push({ "text": `${lang.LangGet("check>>node>>param type wrong")}`, "start": 0, "end": textList[tempIndex].origin.length });
                    }
                    if (uselessKey.length > 0) {
                        if (tempText.match(uselessRegex)) {
                            textList[tempIndex].useless = true;
                            isUseless = true;
                        }
                    }
                    tempIndex++;
                }
            }
        }
        catch (e) {
            if (e.mark) {
                let line = e.mark.line + index + 1;
                textList[line].error.push({ "text": `${lang.LangGet("check>>node>>param yaml fail")}${e.message}`, "start": 0, "end": textList[line].origin.length });
            }
        }
    }
    return;
};
const CheckLine = function (textList, index, lineText, nodeSetting) {
    //STEP::Get allow setting
    // const isNodeError = textList[index].error.length>0
    // if(isNodeError || textList[index].useless === true)
    //     return;
    //STEP::Check line in this node
    let nextLine = index;
    while (nextLine < textList.length) {
        const tempText = textList[nextLine].text.trim();
        if (nextLine !== index && config.currentNode.test(tempText))
            break;
        if (textList[nextLine].useless === true) {
            nextLine++;
            continue;
        }
        if (/^\s*#/.test(tempText) || /^\s*$/.test(tempText)) {
            nextLine++;
            continue;
        }
        for (const item of nodeSetting["check"]) {
            if (item["node"].test(lineText) && item["line"].test(tempText)) {
                let isPass = false;
                if (item["isEmptyPass"] === true && item["check"].length === 0)
                    isPass = true;
                for (const item_check of item["check"]) {
                    if (item_check.test(tempText)) {
                        isPass = true;
                        break;
                    }
                }
                if (!isPass) {
                    let errorTips = null;
                    for (const item_tips of item["tips"]) {
                        if (item_tips["line"].test(tempText)) {
                            errorTips = { "text": `${lang.LangGet("check>>node>>line check fail(tips)")}${item_tips["tips"]}`, "start": 0, "end": textList[nextLine].origin.length };
                            break;
                        }
                    }
                    if (errorTips === null)
                        errorTips = { "text": `${lang.LangGet("check>>node>>line check fail")}`, "start": 0, "end": textList[nextLine].origin.length };
                    if ("check-param" in item) {
                        textList[nextLine]["check-param"] = item["check-param"];
                        textList[nextLine]["check-errorTips"] = errorTips;
                    }
                    else
                        textList[nextLine].error.push(errorTips);
                }
                for (const item_appendix of item["appendix"]) {
                    if (item_appendix["list"].length === 0)
                        continue;
                    let match;
                    while ((match = item_appendix["match"].exec(tempText)) !== null) {
                        if (match === null)
                            continue;
                        const matchText = match[0];
                        let isPass = false;
                        for (const appendix_list of item_appendix["list"]) {
                            if (appendix_list.test(matchText)) {
                                isPass = true;
                                break;
                            }
                        }
                        if (!isPass) {
                            const errorTips = { "text": `${lang.LangGet("check>>node>>line check fail(tips)")}${item_appendix["tips"]}`, "start": textList[nextLine].indent + match.index, "end": textList[nextLine].indent + match.index + matchText.length };
                            textList[nextLine].error.push(errorTips);
                        }
                    }
                }
                break;
            }
        }
        nextLine++;
    }
    return;
};
const CheckHighLight = function (textList, index, lineText, nodeSetting) {
    //STEP::Get node status
    const isNodeError = textList[index].error.length > 0;
    const isUseless = textList[index].useless;
    //STEP::Check line in this node
    let nextLine = index;
    while (nextLine < textList.length) {
        const tempText = textList[nextLine].text;
        const originText = textList[nextLine].origin;
        if (nextLine !== index && config.currentNode.test(tempText))
            break;
        if (/^\s*#/.test(tempText) || /^\s*$/.test(tempText)) {
            nextLine++;
            continue;
        }
        //WHEN-IN::Check yaml
        if (nextLine !== index) {
            config.YamlHighlight(tempText, textList[nextLine].indent, textList, nextLine);
        }
        //WHEN-IN::Check highlight setting
        for (const item of nodeSetting["highlight"]) {
            if (item["node"].test(lineText) && item["line"].test(tempText)) {
                let match;
                while ((match = item["key"].exec(originText)) !== null) {
                    if (match === null)
                        continue;
                    config.HightlightInsert(textList, item["type"], nextLine, match.index, match[0].length);
                }
            }
        }
        nextLine++;
    }
    return;
};
const Check = function (textList, index, lineText, originText) {
    //STEP::Get node setting
    let nodeSetting = null;
    for (const item of config.currentSet) {
        if (lineText.startsWith(item["key"])) {
            textList[index].key = item["key"];
            nodeSetting = item;
        }
    }
    if (nodeSetting === null)
        return;
    textList[index].check = nodeSetting.node;
    //STEP::Check node
    CheckNode(textList, index, lineText, originText, nodeSetting);
    //STEP::Get template
    GetTemplate(textList, index, lineText, nodeSetting);
    //STEP::Check allow
    CheckParam(textList, index, originText, nodeSetting);
    //STEP::Check line
    CheckLine(textList, index, lineText, nodeSetting);
    //STEP::Set highlight
    CheckHighLight(textList, index, lineText, nodeSetting);
    return;
};
exports.Check = Check;
//# sourceMappingURL=node.js.map