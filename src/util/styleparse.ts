import { TextDocument } from 'vscode-languageserver-textdocument';
import { SourceMapConsumer } from 'source-map-js'
import postcss from 'postcss'
import postcssrc from 'postcss-load-config'
import sass from 'sass'
import { fileURLToPath } from 'url';
import { parse } from 'path'
import autoprefixer from 'autoprefixer'

const getLineMap = (smc: SourceMapConsumer) => {
  const result =  {}
  smc.eachMapping(item => {
    const { originalLine, generatedLine } = item
    result[originalLine] = generatedLine
  })
  return result
}

const getPostcssPlugin = (dir: string) => {
  // const configDir = parse(dir).dir
  // return postcssrc({}, dir).then(res => res.plugins).catch(() => [])
  return Promise.resolve([])
}

export const styleParse = (document: TextDocument): Promise<{
  text: string,
  lineConvert: (line: number) => number 
}> => {
  const txt = document.getText()
  const url = fileURLToPath(document.uri)

  if(!url.endsWith('.scss')) return Promise.resolve({
    text: txt,
    lineConvert: line => line
  })

  const { css, sourceMap } = sass.compile(url, { sourceMap: true, style: 'expanded', sourceMapIncludeSources: true })
  const map1 = getLineMap(new SourceMapConsumer(sourceMap))

  return postcss([])
  .process(css, { map: { inline: false, sourcesContent: true } })
  .then(res => {
    const { css, map } = res
    const map2 = getLineMap(new SourceMapConsumer(map.toJSON()))
    // if there is no postcss plugin , map2 will be { 1 : 1 }, there will be no source map line convert
    const lineConvert = (line: number) => map2[map1[line]] || map1[line]
    return {
      text: css,
      lineConvert
    }
  }).catch((error) => {
    console.log(error)
    return {
      text: txt,
      lineConvert: line => line
    }
  })
}
