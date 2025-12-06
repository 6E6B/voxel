import { useQuery } from '@tanstack/react-query'
import { NewsPost, NewsMedia } from '../types'

// Define the raw API response type
interface Tweet {
  id: string
  text: string
  date: string
  url: string
  likes: number
  retweets: number
  photos: { id: string; url: string }[]
  videos?: { id: string; preview: string; url: string }[]
  isRetweet: boolean
  isReply?: boolean
  inReplyToStatusId?: string | null
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const mapTweetToNewsPost = (tweet: Tweet): NewsPost => {
  const normalizedId = String(tweet.id)
  const parentId =
    tweet.inReplyToStatusId !== undefined && tweet.inReplyToStatusId !== null
      ? String(tweet.inReplyToStatusId)
      : null

  const media: NewsMedia[] = []

  if (tweet.photos) {
    tweet.photos.forEach((photo) => {
      media.push({
        type: 'image',
        url: photo.url
      })
    })
  }

  if (tweet.videos) {
    tweet.videos.forEach((video) => {
      media.push({
        type: 'video',
        url: video.url,
        // storing preview in alt for now or we might need to extend NewsMedia
        alt: video.preview
      })
    })
  }

  let author = {
    name: 'Roblox RTC',
    handle: 'Roblox_RTC',
    avatarUrl: 'https://unavatar.io/x/roblox_rtc',
    verified: true
  }

  let content = tweet.text

  // Parse RT syntax to get original author
  if (tweet.isRetweet) {
    const rtMatch = tweet.text.match(/^RT @(\w+): (.*)/s)
    if (rtMatch) {
      const originalHandle = rtMatch[1]
      content = rtMatch[2]
      author = {
        name: originalHandle,
        handle: originalHandle,
        // Use a generic avatar or try to guess (using unavatar for demo purposes, or fallback)
        avatarUrl: `https://unavatar.io/twitter/${originalHandle}`,
        verified: false // We don't know if they are verified
      }
    }
  }

  // Remove media link from content if media exists
  if (media.length > 0) {
    content = content.replace(/https:\/\/t\.co\/[a-zA-Z0-9]+\s*$/, '').trim()
  }

  return {
    id: normalizedId,
    author,
    content,
    timestamp: formatTimeAgo(tweet.date),
    createdAt: tweet.date,
    media: media.length > 0 ? media : undefined,
    likes: tweet.likes,
    retweets: tweet.retweets,
    replies: 0, // Not provided by API
    isRetweet: tweet.isRetweet,
    isReply: Boolean(tweet.isReply),
    inReplyToStatusId: parentId,
    isThread: false,
    threadChildren: []
  }
}

const buildThreadedNews = (posts: NewsPost[]): NewsPost[] => {
  const postsById = new Map<string, NewsPost>()

  // Prime the map and ensure children arrays exist
  posts.forEach((post) => {
    postsById.set(post.id, {
      ...post,
      threadChildren: post.threadChildren ?? []
    })
  })

  const roots: NewsPost[] = []

  // Attach replies to their parents when present
  postsById.forEach((post) => {
    const parentId = post.inReplyToStatusId
    if (post.isReply && parentId) {
      const parent = postsById.get(parentId)
      if (parent) {
        parent.threadChildren = parent.threadChildren ?? []
        parent.threadChildren.push(post)
        parent.isThread = true
        return
      }
    }

    roots.push(post)
  })

  // Keep thread replies in chronological order for readability
  postsById.forEach((post) => {
    if (post.threadChildren && post.threadChildren.length > 0) {
      post.threadChildren.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    }
  })

  return roots
}

export const useNews = () => {
  return useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const data: Tweet[] = await window.api.news.getTweets()
      const posts = data.map(mapTweetToNewsPost)
      return buildThreadedNews(posts)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  })
}
