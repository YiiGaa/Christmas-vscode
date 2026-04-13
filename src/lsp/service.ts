import {
    createConnection,
    ProposedFeatures,
    TextDocumentSyncKind,
    SemanticTokens,
    TextDocumentPositionParams,
    CompletionItem,
    TextEdit,
    MarkupKind,
    Hover,
} from 'vscode-languageserver/node';
import * as lang from '../load/lang'
import * as process from './process'
import * as config from './check/config'
import * as load from './load'
import * as xmasHint from './xmas/hint';
import * as xmasReadme from './xmas/readme';
import * as xmasNode from './xmas/node';
import { connect } from 'http2';
import * as JSON5 from 'json5'

//TIPS::Init
export const connection = createConnection(ProposedFeatures.all);
let isWork = false
let ide = "";
connection.onInitialize((params) => {
    let initParam:any= {}
    initParam = params.initializationOptions

    try {
        //STEP::Get editor lang
        lang.LangLoad(initParam["lang"]);

        //STEP::Deal setting
        ide = typeof initParam["ide"] === "string" ? initParam["ide"] : "";
        let setting:any = {}
        load.Load(setting, initParam["root"], ide);

        //STEP::Init setting
        config.Clean();
        for(const target in setting){
            //STEP-IN::Load detail setting
            const detail = setting[target];

            //STEP-IN::Get setting
            const Xmas_sign = typeof detail?.Xmas_sign === 'string' ? detail.Xmas_sign : '<<';
            const Xmas_template = detail?.Xmas_template ?? {};
            const Xmas_setting = detail?.Xmas_setting && 
                                !Array.isArray(detail.Xmas_setting) && 
                                Object.keys(detail.Xmas_setting).length !== 0 
                                ? detail.Xmas_setting 
                                : {};
            const Xmas_tab = Number.isFinite(detail.Xmas_tab)?detail.Xmas_tab:4;
            config.Init(target, Xmas_sign, Xmas_template, Xmas_setting, Xmas_tab);
        }
        isWork = true
    } catch (error) {
        isWork = false
        connection.window.showInformationMessage(lang.LangGet("lsp>>error"))
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP onInitialize: ${message}`);
    }

    return {
        capabilities: { 
            textDocumentSync: TextDocumentSyncKind.Incremental,
            semanticTokensProvider: {
                legend: {
                    tokenTypes: config.tokenTypes,
                    tokenModifiers: config.tokenModifiers
                },
                range: true,
                full: true
            },
            completionProvider: {
                triggerCharacters: xmasHint.GetKey(),
                resolveProvider: false
            },
            hoverProvider: true,
        }
    }
})

//TIPS::File open
connection.onDidOpenTextDocument((params) => {
    try{
        //STEP::Check Init
        if(!isWork)
            return;

        //STEP::Check language id
        if(params.textDocument.languageId !== 'christmas') {
            return;
        }

        //STEP::Init process
        process.Init(params.textDocument.text, params.textDocument.uri, params.textDocument.version, connection);

        //STEP::Check text
        process.Check(0, params.textDocument.uri);
        
    } catch(error){
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP onDidOpenTextDocument, file: ${params.textDocument.uri}, error: ${message}`);
    }
});

