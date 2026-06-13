"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Load = exports.ChangeFile = void 0;
const fs = require("fs");
const path = require("path");
const hint = require("./xmas/hint");
const readme = require("./xmas/readme");
const node = require("./xmas/node");
const JSON5 = require("json5");
const LoadFile = function (filePath) {
    //STEP::Check path
    if (!fs.existsSync(filePath)) {
        return false;
    }
    //STEP::Convert text to json
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const completions = JSON5.parse(rawData);
    return completions;
};
//TIPS::Change file, need to change 
const ChangeFile = function (filePath) {
    filePath = filePath.replace(/\\/g, '/');
    hint.ChangeFile(filePath);
    readme.ChangeFile(filePath);
    node.ChangeFile(filePath);
};
exports.ChangeFile = ChangeFile;
//TIPS::Load setting
const Load = function (lspSetting, rootPath, ide) {
    //STEP::Load setting map
    const settingPath = path.join(rootPath, 'Christmas', 'Xmas.File.json');
    const setting = LoadFile(settingPath);
    if (setting === false) {
        return false;
    }
    //STEP::Clean setting
    node.Clean();
    hint.Clean();
    readme.Clean();
    //STEP::Load setting
    for (const target in setting) {
        //STEP-IN::Load detail setting
        const settingPath = path.join(rootPath, 'Christmas', setting[target]);
        const detail = LoadFile(settingPath);
        if (detail === false)
            continue;
        lspSetting[target] = {};
        //STEP-IN::Get setting
        const Xmas_tab = Number.isFinite(detail.Xmas_tab) ? detail.Xmas_tab : 4;
        const Xmas_sign = typeof detail?.Xmas_sign === 'string' ? detail.Xmas_sign : '<<';
        const Xmas_template = detail?.Xmas_template ?? {};
        const Xmas_setting = detail?.Xmas_setting &&
            !Array.isArray(detail.Xmas_setting) &&
            Object.keys(detail.Xmas_setting).length !== 0
            ? detail.Xmas_setting
            : {};
        lspSetting[target]["Xmas_tab"] = Xmas_tab;
        lspSetting[target]["Xmas_sign"] = Xmas_sign;
        lspSetting[target]["Xmas_template"] = Xmas_template;
        //STEP-IN::Init setting
        node.Init(target, Xmas_setting, Xmas_tab);
        hint.Init(target, Xmas_sign, Xmas_setting, ide);
        readme.Init(target, Xmas_setting, rootPath, ide);
        //STEP-IN::LSP setting
        lspSetting[target]["Xmas_setting"] = {};
        const pointer = lspSetting[target]["Xmas_setting"];
        for (const key in Xmas_setting) {
            pointer[key] = {};
            pointer[key]["Xmas_node"] = Xmas_setting[key]["Xmas_node"];
            pointer[key]["Xmas_highlight"] = Xmas_setting[key]["Xmas_highlight"];
            pointer[key]["Xmas_check"] = Xmas_setting[key]["Xmas_check"];
            pointer[key]["Xmas_template"] = Xmas_setting[key]["Xmas_template"];
        }
    }
    return true;
};
exports.Load = Load;
//# sourceMappingURL=load.js.map