import React from 'react'
import Color from 'color'
import { cn } from '@renderer/shared/lib/utils'
import { ColorPicker } from './ColorPicker'

interface HexColorPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    value: string
    onChange: (value: string) => void
}

export const HexColorPicker: React.FC<HexColorPickerProps> = ({
    value,
    onChange,
    className,
    ...props
}) => {
    const handleChange = (rgba: [number, number, number, number]) => {
        try {
            const nextColor = Color.rgb(rgba[0], rgba[1], rgba[2], rgba[3]).hex()
            onChange(nextColor)
        } catch (error) {
            console.error('Failed to convert picker color:', error)
        }
    }

    return (
        <div className={cn('w-full', className)} {...props}>
            <ColorPicker value={value} onChange={handleChange} className="w-full" />
        </div>
    )
}