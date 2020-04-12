import {VueCompilation} from "./VueCompilation"
import * as HtmlParser from "node-html-parser"
import {writeFileSync} from 'fs'

var vue = '<div>\
<div>{{count}}</div>\
<button>点击我</button>\
<div>当前个数{{anotherCount}}</div>\
<div v-for="text in arr">{{text}}</div>\
<div v-if="con"><div v-for="item in arr1"><span>{{item.obj1}}</span><div>{{item.obj}}</div></div></div>\
<button>更新我</button>\
</div>'

var data = {
  count: 9,
  anotherCount: 10,
  con: 2,
  arr: [1, 3, 9],
  arr1: [
    {
      obj: "text1",
      obj1: "1text"
    },
    {
      obj: "text2",
      obj1: "2text"
    },
    {
      obj: "text3",
      obj1: "3text"
    }
  ]
}

var root = VueCompilation.parseVNode(HtmlParser.parse(vue))
var ret = VueCompilation.converToExpression(root.children[0], "data.", [], 1)
var funcPrefx = 
"\tfunction _c(tag, txt){\r\n\
\t\tvar ele = document.createElement(tag)\r\n\
\t\tif (txt){\r\n\
\t\t\tele.appendChild(document.createTextNode(txt))\r\n\
\t\t}\r\n\
\t\treturn ele\r\n\
\t}\r\n\
\tfunction _s(val){\r\n\
\t\treturn val.toString()\r\n\
\t}\r\n\
"
var func = funcPrefx + ret.func
func = "\tvar data = " + JSON.stringify(data) + "\r\n" + func
func = func + "\tdocument.getElementById('app').appendChild(node0)\r\n"
var html = '\
<div id="app">\r\n\
</div>\r\n\
<script type="text/javascript">\r\n'
html = html + func + '</script>\r\n'
writeFileSync("output.html", html)