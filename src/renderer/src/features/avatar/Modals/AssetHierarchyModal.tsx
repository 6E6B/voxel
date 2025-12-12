import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetClose,
  SheetHandle
} from '@renderer/components/UI/dialogs/Sheet'
import {
  ChevronRight,
  ChevronDown,
  Box,
  Layers,
  Cuboid,
  Image,
  Lightbulb,
  Link,
  Camera,
  Hexagon,
  Volume2,
  FileCode,
  Flame,
  Sparkles,
  Zap,
  Cloud,
  Tag,
  Hash
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { LuaHighlighter } from '@renderer/components/UI/specialized/LuaHighlighter'

interface Property {
  value: any
  type: string
}

interface Instance {
  class: string
  referent: string
  properties: { [name: string]: Property }
  children: Instance[]
}

interface AssetHierarchyModalProps {
  isOpen: boolean
  onClose: () => void
  assetId: number | null
  assetName: string
}

const formatValue = (value: any, type: string, name: string): React.ReactNode => {
  if (value === null || value === undefined) return <span className="text-neutral-600">null</span>

  if (name === 'Source' && typeof value === 'string') {
    return (
      <LuaHighlighter
        code={value}
        className="w-full max-h-[400px] overflow-y-auto overflow-x-auto rounded border border-neutral-800 bg-neutral-950"
      />
    )
  }

  // Handle complex objects that might be stringified
  const parsedValue = value
  if (typeof value === 'object') {
    // Already an object
  }

  // Check for Vector3/CFrame like structure
  if (typeof parsedValue === 'object') {
    if ('X' in parsedValue && 'Y' in parsedValue && 'Z' in parsedValue) {
      // Vector3 or CFrame (position part)
      if ('R00' in parsedValue) {
        // CFrame
        return (
          <div className="flex flex-col gap-1 font-mono text-[11px]">
            <div className="text-emerald-400">
              Pos: {Number(parsedValue.X).toFixed(3)}, {Number(parsedValue.Y).toFixed(3)},{' '}
              {Number(parsedValue.Z).toFixed(3)}
            </div>
            <div className="text-neutral-500 text-[10px]">
              R: [{Number(parsedValue.R00).toFixed(2)}, {Number(parsedValue.R01).toFixed(2)},{' '}
              {Number(parsedValue.R02).toFixed(2)}]
            </div>
          </div>
        )
      } else {
        // Vector3
        return (
          <span className="text-emerald-400 font-mono">
            {Number(parsedValue.X).toFixed(3)}, {Number(parsedValue.Y).toFixed(3)},{' '}
            {Number(parsedValue.Z).toFixed(3)}
          </span>
        )
      }
    }
    if ('url' in parsedValue) {
      return <span className="text-blue-400 underline break-all">{parsedValue.url}</span>
    }
    return <span className="text-neutral-400 break-all">{JSON.stringify(parsedValue)}</span>
  }

  if (type === 'bool' || typeof value === 'boolean') {
    return <span className={value ? 'text-green-400' : 'text-red-400'}>{String(value)}</span>
  }

  if (type === 'int' || type === 'float' || type === 'double' || typeof value === 'number') {
    return <span className="text-yellow-400 font-mono">{String(value)}</span>
  }

  return <span className="text-neutral-300 break-words">{String(value)}</span>
}

const getIconForClass = (className: string) => {
  switch (className) {
    case 'Folder':
      return <Layers size={14} className="text-yellow-500/80" />
    case 'Model':
      return <Cuboid size={14} className="text-indigo-400/80" />
    case 'Part':
    case 'WedgePart':
    case 'CornerWedgePart':
    case 'TrussPart':
      return <Box size={14} className="text-blue-400/80" />
    case 'MeshPart':
    case 'SpecialMesh':
      return <Hexagon size={14} className="text-purple-400/80" />
    case 'Decal':
    case 'Texture':
      return <Image size={14} className="text-orange-400/80" />
    case 'PointLight':
    case 'SpotLight':
    case 'SurfaceLight':
      return <Lightbulb size={14} className="text-yellow-300" />
    case 'Attachment':
      return <Link size={14} className="text-green-400/80" />
    case 'Camera':
      return <Camera size={14} className="text-cyan-400/80" />
    case 'Sound':
      return <Volume2 size={14} className="text-pink-400/80" />
    case 'Script':
    case 'LocalScript':
      return <FileCode size={14} className="text-emerald-400/80" />
    case 'Fire':
      return <Flame size={14} className="text-orange-500/80" />
    case 'Sparkles':
      return <Sparkles size={14} className="text-yellow-300/80" />
    case 'ParticleEmitter':
      return <Zap size={14} className="text-amber-400/80" />
    case 'Smoke':
      return <Cloud size={14} className="text-gray-400/80" />
    case 'Accessory':
      return <Tag size={14} className="text-teal-400/80" />
    case 'Vector3Value':
      return <Hash size={14} className="text-slate-400/80" />
    default:
      return <Cuboid size={14} className="text-neutral-500/80" />
  }
}

const TreeItem = ({
  instance,
  depth = 0,
  selectedInstance,
  onSelect
}: {
  instance: Instance
  depth?: number
  selectedInstance: Instance | null
  onSelect: (inst: Instance) => void
}) => {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = instance.children.length > 0
  const isSelected = selectedInstance === instance

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer select-none transition-colors border border-transparent',
          isSelected
            ? 'bg-[var(--accent-color-muted)]/20 border-[var(--accent-color)]/20 text-neutral-200'
            : 'hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(instance)
        }}
      >
        <div
          className={cn(
            'p-0.5 rounded-sm hover:bg-white/10 cursor-pointer',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>

        {getIconForClass(instance.class)}

        <span className="text-xs font-medium truncate">
          {instance.properties.Name?.value || instance.class}
        </span>
      </div>

      {expanded && (
        <div>
          {instance.children.map((child, i) => (
            <TreeItem
              key={i}
              instance={child}
              depth={depth + 1}
              selectedInstance={selectedInstance}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const AssetHierarchyModal = ({
  isOpen,
  onClose,
  assetId,
  assetName
}: AssetHierarchyModalProps) => {
  const [hierarchy, setHierarchy] = useState<Instance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null)

  useEffect(() => {
    if (isOpen && assetId) {
      setLoading(true)
      setError(null)
      setSelectedInstance(null)

      window.api
        .getAssetHierarchy(assetId)
        .then((data: any) => {
          setHierarchy(data)
          // Automatically select the first child if available, or the root if it has properties
          if (data.children && data.children.length > 0) {
            setSelectedInstance(data.children[0])
          } else {
            setSelectedInstance(data)
          }
        })
        .catch((err: any) => {
          console.error('Failed to load hierarchy:', err)
          const message = err.message?.replace('Error: ', '') || 'Failed to parse asset hierarchy'
          setError(message)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setHierarchy(null)
      setSelectedInstance(null)
    }
  }, [isOpen, assetId])

  return (
    <Sheet isOpen={isOpen} onClose={onClose} className="items-center">
      <SheetContent className="h-full flex flex-col w-full sm:max-w-5xl mx-auto">
        <SheetHandle />
        <SheetHeader className="border-b border-neutral-800 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Box className="text-[var(--accent-color)]" size={20} />
            Asset Hierarchy: <span className="text-neutral-400 font-normal">{assetName}</span>
          </SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetBody className="flex-1 flex min-h-0 p-0">
          {loading ? (
            <div className="flex items-center justify-center h-full w-full text-neutral-500">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
                <span>Parsing RBXMX...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md text-center">
                <div className="text-red-400 font-medium mb-2">Failed to load hierarchy</div>
                <div className="text-sm text-red-400/70">{error}</div>
              </div>
            </div>
          ) : hierarchy ? (
            <div className="flex w-full h-full">
              {/* Left Panel: Tree View */}
              <div className="w-1/3 border-r border-neutral-800 flex flex-col bg-neutral-950/50">
                <div className="p-3 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50 bg-neutral-900/20">
                  Explorer
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
                  {hierarchy.children.length > 0 ? (
                    hierarchy.children.map((child, i) => (
                      <TreeItem
                        key={i}
                        instance={child}
                        selectedInstance={selectedInstance}
                        onSelect={setSelectedInstance}
                      />
                    ))
                  ) : (
                    <div className="text-neutral-500 italic p-4 text-sm text-center">
                      Empty hierarchy
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Properties */}
              <div className="w-2/3 flex flex-col bg-neutral-900/10">
                <div className="p-3 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-800/50 bg-neutral-900/20 flex justify-between items-center">
                  <span>Properties</span>
                  {selectedInstance && (
                    <span className="normal-case font-normal text-neutral-400 bg-neutral-800/50 px-2 py-0.5 rounded">
                      {selectedInstance.class}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  {selectedInstance ? (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-neutral-900/30 text-[10px] text-neutral-500 font-medium uppercase sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-2 w-1/3 border-b border-neutral-800/50">
                            Property
                          </th>
                          <th className="px-4 py-2 border-b border-neutral-800/50">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/30">
                        {Object.entries(selectedInstance.properties)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([name, prop]) => (
                            <tr key={name} className="hover:bg-white/5 group transition-colors">
                              <td className="px-4 py-2 text-xs font-medium text-neutral-400 group-hover:text-neutral-200 align-top pt-3">
                                {name}
                              </td>
                              <td className="px-4 py-2 text-xs align-top pt-3 pb-3 min-w-0">
                                <div className="min-w-0">
                                  {formatValue(prop.value, prop.type, name)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        {Object.keys(selectedInstance.properties).length === 0 && (
                          <tr>
                            <td
                              colSpan={2}
                              className="p-8 text-center text-neutral-600 italic text-sm"
                            >
                              No properties found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                      Select an item to view properties
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
