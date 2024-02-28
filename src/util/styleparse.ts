import { TextDocument } from 'vscode-languageserver-textdocument';

import postcss from 'postcss'
import sass from 'sass'
import { parse } from 'path'

export const styleParse = (document: TextDocument): Promise<string> => {
  const uri = document.uri
  const txt = document.getText()
  if(!uri.endsWith('scss')) return Promise.resolve(txt)
  const css = sass.compileString(txt).css

  return postcss([]).process(css).then(res => {
    const result = res.toString()
    return result
  }).catch(() => {
    return txt
  })
}