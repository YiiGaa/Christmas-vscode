import * as lang from '../../load/lang'
import * as JSON5 from 'json5'
function EscapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

//TIPS::For highlight setting
export const tokenTypes = [
    'namespace',    // 0
    'class',        // 1
    'enum',         // 2
    'interface',    // 3
    'struct',       // 4
    'typeParameter',// 5
    'type',         // 6
    'parameter',    // 7
    'variable',     // 8
    'property',     // 9
    'enumMember',   // 10
    'event',        // 11
    'function',     // 12
    'method',       // 13
    'macro',        // 14
    'keyword',      // 15
    'modifier',     // 16
    'comment',      // 17
    'string',       // 18
    'number',       // 19
    'regexp',       // 20
    'operator'      // 21
];
export const tokenModifiers = ['declaration', 'documentation'];

//TIPS::For yaml highlight
const configYaml:any = [
    [
        {
            "match":/(?<=(:|^-)\s+)\b(true|false|yes|no|null)$/,
            "type":"number",
            "comment":"match value(: true)"
        },{
            "match":/(?<=(:|^-)\s+)\b\d+(\.\d+)?$/,
            "type":"number",
            "comment":"match value(: 3.14)"
        },{
            "match":/(?<=(:)\s+)(>|\||-|\+|\d)+$/,
            "type":"operator",
            "comment":"match multi-line string settings"
        },{
            "match":/(?<=(:)\s+)\{(.+)\}$/,
            "type":"operator",
            "comment":"match value(json object)"
        },{
            "match":/(?<=(:)\s+)\[(.+)\]$/,
            "type":"operator",
            "comment":"match value(array object)"
        },{
            "match":/(?<=(:)\s+)(.+)$/,
            "type":"string",
            "comment":"match value(string)"
        },{
            "match":/(?<=(^-)\s+)(.+)(?!=:(\s|$))/,
            "type":"string",
            "comment":"match value(list string)"
        }
    ],[
        {
            "match":/(?<=^(-\s*)?)'((?:[^']|'')*)'(?=:(\s|$))/,
            "type":"string",
            "comment":"match key('':)"
        },{
            "match":/(?<=^(-\s*)?)"((?:[^"\\]|\\.)*)"(?=:(\s|$))/,
            "type":"string",
            "comment":"match key(\"\":)"
        },{
            "match":/(?<=^(-\s*))(.+)(?=:(\s|$))/,
            "type":"type",
            "comment":"match key(- key:)"
        },{
            "match":/^(.+)(?=:(\s|$))/,
            "type":"type",
            "comment":"match key(key:)"
        },{
            "match":/^(?!-).+$/,
            "type":"string",
            "comment":"match value(multi-line string)"
        }
    ],
    // [
    //     {
    //         "match":/namespace/,
    //         "type":"namespace"
    //     },{
    //         "match":/class/,
    //         "type":"class"
    //     },{
    //         "match":/enum/,
    //         "type":"enum"
    //     },{
    //         "match":/interface/,
    //         "type":"interface"
    //     },{
    //         "match":/struct/,
    //         "type":"struct"
    //     },{
    //         "match":/typeParameter/,
    //         "type":"typeParameter"
    //     },{
    //         "match":/type/,
    //         "type":"type"
    //     },{
    //         "match":/parameter/,
    //         "type":"parameter"
    //     },{
    //         "match":/variable/,
    //         "type":"variable"
    //     },{
    //         "match":/property/,
    //         "type":"property"
    //     },{
    //         "match":/enumMember/,
    //         "type":"enumMember"
    //     },{
    //         "match":/event/,
    //         "type":"event"
    //     },{
    //         "match":/function/,
    //         "type":"function"
    //     },{
    //         "match":/method/,
    //         "type":"method"
    //     },{
    //         "match":/macro/,
    //         "type":"macro"
    //     },{
    //         "match":/keyword/,
    //         "type":"keyword"
    //     },{
    //         "match":/modifier/,
    //         "type":"modifier"
    //     },{
    //         "match":/comment/,
    //         "type":"comment"
    //     },{
    //         "match":/string/,
    //         "type":"string"
    //     },{
    //         "match":/number/,
    //         "type":"number"
    //     },{
    //         "match":/regexp/,
    //         "type":"regexp"
    //     },{
    //         "match":/operator/,
    //         "type":"operator"
    //     }
    // ]
]

