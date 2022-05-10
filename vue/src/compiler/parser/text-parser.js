/* @flow */

import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  if (!tagRE.test(text)) {
    return
  }
  const tokens = []
  const rawTokens = []
  let lastIndex = tagRE.lastIndex = 0
  let match, index, tokenValue
  // 循环匹配表达式，如{{name}}
  // match的结果：['{{name}}', 'name', index: 0, input: '{{name}}', groups: undefined]
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token
    // 当index大于lastIndex 说明匹配上了表达式
    if (index > lastIndex) {
      // 匹配上的表达式推入rawTokens
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      // 
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token
    // 有filter的时候，解析filter
    const exp = parseFilters(match[1].trim())
    
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
