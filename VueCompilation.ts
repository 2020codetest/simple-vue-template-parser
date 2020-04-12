import * as HtmlParser from "node-html-parser"

export interface VNode{
    tag: string;
    children: VNode[];
    text: string;
    loop: boolean;
    cond: boolean;
    variable?: string;
    item?: string;
}

export interface FuncGen{
    func: string;
    node: string;
}


export class VueCompilation{
    private static id: number = 0
    private static proccessLoop(text: string, node: VNode){
        const rgx = /^\s*(\w+)\s+in\s+(\w+)\s*$/
        var match = rgx.exec(text)
        node.variable = match[2]
        node.item = match[1]
    }

    private static processText(text: string, prefix: string, itemChain: string[]): string{
        const rgx: RegExp = /\{\{([^\{\}]+)\}\}/g
        var outputText = ""
        var match = rgx.exec(text)
        var preInx = 0
        while(match){
            if (match.index > preInx){
                outputText = outputText + (preInx > 0 ? " + ": "") +  "\"" +  text.substr(preInx, match.index - preInx) + "\" + "
            }

            var variable = match[1]
            var scopedVariable = false
            for (var inx = 0; inx < itemChain.length; ++inx){
                if (variable == itemChain[inx]){
                    scopedVariable = true;
                    break;
                }

                if (variable.startsWith(itemChain[inx] + ".")){
                    scopedVariable = true
                    break
                }
            }

            outputText = outputText + " _s(" + (scopedVariable ? "" : prefix) + match[1] + ")"
            preInx = match.index + match[0].length
            match = rgx.exec(text)
        }
      
        if (preInx){
            if (preInx < text.length){
                outputText = outputText  +  " + \"" + text.substr(preInx, text.length - preInx) + "\""
            }
        }
        else {
            outputText = outputText  +  "\"" + text.substr(preInx, text.length - preInx) + "\""
        }

        return outputText
    }

    private static linePrefix(level: number): string{
        var ret: string = ""
        for (var inx = 0; inx < level; ++inx){
            ret = ret + "\t"
        }

        return ret;
    }

    private static convertToLoopExpression(node: VNode, prefix: string, itemChain: string[], level: number): FuncGen{
        var lineP = this.linePrefix(level)
        var nodeName = "node" + (this.id++)
        var ret = lineP + "var " + nodeName + " = [];\r\n";
        var varaible = prefix
        if (node.variable){
            varaible = varaible + node.variable
        }

        var cloneItemChain:string[] = []
        for (var inx = 0; inx < itemChain.length; ++inx){
            cloneItemChain.push(itemChain[inx])
        }

        cloneItemChain.push(node.item)
        var cloneNode: VNode = {tag: node.tag, children: node.children, text: node.text, cond: false, loop: false}
        var gen = this.converToExpression(cloneNode, nodeName + "data.", cloneItemChain, level + 1)
        ret = ret + lineP + "for (var inx = 0; inx < " + varaible + ".length; ++inx){\r\n"
        ret = ret +  lineP + "\tvar " + node.item + " = " + varaible + "[inx]\r\n"
        ret = ret +  gen.func
        ret = ret + lineP +  "\t" + nodeName + ".push(" + gen.node + ")\r\n"
        ret = ret +  lineP + "}\r\n"

        return {func: ret, node: nodeName}
    }

    static converToExpression(node:VNode, prefix: string, itemChain: string[], level: number): FuncGen{
        var lineP = this.linePrefix(level)
        var nodeName = "node" + (this.id++)
        var ret = ""
        if (node.text) {
            ret = lineP + "var " + nodeName + " = _c('" + node.tag + "', " +  this.processText(node.text, prefix, itemChain) +  ")\r\n"
        }
        else{
            ret = lineP + "var " + nodeName +  " = _c('" + node.tag + "', '')\r\n" 
        }

        for (var inx = 0; inx < node.children.length; ++inx){
            if (node.children[inx].loop){
                var gen = this.convertToLoopExpression(node.children[inx], prefix, itemChain, level)
                ret = ret + gen.func
                ret = ret + lineP + "for (var inx = 0; inx < " + gen.node + ".length; ++inx){\r\n"
                ret = ret + lineP + "\t" + nodeName + ".appendChild(" + gen.node + "[inx])\r\n"
                ret = ret + lineP + "}\r\n"

            }
            else if (node.children[inx].cond)
            {
                var gen = this.converToExpression(node.children[inx], prefix, itemChain, level + 1)
                ret = ret + lineP + "if(" + prefix + node.children[inx].variable + "){\r\n"
                ret = ret + gen.func
                ret = ret +  lineP + "\t" + nodeName + ".appendChild(" + gen.node + ")\r\n"
                ret = ret + lineP + "}\r\n"
            }
            else{
                var gen = this.converToExpression(node.children[inx], prefix, itemChain, level)
                ret = ret + gen.func
                ret = ret + lineP + nodeName + ".appendChild(" + gen.node + ")\r\n"
            }
        }

        return {func: ret, node: nodeName}
    }

    static parseVNode(result: HtmlParser.Node): VNode {
        if (result instanceof HtmlParser.HTMLElement){
            var ele: HtmlParser.HTMLElement = result as HtmlParser.HTMLElement;
            var node: VNode = {tag: ele.tagName, children: [], text: "", loop: false, cond: false}
            if (ele.hasAttribute("v-for")){
                node.loop = true
                this.proccessLoop(ele.getAttribute("v-for"), node)
            }

            if (ele.hasAttribute("v-if")){
                node.cond = true
                node.variable = ele.getAttribute("v-if")
            }

            if (ele.childNodes && ele.childNodes.length) {
                for (var inx = 0; inx < ele.childNodes.length; ++inx){
                    var subNode = this.parseVNode(ele.childNodes[inx])
                    node.children.push(subNode)
                }
            }

            if (node.children.length == 1 && (!node.children[0].tag)){
                node.text = node.children[0].text;
                node.children = []
            }

            return node;
        }
        else if (result instanceof HtmlParser.TextNode){
            var text = result as HtmlParser.TextNode;
            return {tag: "", children: [], text: text.rawText, loop: false, cond: false}
        }
    }
}