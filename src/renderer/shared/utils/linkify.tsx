import React from 'react'

/**
 * Converts URLs in text to clickable links
 * @param text - The text to linkify
 * @returns Array of React nodes with URLs converted to anchor tags
 */
export const linkify = (text: string): React.ReactNode[] => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Add the URL as a clickable link
    const url = match[0]
    const href = url.startsWith('www.') ? `https://${url}` : url
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent-color)] hover:underline break-all"
      >
        {url}
      </a>
    )

    lastIndex = urlRegex.lastIndex
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}
