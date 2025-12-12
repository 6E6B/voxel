import React, { useState, useEffect } from 'react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Account } from '@renderer/types'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { cn } from '@renderer/lib/utils'

interface BodyScaleEditorProps {
  account: Account
  currentScales: Record<string, any> | null
  currentAvatarType: string | null
  onUpdate: () => void
}

// Scale options based on Roblox's avatar editor
const HEIGHT_OPTIONS = [0.9, 0.95, 1.0, 1.05]
const WIDTH_OPTIONS = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]
const HEAD_OPTIONS = [0.95, 1.0]

const BodyScaleEditor: React.FC<BodyScaleEditorProps> = ({
  account,
  currentScales,
  currentAvatarType,
  onUpdate
}) => {
  const [height, setHeight] = useState<number>(1.0)
  const [width, setWidth] = useState<number>(1.0)
  const [head, setHead] = useState<number>(1.0)
  const [proportion, setProportion] = useState<number>(0)
  const [bodyType, setBodyType] = useState<number>(0)
  const [avatarType, setAvatarType] = useState<'R6' | 'R15'>('R15')
  const [isSaving, setIsSaving] = useState(false)
  const { showNotification } = useNotification()

  // Initialize from current avatar data
  useEffect(() => {
    if (currentScales) {
      if (typeof currentScales.height === 'number') setHeight(currentScales.height)
      if (typeof currentScales.width === 'number') setWidth(currentScales.width)
      if (typeof currentScales.head === 'number') setHead(currentScales.head)
      if (typeof currentScales.proportion === 'number')
        setProportion(Math.round(currentScales.proportion * 100))
      if (typeof currentScales.bodyType === 'number')
        setBodyType(Math.round(currentScales.bodyType * 100))
    }
    if (currentAvatarType) {
      setAvatarType(currentAvatarType === 'R6' ? 'R6' : 'R15')
    }
  }, [currentScales, currentAvatarType])

  const handleSave = async () => {
    if (!account.cookie) return
    setIsSaving(true)

    try {
      // Save avatar type first if it changed
      if (currentAvatarType !== avatarType) {
        const typeResult = await (window as any).api.setPlayerAvatarType(account.cookie, avatarType)
        if (!typeResult.success) {
          showNotification('Failed to update avatar type', 'error')
          setIsSaving(false)
          return
        }
      }

      // Save scales (only applies to R15)
      if (avatarType === 'R15') {
        const scalesPayload = {
          height,
          width,
          head,
          proportion: proportion / 100, // Convert percentage to decimal
          bodyType: bodyType / 100 // Convert percentage to decimal
        }

        const result = await (window as any).api.setAvatarScales(account.cookie, scalesPayload)
        if (result.success) {
          showNotification('Body scales updated successfully', 'success')
          onUpdate()
        } else {
          showNotification('Failed to update body scales', 'error')
        }
      } else {
        showNotification('Avatar type updated successfully', 'success')
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to update body scales:', error)
      showNotification('Error updating body scales', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`
  const formatProportionPercent = (value: number) => `${value}%`

  return (
    <div className="flex flex-col gap-6 p-6 h-full w-full max-w-2xl mx-auto overflow-y-auto">
      {/* Avatar Type */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-neutral-300">Body Type</label>
        </div>
        <div className="flex gap-2">
          <Button
            variant={avatarType === 'R6' ? 'default' : 'secondary'}
            onClick={() => setAvatarType('R6')}
            className="flex-1"
          >
            R6
          </Button>
          <Button
            variant={avatarType === 'R15' ? 'default' : 'secondary'}
            onClick={() => setAvatarType('R15')}
            className="flex-1"
          >
            R15
          </Button>
        </div>
      </div>

      {/* R15 Scale Options - Only show when R15 is selected */}
      {avatarType === 'R15' && (
        <>
          {/* Height */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-300">Height</label>
              <span className="text-sm text-neutral-500">{formatPercent(height)}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {HEIGHT_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant={height === option ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setHeight(option)}
                  className={cn('min-w-[60px]', height === option && 'ring-2 ring-emerald-500/50')}
                >
                  {formatPercent(option)}
                </Button>
              ))}
            </div>
          </div>

          {/* Width */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-300">Width</label>
              <span className="text-sm text-neutral-500">{formatPercent(width)}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {WIDTH_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant={width === option ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setWidth(option)}
                  className={cn('min-w-[60px]', width === option && 'ring-2 ring-emerald-500/50')}
                >
                  {formatPercent(option)}
                </Button>
              ))}
            </div>
          </div>

          {/* Head */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-300">Head</label>
              <span className="text-sm text-neutral-500">{formatPercent(head)}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {HEAD_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant={head === option ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setHead(option)}
                  className={cn('min-w-[60px]', head === option && 'ring-2 ring-emerald-500/50')}
                >
                  {formatPercent(option)}
                </Button>
              ))}
            </div>
          </div>

          {/* Proportions */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-300">Proportions</label>
              <span className="text-sm text-neutral-500">
                {formatProportionPercent(proportion)}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={proportion}
                onChange={(e) => setProportion(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Body Type Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-300">Body Shape</label>
              <span className="text-sm text-neutral-500">{formatProportionPercent(bodyType)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={bodyType}
                onChange={(e) => setBodyType(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-neutral-600 mt-1"></div>
            </div>
          </div>
        </>
      )}

      {avatarType === 'R6' && (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
          <p>R6 avatars use classic body proportions and don&apos;t support custom scaling.</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-center pt-4 pb-8 mt-auto">
        <Button onClick={handleSave} disabled={isSaving} className="w-full max-w-xs" size="lg">
          {isSaving ? 'Updating...' : 'Update Body Scales'}
        </Button>
      </div>
    </div>
  )
}

export default BodyScaleEditor
