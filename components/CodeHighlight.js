import React from 'react';
import { Text } from 'react-native';

// Yengil, tashqi kutubxonasiz syntax highlighting (faqat o'qish uchun —
// CodeReviewScreen'da yuborilgan kodni ko'rsatish uchun). Oldin
// `react-native-syntax-highlighter` ishlatilgan edi, lekin u ~200 tilni
// birdaniga bundle qiladi va ilova hajmini ~2MB ga oshirgan (2.9MB → 5.2MB).
// Judge0 faqat 5 ta tilni qo'llab-quvvatlaydi, shuning uchun shu 5 tasi uchun
// oddiy regex-tokenizer yetarli — hech qanday yangi dependency kerak emas.

const KEYWORDS = {
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
    'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'pass', 'break',
    'continue', 'global', 'nonlocal', 'yield', 'None', 'True', 'False', 'self', 'is', 'del', 'async', 'await'],
  javascript: ['function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
    'continue', 'var', 'let', 'const', 'new', 'this', 'class', 'extends', 'import', 'export', 'default',
    'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true',
    'false', 'async', 'await', 'yield', 'static', 'get', 'set'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'return',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'super',
    'static', 'final', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short',
    'String', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'null', 'true', 'false',
    'abstract', 'enum'],
  cpp: ['int', 'double', 'float', 'char', 'bool', 'void', 'long', 'short', 'unsigned', 'signed',
    'class', 'struct', 'public', 'private', 'protected', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'new', 'delete', 'this', 'namespace', 'using', 'include',
    'template', 'typename', 'const', 'static', 'virtual', 'true', 'false', 'nullptr', 'try', 'catch',
    'throw', 'auto', 'std'],
  c: ['int', 'double', 'float', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'struct',
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'sizeof',
    'const', 'static', 'typedef', 'union', 'enum', 'include', 'define'],
};

// Ikkita umumiy tokenizer: C-uslubidagi tillar (js/java/cpp/c) va python
// (# izoh, uch qo'shtirnoqli satr farq qiladi). Har birida aynan 6 ta
// capture-guruh: (izoh)(blok-izoh YOKI uch-qoshtirnoq)(qosh-tirnoq satr)
// (bir-tirnoq satr)(son)(so'z).
const TOKEN_RE_C_STYLE = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/gm;
const TOKEN_RE_PYTHON = /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?''')|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/gm;

// `null` — tanilmagan til uchun oddiy, rangsiz matn qaytariladi.
export default function CodeHighlight({ code, language, colors, fontFamily, fontSize = 12.5 }) {
  const lang = KEYWORDS[language] ? language : null;
  if (!lang || !code) {
    return <Text style={{ fontFamily, fontSize, color: colors.text }}>{code}</Text>;
  }
  const keywords = KEYWORDS[lang];
  const re = lang === 'python' ? TOKEN_RE_PYTHON : TOKEN_RE_C_STYLE;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  re.lastIndex = 0;
  while ((match = re.exec(code))) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={{ color: colors.text }}>{code.slice(lastIndex, match.index)}</Text>
      );
    }
    const [full, comment, blockOrTripleStr, dq, sq, num, word] = match;
    let color;
    if (comment) color = colors.textMuted;
    else if (blockOrTripleStr) color = lang === 'python' ? colors.green : colors.textMuted;
    else if (dq || sq) color = colors.green;
    else if (num) color = colors.orange;
    else if (word && keywords.includes(word)) color = colors.purple;
    else color = colors.text;
    parts.push(<Text key={key++} style={{ color }}>{full}</Text>);
    lastIndex = match.index + full.length;
    // Bo'sh moslikda (masalan bo'sh satr) cheksiz tsiklga tushmaslik uchun.
    if (full.length === 0) re.lastIndex += 1;
  }
  if (lastIndex < code.length) {
    parts.push(<Text key={key++} style={{ color: colors.text }}>{code.slice(lastIndex)}</Text>);
  }
  return <Text style={{ fontFamily, fontSize }}>{parts}</Text>;
}
