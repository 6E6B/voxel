import React from 'react'
import { NewsCard } from './NewsCard'
import { useNews } from '../api/useNews'
import { LoadingSpinnerFullPage } from '../../../components/UI/feedback/LoadingSpinner'

export const NewsFeed: React.FC = () => {
  const { data: news, isLoading, error } = useNews()

  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">News Feed</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinnerFullPage label="Loading news..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">News Feed</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-400">
          Failed to load news feed. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">News Feed</h2>
      </div>
      
      <div className="p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          {news?.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  )
}
