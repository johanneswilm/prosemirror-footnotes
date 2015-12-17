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
  parse: function(dom, state) {
    let isFootnote = dom.classList.contains('footnote')
    if (!isFootnote) return false
    state.insertFrom(dom, this, {
        fnContents: dom.getAttribute('footnote-contents'),
    }, null)
  }
})

Footnote.prototype.serializeDOM = node => {
  let dom = elt("span", {class: 'footnote'})
  dom.setAttribute('footnote-contents', node.attrs.fnContents)
  dom.setAttribute('contenteditable', false)
  return dom
}

Footnote.register("command", {
  name: "insertFootnote",
  label: "Insert footnote",
  run(pm) {
    return pm.tr.insert(pm.selection.head, this.create({fnContents:''})).apply()
  },
  menuGroup: 'inline',
  menuRank: 99
})

class FootnoteContainer extends Block {
  get locked() { return true }
  get selectable() { return false }
}

FootnoteContainer.register("parseDOM", {
  tag: "div",
  rank: 25,
  parse: function (dom, state) {
    let isFootnoteContainer = dom.classList.contains('footnote-container')
    if (!isFootnoteContainer) return false
    state.enterFrom(dom, this, null)
    state.addAll(dom.firstChild, null, true)
    state.leave()
  }
})

FootnoteContainer.prototype.serializeDOM = (node, serializer, third, fourth) => {
  let dom = serializer.elt("div", {
    class: 'footnote-container'
  })
  serializer.renderContent(node, dom)
  return dom
}

export const fidusSchema = new Schema(defaultSchema.spec.updateNodes({footnote: Footnote}))
export const fidusFnSchema = new Schema(defaultSchema.spec.updateNodes({footnotecontainer: FootnoteContainer}))
