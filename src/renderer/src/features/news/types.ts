export interface NewsMedia {
  type: 'image' | 'video'
  url: string
  alt?: string
}

export interface NewsAuthor {
  name: string
  handle: string
  avatarUrl: string
  verified?: boolean
}

export interface NewsPost {
  id: string
  author: NewsAuthor
  content: string
  timestamp: string
  createdAt: string
  media?: NewsMedia[]
  likes: number
  retweets: number
  replies: number
  isRetweet?: boolean
  isReply?: boolean
  inReplyToStatusId?: string | null
  isThread?: boolean
  threadChildren?: NewsPost[] // For chained comments
}
