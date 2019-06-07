'use babel';

import includes from 'lodash/includes'
import trimStart from 'lodash/trimStart'
import trim from 'lodash/trim'

import { tokenize, TokenType } from './tokenizer'
import { provideStructure } from './structure-provider'
import { matches } from './utils'

import ClassManager from '../Views/ClassManager'
import Snippets from '../Views/Snippets'

let fs = require('fs');

export default class AlayoutProvider
{
    constructor()
    {
        this.selector = '.source.json'
        this.inclusionPriority = 0
        // this.excludeLowerPriority = true
        this.clsMgr = new ClassManager
    }

    getCurKey(lineText, bufferPosition)
    {
        let ePos = lineText.lastIndexOf('"')
        if(ePos > 0)
        {
            let sPos = lineText.substr(0, ePos-1).lastIndexOf('"')
            if(sPos >= 0)
            {
                return lineText.substr(sPos+1, ePos-1-sPos)
            }
        }
        return null
    }

    matchSuggestionsArray(replacePrefix, matchedArray, prefix, suffix)
    {
        retCompelete = []
        prefix = prefix || ""
        suffix = suffix || ""
        replacePrefix = trim(replacePrefix, '"\n')
        matchedArray = matchedArray || []

        //这里给添加自己的代码片段,目前没有匹配
        let customer = this.clsMgr.getGlobalSnippets()
        let finallist = this.getCustomerMatchList(replacePrefix,customer)
        // matchedArray = matchedArray.concat(finallist)
        matchedArray = finallist.concat(matchedArray)

        matchedArray.map((className) => {

            if(typeof(className) == "string"){
                retCompelete.push( {
                    text: prefix + className + suffix,
                    snippet: prefix + className + suffix,
                    description:"百度一下",
                    replacementPrefix: replacePrefix,
                    type: 'attribute',
                    descriptionMoreURL:this.getDocsURL(className)
                })
            }else{

                let body = JSON.stringify(className.body,null,'\t')
                let display = className.name
                let desc  = className.description
                retCompelete.push( {
                    text: body,
                    snippet: body,
                    description: desc,
                    displayText: display,
                    replacementPrefix: replacePrefix,
                    type: 'value',
                    rightLabel: "Snippeets"
                })
            }


        })
        return retCompelete
    }

    //自定义代码块模糊匹配
    getCustomerMatchList(curKey,matchlist){
        curKey = curKey || ""
        curKey = trim(curKey, '"')
        let matchedContents = []

        matchlist.map((body) => {
            let name = body.name
            name = name.toLowerCase()
            curKey = curKey.toLowerCase()
            let index = name.indexOf(curKey)
            if(index >= 0)
            {
                matchedContents.push(body)
            }

        })
        return matchedContents
    }

    //去百度查找文档
    getDocsURL(name){
        return "https://www.baidu.com/s?wd=android:" + name;
    }

    getPrefix(editor, bufferPosition)
    {
        let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
        let matchArray = line.match(/.*/)
        if(matchArray && matchArray.length > 0)
        {
            return matchArray[0]
        }
        return ''
    }

    getSuggestions(originalRequest)
    {
        let {editor, bufferPosition, scopeDescriptor, prefix, activatedManually} = originalRequest

        let lineText = editor.lineTextForBufferRow(bufferPosition.row)
        let retCompelete = null;
        let curChar = lineText.charAt(bufferPosition.column - 1)
        if (curChar === ',' && !activatedManually)
        {
            return Promise.resolve([]) // hack, to prevent activation right after inserting a comma
        }
        this.clsMgr.scanResource(editor.buffer.file.path)

        return tokenize(editor.getText())
        .then(tokens => provideStructure(tokens, bufferPosition))
        .then(structure => {
            let matchedSuggestions = []
            let contents = structure.contents
            if(structure.positionInfo)
            {
                let positionInfo = structure.positionInfo
                let segments = positionInfo.segments
                let editedToken = positionInfo.editedToken
                if(segments && editedToken && editedToken.src)
                {
                    let curDict = contents
                    let parentDict
                    let curBrothers
                    let index = 0
                    let length = segments.length - (segments.length % 2)
                    if(length >= 2) parentDict = contents

                    while(index < length)
                    {
                        curDict = curDict[segments[index]]
                        if(index < length-2)
                        {
                            parentDict = curDict
                        }
                        else if(index == length -2)
                        {
                            curBrothers = curDict
                        }
                        ++index
                    }

                    lastSegment = segments[segments.length-1]
                    let stringArray = this.clsMgr.classSuggestions(curDict, parentDict, curBrothers, editedToken.src, positionInfo.keyPosition, positionInfo.valuePosition, lastSegment)
                    if(positionInfo.keyPosition)
                    {
                        let quote = editedToken.src.startsWith('"') ?'':'"'
                        let suffix = (quote.length>0) ? '": ' : ''
                        matchedSuggestions = this.matchSuggestionsArray(editedToken.src, stringArray, quote, suffix)
                    }
                    else if(positionInfo.valuePosition)
                    {
                        let quote = editedToken.src.startsWith('"') ?'':'"'
                        let comma = (quote.length>0) ? ',' : ''
                        matchedSuggestions = this.matchSuggestionsArray(editedToken.src, stringArray, quote, quote + comma)
                    }
                }
            }else{
                let editedToken = structure.tokens[0]
                matchedSuggestions = this.matchSuggestionsArray(editedToken.src, [], '', '')
            }
            return matchedSuggestions || []
        })
    }

