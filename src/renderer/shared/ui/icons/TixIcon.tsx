import React from 'react'
import tixIconPath from '../../../../../assets/icons/Tix.png'

interface TixIconProps {
  className?: string
}

export const TixIcon: React.FC<TixIconProps> = ({ className }) => (
  <img src={tixIconPath} alt="Tix" className={className} />
)