//TIPS::File change
connection.onDidChangeTextDocument((params:any) => {
    //STEP::Check Init
    if(!isWork)
        return;

    //STEP::Get change list
    const changes = params.contentChanges;
    if(!Array.isArray(changes))
        return;

    try {
        //STEP::Change file
        load.ChangeFile(params.textDocument.uri)

        //STEP::Get file text
        let textList:any = null
        if(process.fileHouse[params.textDocument.uri] !== undefined)
            textList = process.fileHouse[params.textDocument.uri].textList

        //WHEN::Need to change space
        if(textList!==null
            && changes.length===1
            && changes[0].range.start.line === changes[0].range.end.line && changes[0].range.start.character === changes[0].range.end.character
            && textList[changes[0].range.start.line].origin.length === changes[0].range.start.character
        ){
            const result:any = xmasNode.Trigger(changes[0])
            if(Object.prototype.toString.call(result) === '[object Object]' || Array.isArray(result)){
                let edits: TextEdit[] = [];
                edits.push({
                    range: result.range,
                    newText: result.newText
                });
                //WHEN::IDE is jetbrains, need to move cursor to adapted position
                //TIPS::By default, Jetbrans moving the cursor will force the scroll to be moved to the middle of the screen
                //TIPS::You can set not to scroll automatically, settings->Editor->General, go to 'Scrolling' in the right menu, check 'Move caret, minimize editor scrolling'
                if(ide === "jetbrains"){
                    connection.workspace.applyEdit({
                        label: lang.LangGet("lsp>>adapt"),
                        edit: { changes: { [params.textDocument.uri]: edits } }
                    })
                    .then((applied) => {
                        if (applied.applied) {
                            connection.window.showDocument({
                                uri: params.textDocument.uri,
                                external: true,
                                takeFocus: false,
                                selection: {
                                    start: { line: result.range.end.line, character: result.range.start.character+ result.newText.length },
                                    end: { line: result.range.end.line, character: result.range.start.character+ result.newText.length }
                                }
                            });
                        }
                    });
                }
                //WHEN::Other IDE, just change text, cursor will automatically move to adapted position
                else{
                    connection.workspace.applyEdit({
                        label: lang.LangGet("lsp>>adapt"),
                        edit: { changes: { [params.textDocument.uri]: edits } }
                    })
                }
            }
        }

        //STEP::Change text and recheck
        process.Change(params.contentChanges, params.textDocument.uri, params.textDocument.version);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP onDidChangeTextDocument, file: ${params.textDocument.uri}, error: ${message}`);
    }
});

//TIPS::File close
connection.onDidCloseTextDocument((params) => {
    //STEP::Check Init
    if(!isWork)
        return;

    try{
        process.Close(params.textDocument.uri);
        connection.sendDiagnostics({uri: params.textDocument.uri, diagnostics:[]});
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP onDidCloseTextDocument, file: ${params.textDocument.uri}, error: ${message}`);
    }
    return;
});

//TIPS::Send result to vscode
export const SendResult = function(textList:any, uri:string){
    //STEP::Get error/waring list
    const [diagnostics, rootDefine] = process.GetResult(textList);
    connection.sendDiagnostics({uri: uri, diagnostics:diagnostics})

    //STEP::Update hint
    load.ChangeFile(uri)
    xmasHint.UpdateDefine(rootDefine)
}

//TIPS::HighLight trigger(range)
connection.languages.semanticTokens.onRange(async (params): Promise<SemanticTokens> => {
    try{
        //STEP::Check Init
        if(!isWork)
            return { data: [] };

        //STEP::GEt result
        const result = await process.GetHighLight(params.range, params.textDocument.uri);
        return {
            data: result
        };
    } catch (error) {    
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP semanticTokens.onRange, file: ${params.textDocument.uri}, error: ${message}`);
    }
    return { data: [] };
});

//TIPS::HighLight trigger(full)
connection.languages.semanticTokens.on(async (params): Promise<SemanticTokens> => {
    try{
        //STEP::Check Init
        if(!isWork)
            return { data: [] };

        //STEP::GEt result
        const result = await process.GetHighLight(-1, params.textDocument.uri);
        return {
            data: result
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP semanticTokens.on, file: ${params.textDocument.uri}, error: ${message}`);
    }
    return { data: [] };
});

//TIPS::Hint trigger
connection.onCompletion(
    (params: any): CompletionItem[] => {
        try {
            //STEP::Check Init
            if(!isWork)
                return [];

            //STEP::Change file
            load.ChangeFile(params.textDocument.uri)
            
            //STEP::Get hint list
            const result = xmasHint.Trigger(params.position, params.context.triggerCharacter);
            return result
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            connection.console.error(`[ERR] Christmas LSP onCompletion, file: ${params.textDocument.uri}, error: ${message}`);
        }

        return [];   
    }
);

//TIPS::Hover tips
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
    try {
        //STEP::Check Init
        if(!isWork)
            return null;

        //STEP::Change file
        load.ChangeFile(params.textDocument.uri)

        //STEP::Get result
        const result:any = xmasReadme.Trigger(params.position);
        if(result === null)
            return null
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: result.content
            },
            range:result.range
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`[ERR] Christmas LSP onHover, file: ${params.textDocument.uri}, error: ${message}`);
    }
    return null
});

connection.listen();