#!/bin/bash


# converts footnote.es6.js to footnote.js

npm install babel babel-preset-es2015

node_modules/.bin/babel footnote.es6.js > footnote.js

# downloads latest prosemirror.js
rm prosemirror.js
wget https://raw.githubusercontent.com/fiduswriter/prosemirror-test/master/prosemirror.js
