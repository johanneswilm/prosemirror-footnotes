window.pm = {
  ProseMirror: require("../../prosemirror/src/edit/main").ProseMirror,
  Pos: require("../../prosemirror/src/model").Pos,
  Node: require("../../prosemirror/src/model").Node,
  fromDOM: require("../../prosemirror/src/parse/dom").fromDOM,
  fromHTML: require("../../prosemirror/src/parse/dom").fromHTML,
  fidusSchema: require("./footnote-pm-schema").fidusSchema,
  fidusFnSchema: require("./footnote-pm-schema").fidusFnSchema,
  MenuBar: require("../../prosemirror/src/menu/menubar").MenuBar
};

var where = document.getElementById('editor'),
  doc = pm.fromDOM(pm.fidusSchema, where),
  editor, fnEditor,
  lastFootnotes = [],
  findFootnotes = node => {
    var footnotes = [];
    if (node.type.name==='footnote') {
      footnotes.push(node);
    }
    if (node.content) {
      node.content.forEach(function(node){
        footnotes = footnotes.concat(findFootnotes(node));
      })
    }
    return footnotes;
  },
  getNodePos = (currentNode, searchedNode, path = [], fromOffset = 0, toOffset = 0) => {
      var index, childPos, childNode, childOffset;
      if (currentNode===searchedNode) {
          return {
            from: new pm.Pos(path, fromOffset),
            to: new pm.Pos(path, toOffset)
          }
      }
      if (currentNode.content) {
          for (index=0;index<currentNode.content.length;index++) {
              childNode = currentNode.content[index];
              if (childNode.isInline) {
                  fromOffset = toOffset;
                  toOffset = toOffset + childNode.offset;
                  childPos = getNodePos(childNode, searchedNode, path, fromOffset, toOffset);
              } else {
                  childPos = getNodePos(childNode, searchedNode, path.concat(index), fromOffset, toOffset);
              }
              if (childPos !== false) {
                  return childPos;
              }
          }
      }
      return false;
  },
  sameArrayContents = (arrayOne, arrayTwo) => {
    if (arrayOne.length != arrayTwo.length) {
      return false;
    }
    return arrayOne.every(function(element, index) {
        return element === arrayTwo[index];
    })
  },
  renderFootnotes = function () {
    var currentFootnotes = findFootnotes(editor.doc),
      footnotesHTML = '';
    if (sameArrayContents(currentFootnotes,lastFootnotes)) {
      return true;
    }
    console.log('redrawing footnotes');
    currentFootnotes.forEach(footnote => {
      footnotesHTML += "<div class='footnote-container'>" + footnote.attrs.fnContents + "</div>"
    })
    fnEditor.setContent(pm.fromHTML(pm.fidusFnSchema, footnotesHTML));

    lastFootnotes = currentFootnotes;
  },
  updateFootnotes = function () {
    let currentFootnotesElement = fnEditor.getContent('dom'), footnotes;
    footnotes = [].slice.call(currentFootnotesElement.querySelectorAll('.footnote-container'));
    footnotes.forEach( (footnote, index) => {
        if (footnote.innerHTML != lastFootnotes[index].attrs.fnContents) {
          let oldFootnote = lastFootnotes[index];
          console.log('detected change:' + footnote.innerHTML);
          let replacement = oldFootnote.type.create({fnContents: footnote.innerHTML}, null, footnote.styles);
          let nodePos = getNodePos(editor.doc,oldFootnote);
          lastFootnotes[index] = replacement;
          editor.tr.replaceWith(nodePos.from,nodePos.to,replacement).apply();
        }
    });
  },
  makeEditor = function (where, schema) {
    return new pm.ProseMirror({
      place: where,
      menuBar: {float: true},
      schema: schema
      //doc: doc
    })
  };

where.innerHTML = '';
editor = makeEditor(where, pm.fidusSchema);
fnEditor = makeEditor(document.getElementById('footnote-editor'), pm.fidusFnSchema);
editor.setContent(doc);
renderFootnotes();
editor.on('change',function(){
  renderFootnotes();
});
fnEditor.on('change',function(){
  updateFootnotes();
});
