import * as yaml from 'js-yaml';
import * as lang from '../../load/lang';
import * as config from './config';

function Check_GetType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  const type = typeof value;
  
  if (type === 'object') {
    if (Array.isArray(value)) return 'array';
    if (value.constructor === Object) return 'object';
    return value.constructor.name.toLowerCase();
  }
  
  return type;
}

function EscapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const Check = function(textList:any, index:number){
    //STEP::Get all head text
    let headText:any = [];
    let nextLine = index;
    while(nextLine<textList.length){
        const tempText = " ".repeat(textList[nextLine].indent)+textList[nextLine].text;
        if(config.currentNode.test(tempText))
            break;
        config.YamlHighlight(textList[nextLine].text, textList[nextLine].indent, textList, nextLine);
        textList[nextLine].check = "head";
        if(config.currentHead["allowParam"] === false){
            textList[nextLine].useless = true
            nextLine++;
            continue
        }
        nextLine++;
        headText.push(tempText);
    }
    if(config.currentHead["allowParam"] === false)
        return
    if(headText.length===0)
        headText.push('{}');
  
    //STEP::Check yaml
    try {
        const convert:any = yaml.load(headText.join('\n'));
        if (!(Object.prototype.toString.call(convert) === '[object Object]' && !Array.isArray(convert))){
            let tempIndex = index;
            while(tempIndex<nextLine){
                textList[tempIndex].error.push({"text":`${lang.LangGet("check>>head>>param not object")}`, "start":0, "end":textList[tempIndex].origin.length})
                tempIndex++;
            }
            return;
        }
        const lackKey:any = [];
        const errorKey:any = [];
        const uselessKey:any = [];
        const keyList:any = []
        for(const item of config.currentHead["param"]){
            keyList.push(item['key'])
            if(item['key'] in convert){
                if(item['default']!=null && Check_GetType(item['default']) !== Check_GetType(convert[item['key']])){
                    errorKey.push(item['key'])
                }
            }else if(item['isNec']){
                lackKey.push(item['key']);
            }
        }
        if(config.currentHead["param"].length>0){
            for(const key in convert){
                if(!keyList.includes(key)){
                    uselessKey.push(key)
                }
            }
        }

        if(lackKey.length>0){
            let tempIndex = index === nextLine?0:index;
            textList[tempIndex].error.push({"text":`${lang.LangGet("check>>head>>lack")}${lackKey.join(', ')}`, "start":0, "end":textList[tempIndex].origin.length})
        }if(errorKey.length>0 || uselessKey.length>0){
            let tempIndex = index === nextLine?0:index;
            const indent = textList[tempIndex].indent;
            let escapedString = uselessKey.map(EscapeRegExp).join('|');
            const uselessRegex = new RegExp(`^\\s*(?:'${escapedString.replace(/'/g, "\\'")}'|"${escapedString.replace(/"/g, '\\"')}"|${escapedString})\\s*:`)
            escapedString = errorKey.map(EscapeRegExp).join('|');
            const errorRegex = new RegExp(`^\\s*(?:'${escapedString.replace(/'/g, "\\'")}'|"${escapedString.replace(/"/g, '\\"')}"|${escapedString})\\s*:`)
            let isUseless = false
            while(tempIndex<nextLine){
                if(indent < textList[tempIndex].indent){
                    if(isUseless === true){
                        textList[tempIndex].useless = true
                    }
                    tempIndex++;
                    continue
                }
                isUseless = false
                const tempText = textList[tempIndex].text;
                if(errorKey.length>0){
                    if(tempText.match(errorRegex))
                        textList[tempIndex].error.push({"text":`${lang.LangGet("check>>head>>error")}`, "start":0, "end":tempText.length})
                }
                if(uselessKey.length>0){
                    if(tempText.match(uselessRegex)){
                        textList[tempIndex].useless = true
                        isUseless = true
                    }
                }
                tempIndex++;
            }
        }
    } catch (e: any) {
        if (e.mark) {
            let line = e.mark.line+index;
            line = line>(nextLine-1)?(nextLine-1):line
            textList[line].error.push({"text":`${lang.LangGet("check>>head>>fail")}${e.message}`, "start":0, "end":textList[line].origin.length})
        }
    }
    return;
}