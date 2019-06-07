'use babel';

import trim from 'lodash/trim'
import difference from 'lodash/difference'
import isArray from 'lodash/isArray'
import fs from 'fs'
import path from 'path'

import TypeDef from './TypeDef'
import ClassClass from './Class'
import View from './View'
import ViewGroup from './ViewGroup'
import TextView from './TextView'
import ImageView from './ImageView'
import Button from './Button'
import LinearLayout from './LinearLayout'
import RelativeLayout from './RelativeLayout'
import FlowLayout from './FlowLayout'
import include from './include'
import Snippets from './Snippets'

import LayoutParams from './LayoutParams'
import MarginLayoutParams from './MarginLayoutParams'
import RelativeLayoutParams from './RelativeLayoutParams'
import LinearLayoutParams from './LinearLayoutParams'
import FlowLayoutParams from './FlowLayoutParams'
import Banner from './Banner'
import TextInput from './TextInput'
import TextArea from './TextArea'
import PageControlView  from './PageControlView'
import InputTextView from './InputTextView'
import SwitchControl from './SwitchControl'
import VerticalScrollView from './VerticalScrollView'
import NavigationBar from './NavigationBar'
import TableView from './TableView'
import BannerCollectionView from './BannerCollectionView'

import selector from './selector'
import item from './item'
import shape from './shape'
import gradient from './gradient'
import corners from './corners'
import padding from './padding'
import stroke from './stroke'

export default class ClassManager
{
    constructor()
    {
        this.classes = {}
        this.classNames = []
        this.registerClass([
            ClassClass,
            View,
            ViewGroup,
            TextView,
            ImageView,
            Button,
            LinearLayout,
            RelativeLayout,
            FlowLayout,
            Banner,
            TextInput,
            TextArea,
            PageControlView,
            InputTextView,
            SwitchControl,
            VerticalScrollView,
            NavigationBar,
            TableView,
            BannerCollectionView,

            LayoutParams,
            MarginLayoutParams,
            RelativeLayoutParams,
            LinearLayoutParams,
            FlowLayoutParams,

            include,

            selector,
            item,
            shape,
            gradient,
            corners,
            padding,
            stroke,
        ])

        this.hasScannedDir = {}
    }

    registerClass(aClass)
    {
        let classArray = Array.isArray(aClass) ? aClass : [aClass]
        classArray.map((cls) => {
            this.classes[cls.class] = cls
            this.classNames.push(cls.class)
        })
        this.classNames = this.classNames.sort()
    }

    getClassByName(className)
    {
        return this.classes[className]
    }

    layoutParamsClassHierarchyKeys(layoutClassName)
    {
        let layoutAllKeys = []
        if(layoutClassName)
        {
            let layoutClassRule = this.getClassByName(layoutClassName)
            if(layoutClassRule)
            {
                layoutAllKeys.push(...this.classHierarchyKeys(layoutClassRule.parent))
                let layoutClassKeys = Object.keys(layoutClassRule.properties||{})
                layoutAllKeys.push(...layoutClassKeys)
            }
        }

        return layoutAllKeys
    }

    classHierarchyKeys(className, parentClassName)
    {
        let allKeys = []
        if(className)
        {
            let classRule = this.getClassByName(className)
            if(classRule)
            {
                allKeys.push(...this.classHierarchyKeys(classRule.parent,"ViewGroup"))
                let classKeys = Object.keys(classRule.properties||{})
                allKeys.push(...classKeys)

                let parentClassRule = this.getClassByName(parentClassName)
                if(parentClassRule)
                {
                    let layoutParamsClassKeys = this.layoutParamsClassHierarchyKeys(parentClassRule.layoutClass)
                    allKeys.push(...layoutParamsClassKeys)
                }
            }
        }
        return allKeys;
    }

    classValueForKey(className, keyName)
    {
        let valueRule
        if(className && keyName)
        {
            let classRule = this.getClassByName(className)
            if(classRule && classRule["properties"])
            {
                valueRule = classRule["properties"][keyName]
                if(!valueRule)
                {
                    valueRule = this.classValueForKey(classRule.parent, keyName)
                }
            }
        }
        return valueRule
    }

    layoutClassValueForKey(layoutClassName, keyName)
    {
        let valueRule
        if(layoutClassName && keyName)
        {
            let layoutClassRule = this.getClassByName(layoutClassName)
            if(layoutClassRule && layoutClassRule.layoutClass)
            {
                valueRule = this.classValueForKey(layoutClassRule.layoutClass, keyName)
            }
        }
        return valueRule
    }

    getGlobalSnippets(){
        let customSnippets = Snippets
        return customSnippets || []
    }