//TIPS::For yaml check
export const YamlHighlight = function(param:string, indent:number, textList:any, index:number){
    for(const item_1 of configYaml){
        for(const item_2 of item_1){
            let isFindAll = false;
            if("all" in item_2 && item_2.all === true)
                isFindAll = true;
            let match:any;
            let isFound = false;
            while((match = item_2.match.exec(param)) !==null){
                HightlightInsert(textList, item_2.type, index, match.index+indent, match[0].length)
                isFound = true;
                if(isFindAll === false)
                    break;
            }
            if(isFound === true)
                break;
        }
    }
}

//TIPS::Init/Clean setting
let setting: any = {};
let head: any = {};
let sign: any = {};
let nodeCheck: any = {};
let tab: any = {};
export let currentSet: any = null;
export let currentHead: any = null;
export let currentSign: any = null;
export let currentNode: any = null;
export let currentTab: any = 4;
export const Clean = function () {setting={}; currentSet=null; head={}; currentHead=null; sign={}; currentSign=null; nodeCheck={}; currentNode=null; tab={}; currentTab=null;}
export const Init = function(target: string, Xmas_sign: string, Xmas_template:any, Xmas_setting:any, Xmas_tab: number) {
    //STEP::Init param
    Xmas_sign = Xmas_sign===""?"<<":Xmas_sign;
    sign[target] = Xmas_sign;
    setting[target] = []
    nodeCheck[target] = null;
    head[target] = []
    tab[target] = Xmas_tab;

    //STEP::Convert head
    const template = Xmas_template;
    if(Object.prototype.toString.call(template) !== '[object Object]')
        head[target] = {
            "allowParam":false,
            "allowNode":false,
            "param":[],
            "node":[],
            "param-all":null,
            "pair":null
        }
    else{
        const templateItem:any = {
            "allowParam":false,
            "allowNode":false,
            "param":[],
            "node":[],
            "param-all":null,
            "pair":null
        }
        TemplateCheck(template, templateItem, null, true, Xmas_sign)
        head[target] = templateItem
    }

    //STEP::Convert node
    const nodeList = []
    for(const key in Xmas_setting){
        if (key.length > 1)
            continue;
        nodeList.push(key)
        const item:any = {}

        //STEP-IN::Mark node key
        item["key"] = key;

        //STEP-IN::Mark node type
        const Xmas_node = Xmas_setting[key]["Xmas_node"]
        item["node"] = "node";
        if(typeof Xmas_node === "string"){
            item["node"] = "node";
            if(Xmas_node === "root" || Xmas_node === "node" || Xmas_node === "leaf"){
                item["node"] = Xmas_node;
            }
        } else if(Array.isArray(Xmas_node)){
            item["node"] = "node";
            item["node-set"] = [];
            for(const piece of Xmas_node){
                if (Object.prototype.toString.call(piece) === '[object Object]' && !Array.isArray(piece)) {
                    if (!(
                        "line" in piece && typeof piece.line === "string" &&
                        "match" in piece && typeof piece.match === "string"
                    ))
                        continue;
                    const temp: any = {
                        "line": RegExp(piece.line),
                        "match": RegExp(piece.match),
                    }
                    item["node-set"].push(temp);
                }
            }
        } else if(Object.prototype.toString.call(Xmas_node) === '[object Object]'){
            item["node"] = "root";
            item["node-set"] = {};
            if("repeat" in Xmas_node && typeof Xmas_node["repeat"] === "string")
                item["node-set"]["repeat"] = new RegExp(Xmas_node["repeat"]);
            if("define" in Xmas_node && typeof Xmas_node["define"] === "string")
                item["node-set"]["define"] = new RegExp(Xmas_node["define"]);
        }

        //STEP-IN::heighlight
        const Xmas_highlight = Xmas_setting[key]["Xmas_highlight"]
        item["highlight"] = [];
        if(Array.isArray(Xmas_highlight)){
            for(const piece of Xmas_highlight){
                if (Object.prototype.toString.call(piece) === '[object Object]' && !Array.isArray(piece)) {
                    item["highlight"].push({
                        "node": new RegExp(typeof piece["node"] === "string"?piece["node"]:""),
                        "line": new RegExp(typeof piece["line"] === "string"?piece["line"]:""),
                        "key": new RegExp(typeof piece["key"] === "string"?piece["key"]:"", "g"),
                        "type": tokenTypes.indexOf(typeof piece["type"] === "string"?piece["type"]:"")
                    })
                }
            }
        }

        //STEP-IN::check
        const Xmas_check = Xmas_setting[key]["Xmas_check"]
        item["check"] = [];
        if(Array.isArray(Xmas_check)){
            for(const piece of Xmas_check){
                if (Object.prototype.toString.call(piece) === '[object Object]' && !Array.isArray(piece)) {
                    const temp:any = {
                        "node": new RegExp(typeof piece["node"] === "string"?piece["node"]:""),
                        "line": new RegExp(typeof piece["line"] === "string"?piece["line"]:""),
                        "isEmptyPass": piece["isEmptyPass"] === true? true:false,
                        "check": [],
                        "check-param": [],
                        "tips": [],
                        "appendix": [],
                    }
                    if(Array.isArray(piece["check"])){
                        for(const piece_check of piece["check"]){
                            if(typeof piece_check === "string"){
                                temp["check"].push(new RegExp(piece_check))
                            }else if(Array.isArray(piece_check)){
                                if(piece_check.length ===3)
                                    temp["check-param"].push([piece_check[0], piece_check[1], new RegExp(piece_check[2])])
                            }
                        }
                    }
                    if(Array.isArray(piece["tips"])){
                        for(const piece_tips of piece["tips"]){
                            if (Object.prototype.toString.call(piece_tips) === '[object Object]' && !Array.isArray(piece_tips)) {
                                const tips = lang.LangText(piece_tips["tips"])
                                temp["tips"].push({
                                    "line":new RegExp(typeof piece_tips["line"] === "string"?piece_tips["line"]:""),
                                    "tips":tips
                                })
                            }
                        }
                    }
                    if(Array.isArray(piece["appendix"])){
                        for(const piece_appendix of piece["appendix"]){
                            if (Object.prototype.toString.call(piece_appendix) === '[object Object]' && !Array.isArray(piece_appendix)){
                                const list = []
                                if(Array.isArray(piece_appendix["list"])){
                                    for(const item of piece_appendix["list"]){
                                        if(typeof item === "string"){
                                            list.push(new RegExp(item))
                                        }
                                    }
                                }
                                const tips = lang.LangText(piece_appendix["tips"])
                                temp["appendix"].push({
                                    "match":new RegExp(typeof piece_appendix["match"] === "string"?piece_appendix["match"]:"", "g"),
                                    "list":list,
                                    "tips":tips
                                })
                            }
                        }
                    }
                    item["check"].push(temp)
                }
            }
        }

        //STEP-IN::template
        const templateList = Xmas_setting[key]["Xmas_template"]
        item["template"] = [];
        for(const list of templateList){
            if (Object.prototype.toString.call(list) === '[object Object]' && !Array.isArray(list)) {
                if(Object.prototype.toString.call(list['template']) !== '[object Object]')
                    continue
                const templateItem:any = {
                    "allowParam":false,
                    "allowNode":false,
                    "param":[],
                    "node":[],
                    "param-all":null,
                    "pair": item["node"] === "node" && Array.isArray(item["node-set"]) && item["node-set"].length>0?[]:null
                }
                TemplateCheck(list['template'], templateItem, null, false, Xmas_sign)
                item["template"].push({
                    "node": new RegExp(typeof list["node"] === "string"?list["node"]:""),
                    "template":templateItem
                })
            }
        }

        //STEP-IN::Push to setting
        setting[target].push(item);
    }

    //STEP::Set nodeCheck
    const escapedString = nodeList.map(EscapeRegExp).join('|');
    nodeCheck[target] = new RegExp(`^\\s*(${escapedString})`)

    //STEP::Convert yaml highlight
    for(const item_1 of configYaml){
        for(const item_2 of item_1){
            item_2["type"] = tokenTypes.indexOf(typeof item_2["type"] === "string"?item_2["type"]:"")
            if("all" in item_2 && item_2.all === true){
                item_2.match = new RegExp(item_2.match.source, item_2.match.flags + 'g')
                continue;
            }
        }
    }
}

