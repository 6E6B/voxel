import React, { useMemo, useCallback } from 'react'
import { useMentionProfiles } from '../hooks/useMentionProfiles'
import { linkify } from '@renderer/shared/utils/linkify'

const MENTION_REGEX = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]+)/g

interface DescriptionWithMentionsProps {
  description: string
  mentionSourceText: string
  onSelectProfile?: (userId: number) => void
}

export const DescriptionWithMentions: React.FC<DescriptionWithMentionsProps> = ({
  description,
  mentionSourceText,
  onSelectProfile
}) => {
  const { mentionProfiles, ensureMentionProfile } = useMentionProfiles(mentionSourceText)

  const handleMentionClick = useCallback(
    async (username: string) => {
      if (!onSelectProfile) return
      const profileData = await ensureMentionProfile(username)
      if (profileData?.id) {
        onSelectProfile(profileData.id)
      }
    },
    [ensureMentionProfile, onSelectProfile]
  )

  const descriptionContent = useMemo(() => {
    if (!mentionSourceText) {
      // If no mentions, just linkify URLs
      return linkify(description)
    }

    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let partIndex = 0

    while ((match = MENTION_REGEX.exec(description)) !== null) {
      const prefix = match[1] ?? ''
      const username = match[2]
      const mentionStartIndex = match.index + prefix.length

      if (mentionStartIndex > lastIndex) {
        // Linkify the text segment before the mention
        const textSegment = description.slice(lastIndex, mentionStartIndex)
        const linkifiedSegment = linkify(textSegment)
        nodes.push(
          <React.Fragment key={`desc-text-${partIndex++}`}>{linkifiedSegment}</React.Fragment>
        )
      }

      const mentionKey = username.toLowerCase()
      const mentionData = mentionProfiles[mentionKey]
      const canNavigate = Boolean(onSelectProfile)

      nodes.push(
        <button
          key={`desc-mention-${partIndex++}-${match.index}`}
          type="button"
          onClick={() => {
            if (canNavigate) {
              handleMentionClick(username)
            }
          }}
          className={`inline-flex items-center gap-1 align-middle font-semibold ${canNavigate ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}`}
          aria-disabled={!canNavigate}
          style={{
            color: 'color-mix(in srgb, var(--accent-color) 85%, white)',
            marginLeft: '0.12rem',
            marginRight: '0.12rem'
          }}
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 self-center overflow-hidden rounded-full"
            style={{
              boxShadow: 'inset 0 0 0 1.5px var(--accent-color)',
            }}
          >
            {mentionData?.avatarUrl ? (
              <img
                src={mentionData.avatarUrl}
                alt={mentionData.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full inline-block bg-neutral-800 animate-pulse" />
            )}
          </span>
          @{mentionData?.name ?? username}
        </button>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < description.length) {
      // Linkify the remaining text after the last mention
      const textSegment = description.slice(lastIndex)
      const linkifiedSegment = linkify(textSegment)
      nodes.push(
        <React.Fragment key={`desc-text-${partIndex++}`}>{linkifiedSegment}</React.Fragment>
      )
    }

    return nodes.length ? nodes : description
  }, [description, mentionProfiles, mentionSourceText, onSelectProfile, handleMentionClick])

  return <>{descriptionContent}</>
}