    classSuggestions(classDict, parentDict, curBrothers, input, isKey, isValue, keyString)
    {
        parentDict = parentDict || {}
        if(isKey)
        {
            let allKeys = this.classHierarchyKeys((classDict.class || 'Class'), (parentDict.class || "ViewGroup"))
            let alreadyKeys = Object.keys(classDict)
            allKeys = difference(allKeys, alreadyKeys)
            let matchedArray = this.matchArrayStringName(input, allKeys)
            return matchedArray
        }
        else if(isValue && keyString)
        {
            if(keyString === 'class')
            {
                let matchedArray = this.matchClassName("")
                matchedArray = this.matchArrayStringName(input, matchedArray)
                return matchedArray
            }

            if(classDict)
            {
                this.configIdArray(curBrothers, classDict)
                let valueRule = this.classValueForKey(classDict.class, keyString)
                if(!valueRule)
                {
                    valueRule = this.layoutClassValueForKey((parentDict.class || "ViewGroup"), keyString)
                }
                valueRule = valueRule || {}
                let matchedArray = this.classValueSuggestions(valueRule, input)
                matchedArray = this.matchArrayStringName(input, matchedArray)
                return matchedArray
            }

        }
    }

    configIdArray(curBrothers, curDict)
    {
        if(curDict && curBrothers && isArray(curBrothers))
        {
            let idTypeRule = {}
            idTypeRule.suffix = []
            curBrothers.map( view => {
                if(view.id && curDict.hasOwnProperty('id') && view.id != curDict.id)
                {
                    idTypeRule.suffix.push(view.id)
                }
            })
            TypeDef['Id'] = idTypeRule
        }
    }

    classValueSuggestions(valueRule, input)
    {
        return this.matchedAndArrayWithType(valueRule, input)
    }

    matchedAndArrayWithType(valueRule, input)
    {
        if(input == undefined || valueRule == undefined)
        {
            return []
        }

        input = trim(input, '"')

        let matchedAndArray
        if(valueRule.type)
        {
            valueRule.type = valueRule.type || []
            if(valueRule.type && !isArray(valueRule.type))
            {
                valueRule.type = [valueRule.type]
            }
            valueRule.type.map( (type) => {
                let matchArray = this.matchedAndArrayWithType(TypeDef[type], input)
                if(matchArray)
                {
                    matchedAndArray = matchedAndArray || []
                    matchedAndArray.push(...matchArray)
                }
            })
        }
        else
        {
            matchedAndArray = []
        }

        if(matchedAndArray && 0 == matchedAndArray.length )
        {
            let prefix = valueRule.prefix
            let suffix = valueRule.suffix
            let items = valueRule.items
            if(items)
            {
                for(let i=0; i<items.length; i++)
                {
                    let item = items[i]
                    let matchedItemArray = this.matchedAndArrayWithType(item, input)
                    if(matchedItemArray && matchedItemArray.length > 0)
                    {
                        matchedAndArray = matchedItemArray
                        break
                    }
                }
            }
            else if(prefix)
            {
                let matchedResult = input.match(new RegExp(prefix))
                if(matchedResult)
                {
                    let matchedPrefix = matchedResult[1] || ""
                    let matchedSuffix = matchedResult[2] || ""
                    if(suffix && suffix.length>0)
                    {
                        matchedAndArray = this.matchArrayStringName(matchedSuffix, suffix, matchedPrefix)
                    }
                    matchedAndArray = matchedAndArray || []
                }
            }
            else
            {
                if(suffix)
                {
                    matchedAndArray = this.matchArrayStringName(input, suffix) || []
                }
            }
        }
        return matchedAndArray
    }

    matchClassName(className)
    {
        return this.matchArrayStringName(className, this.classNames)
    }

    matchArrayStringName(curKey, inArrayName, prefix="")
    {
        curKey = curKey || ""
        curKey = trim(curKey, '"')
        let matchedPrefix = []
        let matchedContinuous = []
        let matchedContents = []
        let matchedContentsWeight = {}
        inArrayName.map((clsName) => {
            let oriClsName = clsName
            clsName = clsName.toLowerCase()
            curKey = curKey.toLowerCase()
            let index = clsName.indexOf(curKey)
            if(0 == index)
            {
                matchedPrefix.push(prefix + oriClsName)
            }
            else if(index > 0)
            {
                matchedContinuous.push(prefix + oriClsName)
            }
            else
            {
                let curKeyLength = curKey.length
                let notAdd = curKeyLength >= clsName.length
                let weight = 0;
                if(curKeyLength < clsName.length )
                {
                    let nextStartMatch = {}
                    for(let i=0; i<curKeyLength; i++)
                    {
                        let nextLoc = nextStartMatch[0] || 0
                        let cSortIndex = clsName.substr(nextLoc).indexOf(curKey[i])
                        let cNormalIndex = clsName.indexOf(curKey[i])
                        if(cSortIndex < 0 && cNormalIndex >= 0)
                        {
                            weight += 100;
                        }
                        if(cSortIndex < 0 && cNormalIndex < 0)
                        {
                            notAdd = true
                            break
                        }
                        cSortIndex += nextLoc
                        weight += cSortIndex
                        nextStartMatch[0] = cSortIndex + 1
                    }
                }
                if(!notAdd)
                {
                    matchedContents.push(prefix + oriClsName)
                    matchedContentsWeight[prefix + oriClsName] = weight;
                }
            }
        })

        let sortFun = function(s1, s2) {
            return s1.toLowerCase() >= s2.toLowerCase()
        }
        matchedPrefix = matchedPrefix.sort(sortFun)
        matchedContinuous = matchedContinuous.sort(sortFun)
        matchedContents = matchedContents.sort(function(s1, s2) {
            if( matchedContentsWeight[s1] == matchedContentsWeight[s2] )
            {
                return sortFun(s1, s2)
            }
            else
            {
                return matchedContentsWeight[s1] > matchedContentsWeight[s2]
            }
        })
        let resultMatched = [...matchedPrefix, ...matchedContinuous, ...matchedContents]
        if(resultMatched.length == 0) resultMatched = inArrayName.sort()
        return resultMatched
    }

