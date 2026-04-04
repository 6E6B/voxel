/// <reference types="vite/client" />

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '@assets/*' {
  const src: string
  export default src
}

// DDS texture imports with ?url suffix
declare module '*.dds?url' {
  const url: string
  export default url
}
