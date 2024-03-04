import { TextDocument } from 'vscode-languageserver-textdocument';
import { SourceMapConsumer } from 'source-map-js'
import postcss from 'postcss'
import sass from 'sass'
import { fileURLToPath } from 'url';
import { postcssUrlPatch } from 'postcss-url-patch';
import { readFileSync } from 'fs';
import { extname } from 'path';
import { pathToFileURL, URL } from 'url';
import { ImageInfoRequest } from '../common/protocol';

const getLineMap = (smc: SourceMapConsumer) => {
  const result =  {}
  smc.eachMapping(item => {
    const { originalLine, generatedLine } = item
    result[originalLine] = generatedLine
  })
  return result
}

const getAlias = (base: string, url: string) => {
  const arrs = url.split(base)
  arrs.pop()
  arrs.push(base)
  return arrs.join('')
}

const genImporter = (styleAlias: Record<string, string>, url: string) => {
  const entries = Object.entries(styleAlias)

  return {
		canonicalize(requestedUrl): URL | null {
			return entries.reduce<URL | null>((resolved, [alias, path]) => {
				if (resolved) return resolved;
				if (requestedUrl.startsWith(alias)) return pathToFileURL(requestedUrl.replace(alias, getAlias(path, url)));
				return null;
			}, null);
		},
		load(canonicalUrl) {
			const filepath = fileURLToPath(canonicalUrl);
			const extension = extname(filepath).replace('.', '');
			const contents = readFileSync(filepath).toString();

			return {
				syntax: (extension === 'sass' ? 'indented' : extension),
				contents,
			};
		},
	};
}

export const styleParse = (document: TextDocument, request: ImageInfoRequest): Promise<{
  text: string,
  lineConvert: (line: number) => number 
}> => {
  const { urlPatch: urlPatchConfig, styleAlias, additionStyle } = request
  const txt = document.getText()
  const url = fileURLToPath(document.uri)
  if(!url.endsWith('.scss')) return Promise.resolve({
    text: txt,
    lineConvert: line => line
  })
  const addtionText = `${additionStyle.join(';')}; ${txt}`
  const { css, sourceMap } = sass.compileString(addtionText, {
    sourceMap: true,
    style: 'expanded',
    sourceMapIncludeSources: true,
    importers: [
      // @ts-ignore
      genImporter(styleAlias, url),
    ]
  })
  const map1 = getLineMap(new SourceMapConsumer(sourceMap))

  return postcss([postcssUrlPatch(urlPatchConfig)])
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