    scanResource(filepath)
    {
        let resourceRootPath = this.searchResourceRootPath(filepath)
        if(resourceRootPath)
        {
            let subdirs = ['layout', 'drawable', 'color', 'values', 'script']
            let allResName = {}
            let readResourceValues = this.readResourceValues
            subdirs.forEach(function(subdir) {
                allResName[subdir] = []
                let subfullpath = path.resolve(resourceRootPath, subdir)
                let files = fs.readdirSync(subfullpath);
                files.forEach(function (filename) {
                    var fullname = path.join(subfullpath, filename)
                    var stats = fs.statSync(fullname)
                    if (stats.isFile())
                    {
                        if(subdir === 'values')
                        {
                            allResName[subdir] = allResName[subdir] || {}
                            readResourceValues(fullname, allResName[subdir])
                        }
                        else
                        {
                            let filename = path.parse(fullname).name
                            if(subdir === 'script' && filename === 'main')
                            {
                                return;
                            }
                            let matchNamePre = filename.match(/(.+)(?:@1x|@2x|@3x|@4x)/)
                            if(matchNamePre && matchNamePre.length >= 2)
                            {
                                filename = matchNamePre[1]
                            }
                            allResName[subdir].push(filename)
                        }
                    }
                })
            })
            this.configResource(allResName)
        }
    }

    configResource(allResName)
    {
        let allSubdirs = Object.keys(allResName)
        allSubdirs.map( (subdir) => {
            switch(subdir)
            {
                case 'layout':
                    TypeDef['Layout'].suffix = TypeDef['Layout'].suffix || []
                    allResName[subdir].map( name => {
                        TypeDef['Layout'].suffix.push('@layout/'+name)
                    })
                break

                case 'drawable':
                    TypeDef['Drawable'].suffix = TypeDef['Drawable'].suffix || []
                    allResName[subdir].map( name => {
                        TypeDef['Drawable'].suffix.push('@drawable/'+name)
                    })
                break

                case 'color':
                    TypeDef['Color'].suffix = TypeDef['Color'].suffix || []
                    allResName[subdir].map( name => {
                        TypeDef['Color'].suffix.push('@color/'+name)
                    })
                break

                case 'script':
                    TypeDef['Script'].suffix = TypeDef['Script'].suffix || []
                    allResName[subdir].map( name => {
                        TypeDef['Script'].suffix.push('@script/'+name)
                    })
                break

                case 'values':
                    TypeDef['Color'].suffix = TypeDef['Color'].suffix || []
                    let colorsKeys = Object.keys(allResName[subdir].colors)
                    colorsKeys.map( name => {
                        TypeDef['Color'].suffix.push('@color/'+name)
                    })

                    TypeDef['TextString'].suffix = TypeDef['TextString'].suffix || []
                    let stringsKeys = Object.keys(allResName[subdir].strings)
                    stringsKeys.map( name => {
                        TypeDef['TextString'].suffix.push('@string/'+name)
                    })

                    let dimensKeys = Object.keys(allResName[subdir].dimens)
                    dimensKeys.map( name => {
                        TypeDef['Dimension']['items'][1].suffix.push('@dimen/'+name)
                    })

                break
            }
        })
    }

    readResourceValues(valueFilepath, toRes)
    {
        if('.json' === path.parse(valueFilepath).ext)
        {
            let valueJson = require(valueFilepath)
            if(valueJson)
            {
                toRes.colors  = Object.assign(toRes.colors  || {}, valueJson.colors  || {})
                toRes.strings = Object.assign(toRes.strings || {}, valueJson.strings || {})
                toRes.dimens  = Object.assign(toRes.dimens  || {}, valueJson.dimens  || {})
            }
        }
    }

    searchResourceRootPath(filepath)
    {
        if(this.hasScannedDir[filepath])
        {
            return
        }
        this.hasScannedDir[filepath] = true

        if(filepath != '/')
        {
            if(this.isDirectory(filepath))
            {
                let isExist = fs.existsSync(filepath + '/layout')
                if(isExist)
                {
                    if(this.isDirectory(filepath + '/layout'))
                    {
                        return filepath
                    }
                }
            }
            return this.searchResourceRootPath(path.resolve(filepath, '../'))
        }
    }

    isDirectory(filepath)
    {
        let stats = fs.statSync(filepath)
        return stats.isDirectory()
    }

}
