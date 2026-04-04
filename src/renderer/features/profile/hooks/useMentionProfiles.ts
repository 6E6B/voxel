import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { UserSummary } from '@shared/contracts/user'

const MENTION_REGEX = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]+)/g

export interface MentionProfile {
  id: number
  name: string
  displayName: string
  avatarUrl?: string
}

export const useMentionProfiles = (mentionSourceText: string) => {
  const [mentionProfiles, setMentionProfiles] = useState<Record<string, MentionProfile>>({})
  const mentionPromiseRef = useRef<Map<string, Promise<MentionProfile | null>>>(new Map())

  const mentionUsernames = useMemo(() => {
    if (!mentionSourceText) return []
    const unique = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = MENTION_REGEX.exec(mentionSourceText)) !== null) {
      unique.add(match[2])
    }
    return Array.from(unique)
  }, [mentionSourceText])

  const ensureMentionProfile = useCallback(
    async (username: string) => {
      const trimmed = username.trim()
      if (!trimmed) return null
      const key = trimmed.toLowerCase()
      if (mentionProfiles[key]) return mentionProfiles[key]
      if (mentionPromiseRef.current.has(key)) {
        return mentionPromiseRef.current.get(key)!
      }

      const promise = (async () => {
        try {
          const summary = (await window.api.getUserByUsername(trimmed)) as UserSummary | null
          if (!summary) {
            return null
          }
          let avatarUrl: string | undefined
          try {
            avatarUrl = (await window.api.getAvatarUrl(summary.id.toString())) as string
          } catch (avatarError) {
            console.error('Failed to fetch mention avatar', avatarError)
          }
          const profileData: MentionProfile = {
            id: summary.id,
            name: summary.name,
            displayName: summary.displayName,
            avatarUrl
          }
          setMentionProfiles((prev) => ({
            ...prev,
            [key]: profileData
          }))
          return profileData
        } catch (error) {
          console.error('Failed to resolve username mention', username, error)
          return null
        } finally {
          mentionPromiseRef.current.delete(key)
        }
      })()

      mentionPromiseRef.current.set(key, promise)
      return promise
    },
    [mentionProfiles]
  )

  useEffect(() => {
    if (!mentionUsernames.length) return
    mentionUsernames.forEach((username) => {
      ensureMentionProfile(username)
    })
  }, [mentionUsernames, ensureMentionProfile])

  return { mentionProfiles, ensureMentionProfile }
}
