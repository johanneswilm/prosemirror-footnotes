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
        if (node.type.name === 'footnote') {
            footnotes.push(node);
        }
        if (node.content && node.content.content) {
            node.content.content.forEach(function(node) {
                footnotes = footnotes.concat(findFootnotes(node));
            })
        }
        return footnotes;
    },
    getNodePos = (currentNode, searchedNode, searchedNumber = 0, path = [], fromOffset = 0, toOffset = 0, counter = {
        hits: 0
    }) => {
        var index = 0,
            foundPos = false;

        if (currentNode === searchedNode) {
            if (searchedNumber === counter.hits) {
                return {
                    from: new pm.Pos(path, fromOffset),
                    to: new pm.Pos(path, toOffset)
                }
            }
            counter.hits++;
        }
        currentNode.forEach(function(childNode, fromOffset, toOffset) {
            var childPos;
            if (childNode.isInline) {
                childPos = getNodePos(childNode, searchedNode, searchedNumber, path, fromOffset, toOffset, counter);
            } else {
                childPos = getNodePos(childNode, searchedNode, searchedNumber, path.concat(index), fromOffset, toOffset, counter);
            }
            if (childPos !== false) {
                foundPos = childPos;
            }
            index++;
        })
        if (foundPos !== false) {
            return foundPos;
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
    renderFootnotes = function() {
        var currentFootnotes = findFootnotes(editor.doc),
            footnotesHTML = '';
        if (sameArrayContents(currentFootnotes, lastFootnotes)) {
            return true;
        }
        console.log('redrawing footnotes');
        currentFootnotes.forEach(footnote => {
            footnotesHTML += "<div class='footnote-container'>" + footnote.attrs.fnContents + "</div>"
        })
        fnEditor.setContent(pm.fromHTML(pm.fidusFnSchema, footnotesHTML));

        lastFootnotes = currentFootnotes;
    },
    updateFootnotes = function() {
        let currentFootnotesElement = fnEditor.getContent('dom'),
            footnotes;
        footnotes = [].slice.call(currentFootnotesElement.querySelectorAll('.footnote-container'));
        footnotes.forEach((footnote, index) => {
            if (footnote.innerHTML != lastFootnotes[index].attrs.fnContents) {
                let oldFootnote = lastFootnotes[index];
                console.log('detected change:' + footnote.innerHTML);
                let replacement = oldFootnote.type.create({
                    fnContents: footnote.innerHTML
                }, null, footnote.styles);
                // The editor.doc may sometimes contain the same node several times.
                // This happens after copying, for example. We therefore need to check
                // how many times the same footnote node shows up before the current
                // footnote.
                let previousInstances = 0,
                    i;
                for (i = 0; i < index; i++) {
                    if (lastFootnotes[i] === lastFootnotes[index]) {
                        previousInstances++;
                    }
                }
                let nodePos = getNodePos(editor.doc, oldFootnote, previousInstances);
                lastFootnotes[index] = replacement;
                editor.tr.replaceWith(nodePos.from, nodePos.to, replacement).apply();
            }
        });
    },
    makeEditor = function(where, schema) {
        return new pm.ProseMirror({
            place: where,
            menuBar: {
                float: true
            },
            schema: schema
        })
    };

where.innerHTML = '';
editor = makeEditor(where, pm.fidusSchema);
fnEditor = makeEditor(document.getElementById('footnote-editor'), pm.fidusFnSchema);
editor.setContent(doc);
renderFootnotes();
editor.on('change', function() {
    renderFootnotes();
});
fnEditor.on('change', function() {
    updateFootnotes();
});