    onDidChangeCursorPosition(event)
    {
        let editor = event.cursor.editor;
        let bufferPosition = event.newBufferPosition;

        let lineText = editor.lineTextForBufferRow(bufferPosition.row)
        let retCompelete = null;
        let curChar = lineText.charAt(bufferPosition.column - 1)

        return tokenize(editor.getText())
        .then(tokens => provideStructure(tokens, bufferPosition))
        .then(structure => {
            let matchedSuggestions = []
            let contents = structure.contents
            if(structure.positionInfo)
            {
                let positionInfo = structure.positionInfo
                let segments = positionInfo.segments
                let editedToken = positionInfo.editedToken
                if(segments && editedToken && editedToken.src)
                {
                    let curDict = contents
                    let parentDict
                    let curBrothers
                    let index = 0
                    let length = segments.length - (segments.length % 2)
                    if(length >= 2) parentDict = contents

                    while(index < length)
                    {
                        curDict = curDict[segments[index]]
                        if(index < length-2)
                        {
                            parentDict = curDict
                        }
                        else if(index == length -2)
                        {
                            curBrothers = curDict
                        }
                        ++index
                    }
                    var text = this.sortKeysAndValues(curDict);
                    if(text != this.curFocusText)
                    {
                        this.curFocusText = text;
                        fs.writeFileSync("/tmp/__alayout_focus.txt", text);
                    }
                }
            }
        })
    }

    sortKeysAndValues(dict)
    {
        var keys = Object.keys(dict || {});
        keys.sort();
        var content = keys.join('');

        keys.forEach(key => {
            if(key == 'children')
                return;

            var str = dict[key];
            if(typeof str == 'object')
            {
                str = this.sortKeysAndValues(str);
            }
            content += str;
        })
        return content;
    }

    checkScrollPostion(editor)
    {
        try{
            let content = fs.readFileSync("/tmp/__alayout_focus_editor.json").toString();
             if(content && content != this.content)
             {
                let object = JSON.parse(content);
                let filepath = object.filepath;
                let jsonobject = object.jsonpath;

                let curFilename = editor.getFileName();

                var needActiveCurrentEditor = false;

                if(filepath.indexOf(atom.workspace.project.rootDirectories[0].realPath) >= 0)
                {
                    let activeEditor = (atom.workspace.getActivePane()||{}).activeItem;

                    let editors = atom.workspace.getTextEditors() || [];
                    var i = 0;
                    for(; i<editors.length; i++)
                    {
                        let editor = editors[i];
                        console.log("editor.getPath() = "+editor.getPath()+ " filepath="+filepath);
                        if(editor.getPath() == filepath) {
                            console.log("editor.getPath() == filepath:"+(editor.getPath() == filepath));
                            if(activeEditor != editor) {
                                console.log("(activeEditor != editor):"+(activeEditor != editor));
                                needActiveCurrentEditor = true;
                            }
                            break;
                        }
                    }
                    if(i >= editors.length) {
                        atom.workspace.open(filepath);
                        return;
                    }
                }
                if(filepath.endsWith(curFilename))
                {
                    let run = () =>
                    {
                        this.content = content;
                        try{
                            fs.unlinkSync('/tmp/__alayout_focus_editor.json');
                        }catch(e){}

                        let text = editor.getText();
                        if(!text) {
                            text = fs.readFileSync(filepath).toString();
                        }

                        var set = new Set();
                        jsonobject['['] = '\\[';
                        jsonobject[']'] = '\\]';
                        jsonobject['{'] = '\\{';
                        jsonobject['}'] = '\\}';
                        set = this.getRowIndexs(set, editor, jsonobject);
                        let arr = new Array(...set).sort((a,b) => a-b);
                        var maxLength = 0;
                        var maxIndex = 0;
                        var i,j;
                        for(i=0; i<arr.length; i++)
                        {
                            for(j=i+1; j<arr.length; j++) {
                                if(arr[j] - arr[i] != j - i) {
                                    if(maxLength < j-i){
                                        maxIndex = arr[i];
                                        maxLength = j-i;
                                    }
                                    i = j;
                                    break;
                                } else {
                                    if(maxLength < j-i){
                                        maxIndex = arr[i];
                                        maxLength = j-i;
                                    }
                                }
                            }
                        }
                        console.log(maxIndex);
                        editor.setCursorBufferPosition({row:maxIndex, column:0});
                        editor.selectDown(maxLength);
                        editor.scrollToBufferPosition({row:(parseInt(maxIndex + maxLength/2)), column:0 });
                    }

                    if(needActiveCurrentEditor){
                        atom.workspace.open(filepath);
                        setTimeout(run, 1000);
                    } else {
                        run();
                    }
                }
            }
        }catch(e){

        }
    }

    getRowIndexs(set, editor, value)
    {
        if(Array.isArray(value)){
            value.forEach(item => {
                set = new Set([...set,...(this.getRowIndexs(set, editor, item))]);
            });
        }
        else if(typeof value == 'object')
        {
            set = this.getRowIndexs(set, editor, Object.values(value));
        }
        else {
            let regExp = new RegExp(value+'','g');
            editor.scan(regExp, function(object) {
                set.add(object.range.start.row)
            });
        }
        return set;
    }

    onDidInsertSuggestion(editor, triggerPosition, suggestion)
    {
    }
}
