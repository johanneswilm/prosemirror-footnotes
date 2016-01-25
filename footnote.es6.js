import {
    ProseMirror
}
from "prosemirror/dist/edit/main"
import {
    Pos
}
from "prosemirror/dist/model"
import {
    fromDOM,
    fromHTML
}
from "prosemirror/dist/format"
import {
    Schema,
    defaultSchema,
    Block,
    Inline,
    Attribute
}
from "prosemirror/dist/model"
import {
    elt
}
from "prosemirror/dist/dom"

class Footnote extends Inline {}

Footnote.attributes = {
    fnContents: new Attribute("fnContents")
}

Footnote.register("parseDOM", {
    tag: "span",
    rank: 25,
    parse: function(dom, state) {
        let isFootnote = dom.classList.contains('footnote')
        if (!isFootnote) return false
        state.insert(this, {
            fnContents: dom.getAttribute('footnote-contents'),
        }, null)
    }
})

Footnote.prototype.serializeDOM = node => {
    let dom = elt("span", {
        class: 'footnote'
    })
    dom.setAttribute('footnote-contents', node.attrs.fnContents)
    dom.setAttribute('contenteditable', false)
    return dom
}

Footnote.register("command", {
    name: "insertFootnote",
    label: "Insert footnote",
    run(pm) {
        return tr.insert(selection.head, this.create({
            fnContents: ''
        })).apply()
    },
    menuGroup: 'inline',
    menuRank: 99
})

var fidusSchema = new Schema(defaultSchema.spec.update({
    footnote: Footnote
}))

class FootnoteContainer extends Block {
    get locked() {
        return true
    }
    get selectable() {
        return false
    }
}

FootnoteContainer.register("parseDOM", {
    tag: "div",
    rank: 25,
    parse: function(dom, state) {
        let isFootnoteContainer = dom.classList.contains('footnote-container')
        if (!isFootnoteContainer) return false
        state.wrapIn(dom, this)

    }
})

FootnoteContainer.prototype.serializeDOM = (node, serializer) => {
    let dom = serializer.elt("div", {
        class: 'footnote-container'
    })
    serializer.renderContent(node, dom)
    return dom
}

var fidusFnSchema = new Schema(defaultSchema.spec.update({
    footnotecontainer: FootnoteContainer
}))



var where = document.getElementById('editor'),
    doc = fromDOM(fidusSchema, where),
    editor, fnEditor,
    lastFootnotes = [],
    findFootnotes = rootNode => {
        var footnotes = []

        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name === 'footnote') {
                footnotes.push(inlineNode)
            }
        })

        return footnotes
    },
    getNodePos = (rootNode, searchedNode, searchedNumber) => {
        console.log(searchedNumber)
        var hits = 0,
            foundNode

        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode === searchedNode) {
                if (searchedNumber === hits) {
                    foundNode = {
                        from: new Pos(path, start),
                        to: new Pos(path, end)
                    }
                } else {
                    hits++
                }
            }
        })

        return foundNode
    },
    sameArrayContents = (arrayOne, arrayTwo) => {
        if (arrayOne.length != arrayTwo.length) {
            return false
        }
        return arrayOne.every(function(element, index) {
            return element === arrayTwo[index]
        })
    },
    renderFootnotes = function() {
        var currentFootnotes = findFootnotes(editor.doc),
            footnotesHTML = ''
        if (sameArrayContents(currentFootnotes, lastFootnotes)) {
            return true
        }
        console.log('redrawing footnotes')
        currentFootnotes.forEach(footnote => {
            footnotesHTML += "<div class='footnote-container'>" + footnote.attrs.fnContents + "</div>"
        })
        fnEditor.setContent(fromHTML(fidusFnSchema, footnotesHTML))

        lastFootnotes = currentFootnotes
    },
    updateFootnotes = function() {
        let currentFootnotesElement = fnEditor.getContent('dom'),
            footnotes
        footnotes = [].slice.call(currentFootnotesElement.querySelectorAll('.footnote-container'))
        footnotes.forEach((footnote, index) => {
            if (footnote.innerHTML != lastFootnotes[index].attrs.fnContents) {
                let oldFootnote = lastFootnotes[index]
                console.log('detected change:' + footnote.innerHTML)
                let replacement = oldFootnote.type.create({
                        fnContents: footnote.innerHTML
                    }, null, footnote.styles)
                    // The editor.doc may sometimes contain the same node several times.
                    // This happens after copying, for example. We therefore need to check
                    // how many times the same footnote node shows up before the current
                    // footnote.
                let previousInstances = 0,
                    i
                for (i = 0; i < index; i++) {
                    if (lastFootnotes[i] === lastFootnotes[index]) {
                        previousInstances++
                    }
                }
                let nodePos = getNodePos(editor.doc, oldFootnote, previousInstances)
                lastFootnotes[index] = replacement
                editor.tr.replaceWith(nodePos.from, nodePos.to, replacement).apply()
            }
        })
    },
    makeEditor = function(where, schema) {
        return new ProseMirror({
            place: where,
            menuBar: {
                float: true
            },
            schema: schema
        })
    }
console.log('inner')
where.innerHTML = ''
editor = makeEditor(where, fidusSchema)

fnEditor = makeEditor(document.getElementById('footnote-editor'), fidusFnSchema)
editor.setContent(doc)
renderFootnotes()
editor.on('transform', function(transform, object) {
    if (transform.steps.some(function(step) {
            return step.type === "replace"
        })) {
        renderFootnotes()
    }
})
fnEditor.on('transform', function(transform, object) {
    updateFootnotes()
})