//TIPS::Template check
const TemplateCheck = function(template:any, result:any, key:any=null, isRoot = false, Xmas_sign="<<"){
    if(Array.isArray(template)){
        for(const item of template)
            TemplateCheck(item, result, null, isRoot, Xmas_sign)
    } else if(Object.prototype.toString.call(template) === '[object Object]'){
        for(const key in template){
            TemplateCheck(template[key], result, key, isRoot, Xmas_sign)
        }
    } else if(typeof template === "string" && template.startsWith(Xmas_sign)){
        let isNec = true
        let defaultValue = null
        if(key !==null){
            let keyArr = key.split(Xmas_sign, 3)
            if(keyArr.length>1 && keyArr[0] === 'opt'){
                isNec = false
                keyArr.shift();
            }
            if(keyArr.length>1){
                try {
                    defaultValue = JSON5.parse(keyArr[0])
                } catch (error) {
                    defaultValue = keyArr[0]
                } 
            }
        }  
        const setting = template.substring(Xmas_sign.length)
        if(isRoot === false && setting === "node"){
            result['allowNode'] = true
        } else if (isRoot === true && setting.startsWith(`node${Xmas_sign}`)){
            result['allowNode'] = true
            result['node'].push(setting.substring(`node${Xmas_sign}`.length))
        } else if(setting === "param"){
            result['allowParam'] = true
            result['param-all']={
                'isNec':isNec,
                'default':defaultValue
            }
        } else if (setting.startsWith(`param${Xmas_sign}`)){
            result['allowParam'] = true
            result['param'].push({
                'isNec':isNec,
                'default':defaultValue,
                'key':setting.substring(`param${Xmas_sign}`.length)
            })
        } else if (result['pair']!==null && setting.startsWith(`pair${Xmas_sign}`)){
            result['pair'].push({
                'isNec':isNec,
                'key':new RegExp(setting.substring(`pair${Xmas_sign}`.length))
            })
        }
    }
}

