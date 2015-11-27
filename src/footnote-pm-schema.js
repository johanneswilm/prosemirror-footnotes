import {SchemaSpec, Schema, defaultSchema, Block, Textblock, Inline, Text,
        Attribute, StyleType} from "../../prosemirror/src/model"

import {elt} from "../../prosemirror/src/dom"

import {wrap} from "../../prosemirror/src/serialize/dom"


class Footnote extends Inline {
}

Footnote.attributes = {fnContents: new Attribute("fnContents")}

Footnote.register("parseDOM", {
  tag: "span",
  rank: 25,
  parse: (dom, context, type, attrs) => {
    let isFootnote = dom.classList.contains('footnote')
    if (!isFootnote) return false
    context.insertFrom(dom, type, {
        fnContents: dom.getAttribute('footnote-contents'),
    })
  }
})

Footnote.prototype.serializeDOM = node => {
  let dom = elt("span", {class: 'footnote'})
  dom.setAttribute('footnote-contents', node.attrs.fnContents)
  dom.setAttribute('contenteditable', false)
  return dom
}

Footnote.attachCommand("insertFootnote", nodeType => ({
  label: "Insert footnote",
  run(pm) {
    return pm.tr.insertInline(pm.selection.head, nodeType.create({fnContents:''})).apply()
  },
  menuGroup: 'inline',
  menuRank: 99
}))

class FootnoteContainer extends Block {
  get locked() { return true }
  get selectable() { return false }
}

FootnoteContainer.register("parseDOM", {
  tag: "div",
  rank: 25,
  parse: (dom, context, type, attrs) => {
    let isFootnoteContainer = dom.classList.contains('footnote-container')
    if (!isFootnoteContainer) return false
    context.enterFrom(dom, type, attrs)
    context.addAll(dom.firstChild, null, true)
    context.leave()
  }
})

FootnoteContainer.prototype.serializeDOM = (node, options) => {
  //let dom = elt("div", {class: 'footnote-container'})
  let dom = wrap(node, options, "div")
  dom.setAttribute("class", 'footnote-container')
  return dom
}

export const fidusSchema = new Schema(defaultSchema.spec.updateNodes({footnote: Footnote}))
export const fidusFnSchema = new Schema(defaultSchema.spec.updateNodes({footnotecontainer: FootnoteContainer}))
