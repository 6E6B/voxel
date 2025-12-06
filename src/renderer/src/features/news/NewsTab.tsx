import React from 'react'
import { NewsFeed } from './components/NewsFeed'

const NewsTab: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col w-full h-full bg-neutral-950 overflow-y-auto font-sans scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
      <NewsFeed />
    </div>
  )
}

export default NewsTab