//TIPS::Change file
export const ChangeFile = function (path: any) {
    path = path.replace(/\\/g, '/');
    if (path === null) {
        currentSet = null;
        currentHead = null;
        currentNode = null;
        currentSign = null;
        currentTab = null;
        return;
    }
    for (const key in setting) {
        if ((new RegExp(key)).test(path)) {
            currentSet = setting[key]
            currentHead = head[key]
            currentNode = nodeCheck[key];
            currentSign = sign[key];
            currentTab = tab[key];
            return;
        }
    }
    currentSet = null;
    currentHead = null;
    currentNode = null;
    currentSign = null;
    currentTab = null;
}

//TIPS::For insert highlight setting
export const HightlightInsert = function(textList:any, type:number, index:number, char:number, length:number){
    if(length<=0)
        return;

    const newStart = char;
    const newEnd = char + length;
    const highlightList = [];
    for(const itemList of textList[index]["highlight"]){
        const oldStart = itemList['char'];
        const oldEnd = itemList['char'] + itemList['length'];
        if(oldEnd<=newStart || oldStart>=newEnd){
            highlightList.push(itemList);
            continue;
        }
        if(oldStart<newStart){
            highlightList.push({
                char:oldStart,
                length:newStart-oldStart,
                type:itemList['type'],
                modifiers:itemList['modifiers']
            });
        }
        if(oldEnd>newEnd){
            highlightList.push({
                char:newEnd,
                length:oldEnd-newEnd,
                type:itemList['type'],
                modifiers:itemList['modifiers']
            });
        }
    }

    highlightList.push({
        char:char,
        length:length,
        type:type,
        modifiers:0
    });
    highlightList.sort((a:any, b:any)=>a.char-b.char || a.length-b.length);
    textList[index]["highlight"] = highlightList;
}