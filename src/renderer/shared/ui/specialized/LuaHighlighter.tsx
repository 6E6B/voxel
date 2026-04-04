import React from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import lua from 'react-syntax-highlighter/dist/esm/languages/prism/lua'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'

SyntaxHighlighter.registerLanguage('lua', lua)

interface LuaHighlighterProps {
  code: string
  className?: string
}

export const LuaHighlighter: React.FC<LuaHighlighterProps> = ({ code, className }) => {
  return (
    <div className={className}>
      <SyntaxHighlighter
        language="lua"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '0.5rem',
          background: 'transparent',
          fontSize: '12px',
          lineHeight: '1.5'
        }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
