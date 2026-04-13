const en = {
    "more":"↪ More",
    "lsp>>limit":"[WRN] Please close some .xmas files!!! Too many .xmas files have been opened, which may cause memory overflow or performance problems",
    "lsp>>error":"[ERR] Christmas lsp load setting fail, Christmas/Xmas.File.json",
    "lsp>>adapt":"Automatically adapts YAML",
    "check>>head>>param not object":"[ERR] Head setting must be an object({})",
    "check>>head>>useless":"[WRN] Useless key: ",
    "check>>head>>lack":"[ERR] Head setting lack necessary key: ",
    "check>>head>>error":"[ERR] Value type is incorrect",
    "check>>head>>fail":"[ERR] YAML syntax error: ",
    "check>>node>>tab key":"[ERR] Can not use tab(\\t), indentation units(spaces): ",
    "check>>node>>tab size":"[ERR] Please unify the indentation units, units(spaces): ",
    "check>>node>>root":"[ERR] The root node needs to be aligned at the top",
    "check>>node>>illegal intent":"[ERR] Node indentation is incorrect",
    "check>>node>>pair not found":"[ERR] Unmatched node",
    "check>>node>>pair lack match":"[ERR] No matching required node",
    "check>>node>>param intent":"[WRN] Parameter indentation should be under the node",
    "check>>node>>param not found":"[ERR] Parameter not found",
    "check>>node>>param yaml fail":"[ERR] Parameter YAML syntax error: ",
    "check>>node>>param key lack":"[ERR] Parameter lack necessary key: ",
    "check>>node>>param type wrong":"[ERR] Value type is incorrect",
    "check>>node>>param not object":"[ERR] Parameter is not an object({})",
    "check>>node>>illegal line":"[ERR] Illegal setting, tips: ",
    "check>>node>>root repeat":"[ERR] Root node repeated definition",
    "check>>node>>line check fail(tips)":"[ERR] Illegal setting, tips: ",
    "check>>node>>line check fail":"[ERR] Illegal setting",
    "check>>node>>useless":"[WRN] Useless code",
    "readme>>path":"[ERR] Open readme fail: ",
    "setting>>file not found":"[WRN] file not found: ",
    "xmas>>not run":".Xmas check is not started",
    "xmas>>exception":"[ERR] . Xmas check configuration loading exception, Christmas/Xmas.File.json",
}   

const zh = {
    "more":"↪ 更多",
    "lsp>>limit":"[WRN] 请关闭一些.xmas文件!!! 已经打开太多.xmas文件，可能会导致内存溢出或性能问题",
    "lsp>>error":"[ERR] Christmas lsp 加载设置失败, Christmas/Xmas.File.json",
    "lsp>>adapt":"自动适配YAML语法",
    "check>>head>>param not object":"[ERR] 头参数必须是对象({})",
    "check>>head>>useless":"[WRN] 无用的key: ",
    "check>>head>>lack":"[ERR] 头设置缺少必要key: ",
    "check>>head>>error":"[ERR] 值类型有误",
    "check>>head>>fail":"[ERR] YAML语法错误: ",
    "check>>node>>tab key":"[ERR] 不能使用制表符(\\t), 缩进单元(空格): ",
    "check>>node>>tab size":"[ERR] 请统一缩进单元, 缩进单元(空格): ",
    "check>>node>>root":"[ERR] 根节点需要顶格",
    "check>>node>>illegal intent":"[ERR] 节点缩进有误",
    "check>>node>>pair not found":"[ERR] 未匹配节点",
    "check>>node>>pair lack match":"[ERR] 未匹配必要节点",
    "check>>node>>param not found":"[ERR] 未找到参数",
    "check>>node>>param intent":"[WRN] 参数缩进最好在节点之下",
    "check>>node>>param yaml fail":"[ERR] 参数YAML语法错误: ",
    "check>>node>>param key lack":"[ERR] 参数缺少必要设置: ",
    "check>>node>>param type wrong":"[ERR] 参数值类型有误",
    "check>>node>>param not object":"[ERR] 参数不是对象({})",
    "check>>node>>illegal line":"[ERR] 非法设置, 提示: ",
    "check>>node>>root repeat":"[ERR] 根节点重复定义",
    "check>>node>>line check fail(tips)":"[ERR] 非法设置, 提示: ",
    "check>>node>>line check fail":"[ERR] 非法设置",
    "check>>node>>useless":"[WRN] 无用代码",
    "setting>>file not found":"[WRN] 文件不存在: ",
    "readme>>path":"[ERR] 打开readme文件失败: ",
    "xmas>>not run":".xmas检查未启动",
    "xmas>>exception":"[ERR] .Xmas检查配置加载崩溃, Christmas/Xmas.File.json",
}

const lang:any = {
    "":zh,
    "zh":zh,
    "en":en
}

let langSet:any = en;
let textLang = ""
export const LangLoad = function(language:string){
    textLang = language;
    //textLang = ""
    for(const key in lang){
        if(key === language){
            langSet = lang[key]
            return;
        }
    }
    for(const key in lang){
        if(language.includes(key)){
            langSet = lang[key]
            return;
        }
    }
    if("" in lang)
        langSet = lang[""]
}

export const LangGet = function(setting:string){
    if(setting in langSet)
        return langSet[setting]
    else
        return setting
}

export const LangText = function(setting:any){
    if(typeof setting === 'string'){
        return setting;
    } else if(Object.prototype.toString.call(setting) === '[object Object]' && !Array.isArray(setting)){
        if(textLang in setting){
            return setting[textLang]
        } else {
            for(const key in setting)
                if(textLang.includes(key))
                    return setting[key]
        }
        if("" in setting)
            return setting[""]
        return ""
    }
    return ""
}