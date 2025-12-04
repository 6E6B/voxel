import React, { useState, useEffect } from 'react'
import Color from 'color'
import { ColorPicker } from '@renderer/components/UI/inputs/ColorPicker'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Account } from '@renderer/types'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { useSetBodyColors } from '../api/useAvatar'

const BRICK_COLOR_TO_HEX: Record<number, string> = {
  1: 'F2F3F3', // White
  2: 'A1A5A2', // Grey
  3: 'F9E999', // Light yellow
  5: 'D7C59A', // Brick yellow
  6: 'C2DAB8', // Light green (Mint)
  9: 'E8BAC8', // Light reddish violet
  11: '80BBDB', // Pastel Blue
  12: 'CB8442', // Light orange brown
  18: 'CC8E69', // Nougat
  21: 'C4281C', // Bright red
  22: 'C470A0', // Med. reddish violet
  23: '0D69AC', // Bright blue
  24: 'F5CD30', // Bright yellow
  25: '624732', // Earth orange
  26: '1B2A35', // Black
  27: '6D6E6C', // Dark grey
  28: '287F47', // Dark green
  29: 'A1C48C', // Medium green
  36: 'F3CF9B', // Lig. Yellowich orange
  37: '4B974B', // Bright green
  38: 'A05F35', // Dark orange
  39: 'C1CADE', // Light bluish violet
  40: 'ECECEC', // Transparent
  41: 'CD544B', // Tr. Red
  42: 'C1DFF0', // Tr. Lg blue
  43: '7BB6E8', // Tr. Blue
  44: 'F7F18D', // Tr. Yellow
  45: 'B4D2E4', // Light blue
  47: 'D9856C', // Tr. Flu. Reddish orange
  48: '84B68D', // Tr. Green
  49: 'F8F184', // Tr. Flu. Green
  50: 'ECE8DE', // Phosph. White
  100: 'EEC4B6', // Light red
  101: 'DA867A', // Medium red
  102: '6E99CA', // Medium blue
  103: 'C7C1B7', // Light grey
  104: '6B327C', // Bright violet
  105: 'E29B40', // Br. yellowish orange
  106: 'DA8541', // Bright orange
  107: '008F9C', // Bright bluish green
  108: '685C43', // Earth yellow
  110: '435493', // Bright bluish violet
  111: 'BFB7B1', // Tr. Brown
  112: '6874AC', // Medium bluish violet
  113: 'E5ADC8', // Tr. Medi. reddish violet
  115: 'C7D23C', // Med. yellowish green
  116: '55A5AF', // Med. bluish green
  118: 'B7D7D5', // Light bluish green
  119: 'A4BD47', // Br. yellowish green
  120: 'D9E4A7', // Lig. yellowish green
  121: 'E7AC58', // Med. yellowish orange
  123: 'D36F4C', // Br. reddish orange
  124: '923978', // Bright reddish violet
  125: 'EAB892', // Light orange
  126: 'A5A5CB', // Tr. Bright bluish violet
  127: 'DCBC81', // Gold
  128: 'AE7A59', // Dark nougat
  131: '9CA3A8', // Silver
  133: 'D5733D', // Neon orange
  134: 'D8DD56', // Neon green
  135: '74869D', // Sand blue
  136: '877C90', // Sand violet
  137: 'E09864', // Medium orange
  138: '958A73', // Sand yellow
  140: '203A56', // Earth blue
  141: '27462D', // Earth green
  143: 'CFE2F7', // Tr. Flu. Blue
  145: '7988A1', // Sand blue metallic
  146: '958EA3', // Sand violet metallic
  147: '938767', // Sand yellow metallic
  148: '575857', // Dark grey metallic
  149: '161D32', // Black metallic
  150: 'ABADAC', // Light grey metallic
  151: '789082', // Sand green
  153: '957977', // Sand red
  154: '7B2E2F', // Dark red
  157: 'FFF67B', // Tr. Flu. Yellow
  158: 'E1A4C2', // Tr. Flu. Red
  168: '756C62', // Gun metallic
  176: '97695B', // Red flip/flop
  178: 'B48455', // Yellow flip/flop
  179: '898788', // Silver flip/flop
  180: 'D7A94B', // Curry
  190: 'F9D62E', // Fire Yellow
  191: 'E8AB2D', // Flame yellowish orange
  192: '694028', // Reddish brown
  193: 'CF6024', // Flame reddish orange
  194: 'A3A2A5', // Medium stone grey
  195: '4667A4', // Royal blue
  196: '23478B', // Dark Royal blue
  198: '8E4285', // Bright reddish lilac
  199: '635F62', // Dark stone grey
  200: '828A5D', // Lemon metalic
  208: 'E5E4DF', // Light stone grey
  209: 'B08E44', // Dark Curry
  210: '709578', // Faded green
  211: '79B5B5', // Turquoise
  212: '9FC3E9', // Light Royal blue
  213: '6C81B7', // Medium Royal blue
  216: '904C2A', // Rust
  217: '7C5C46', // Brown
  218: '96709F', // Reddish lilac
  219: '6B629B', // Lilac
  220: 'A7A9CE', // Light lilac
  221: 'CD6298', // Bright purple
  222: 'E4ADC8', // Light purple
  223: 'DC9095', // Light pink
  224: 'F0D5A0', // Light brick yellow
  225: 'EBB87F', // Warm yellowish orange
  226: 'FDEA8D', // Cool yellow
  232: '7DBBDD', // Dove blue
  268: '342B75', // Medium lilac
  301: '506D54', // Slime green
  302: '5B5D69', // Smoky grey
  303: '0010B0', // Dark blue
  304: '2C651D', // Parsley green
  305: '527CAE', // Steel blue
  306: '335882', // Storm blue
  307: '102ADC', // Lapis
  308: '3D1585', // Dark indigo
  309: '348E40', // Sea green
  310: '5B9A4C', // Shamrock
  311: '9FA1AC', // Fossil
  312: '592259', // Mulberry
  313: '1F801D', // Forest green
  314: '9FADC0', // Cadet blue
  315: '0989CF', // Electric blue
  316: '7B007B', // Eggplant
  317: '7C9C6B', // Moss
  318: '8AAB85', // Artichoke
  319: 'B9C4B1', // Sage green
  320: 'CACBD1', // Ghost grey
  321: 'A75E9B', // Lilac (2015)
  322: '7B2F7B', // Plum
  323: '94BE81', // Olivine
  324: 'A8BD99', // Laurel green
  325: 'DFDFDE', // Quill grey
  327: '970000', // Crimson
  328: 'B1E5A6', // Mint
  329: '98C2DB', // Baby blue
  330: 'FF98DC', // Carnation pink
  331: 'FF5959', // Persimmon
  332: '750000', // Maroon
  333: 'EFB838', // Gold (2015)
  334: 'F8D96D', // Daisy orange
  335: 'E7E7EC', // Pearl
  336: 'C7D4E4', // Fog
  337: 'FF9494', // Salmon
  338: 'BE6862', // Terra Cotta
  339: '562424', // Cocoa
  340: 'F1E7C7', // Wheat
  341: 'FEF3BB', // Buttermilk
  342: 'E0B2D0', // Mauve
  343: 'D490BD', // Sunrise
  344: '965555', // Tawny
  345: '8F4C2A', // Rust (2015)
  346: 'D3BE96', // Cashmere
  347: 'E2DCBC', // Khaki
  348: 'EDEAEA', // Lily white
  349: 'E9DADA', // Seashell
  350: '883E3E', // Burgundy
  351: 'BC9B5D', // Cork
  352: 'C7AC78', // Burlap
  353: 'CABFA3', // Beige
  354: 'BBB3B2', // Oyster
  355: '6C584B', // Pine Cone
  356: 'A0844F', // Fawn brown
  357: '958988', // Hurricane grey
  358: 'ABA89E', // Cloudy grey
  359: 'AF9483', // Linen
  360: '966766', // Copper
  361: '564236', // Medium brown
  362: '7E683F', // Bronze
  363: '69665C', // Flint
  364: '5A4C42', // Dark taupe
  365: '6A3909', // Burnt Sienna
  1001: 'F8F8F8', // Institutional white
  1002: 'CDCDCD', // Mid gray
  1003: '111111', // Really black
  1004: 'FF0000', // Really red
  1005: 'FFB000', // Deep orange
  1006: 'B480FF', // Alder
  1007: 'A34B4B', // Dusty Rose
  1008: 'C1BE42', // Olive
  1009: 'FFFF00', // New Yeller
  1010: '0000FF', // Really blue
  1011: '002060', // Navy blue
  1012: '2154B9', // Deep blue
  1013: '04AFEC', // Cyan
  1014: 'AA5500', // CGA brown
  1015: 'AA00AA', // Magenta
  1016: 'FF66CC', // Pink
  1017: 'FFAF00', // Deep orange (alt)
  1018: '12EED4', // Teal
  1019: '00FFFF', // Toothpaste
  1020: '00FF00', // Lime green
  1021: '3A7D15', // Camo
  1022: '7F8E64', // Grime
  1023: '8C5B9F', // Lavender
  1024: 'AFDDFF', // Pastel light blue
  1025: 'FFC9C9', // Pastel orange
  1026: 'B1A7FF', // Pastel violet
  1027: '9FF3E9', // Pastel blue-green
  1028: 'CCFFCC', // Pastel green
  1029: 'FFFFCC', // Pastel yellow
  1030: 'FFCC99', // Pastel brown
  1031: '6225D1', // Royal purple
  1032: 'FF00BF' // Hot pink
}

function brickColorToHex(brickColorId: number): string | undefined {
  return BRICK_COLOR_TO_HEX[brickColorId]
}

function getColorFromBodyColors(
  bodyColors: Record<string, any>,
  partId: string
): string | undefined {
  const color3Key = partId
  if (bodyColors[color3Key] && typeof bodyColors[color3Key] === 'string') {
    return bodyColors[color3Key]
  }

  const idKey = partId.replace('Color3', 'ColorId')
  if (typeof bodyColors[idKey] === 'number') {
    return brickColorToHex(bodyColors[idKey])
  }

  return undefined
}

interface SkinColorEditorProps {
  account: Account
  currentBodyColors: Record<string, any> | null
  onUpdate: () => void
}

const BODY_PARTS = [
  { id: 'all', label: 'All' },
  { id: 'headColor3', label: 'Head' },
  { id: 'torsoColor3', label: 'Torso' },
  { id: 'leftArmColor3', label: 'Left Arm' },
  { id: 'rightArmColor3', label: 'Right Arm' },
  { id: 'leftLegColor3', label: 'Left Leg' },
  { id: 'rightLegColor3', label: 'Right Leg' }
]

const SkinColorEditor: React.FC<SkinColorEditorProps> = ({
  account,
  currentBodyColors,
  onUpdate
}) => {
  const [selectedPart, setSelectedPart] = useState('all')
  const [color, setColor] = useState<string | null>(null)
  const [initialColorLoaded, setInitialColorLoaded] = useState(false)
  const { showNotification } = useNotification()
  const setBodyColorsMutation = useSetBodyColors(account)

  useEffect(() => {
    if (!currentBodyColors) return

    let newColor: string | undefined
    if (selectedPart === 'all') {
      newColor = getColorFromBodyColors(currentBodyColors, 'headColor3')
    } else {
      newColor = getColorFromBodyColors(currentBodyColors, selectedPart)
    }

    if (newColor) {
      const normalizedColor = newColor.startsWith('#') ? newColor : `#${newColor}`
      setColor(normalizedColor)
      if (!initialColorLoaded) {
        setInitialColorLoaded(true)
      }
    }
  }, [selectedPart, currentBodyColors, initialColorLoaded])

  const handleColorChange = (rgba: [number, number, number, number]) => {
    const newColor = Color.rgb(rgba[0], rgba[1], rgba[2]).hex()
    setColor(newColor)
  }

  const handleSave = async () => {
    if (!account.cookie) return

    const bodyColors: Record<string, string> = {}

    if (!color) return

    if (selectedPart === 'all') {
      BODY_PARTS.forEach((part) => {
        if (part.id !== 'all') {
          bodyColors[part.id] = color
        }
      })
    } else {
      if (currentBodyColors) {
        BODY_PARTS.forEach((part) => {
          if (part.id !== 'all') {
            bodyColors[part.id] = currentBodyColors[part.id] || '#FFFFFF'
          }
        })
      }
      bodyColors[selectedPart] = color
    }

    setBodyColorsMutation.mutate(bodyColors, {
      onSuccess: () => {
        showNotification('Skin color updated successfully', 'success')
        onUpdate()
      },
      onError: (error) => {
        console.error('Failed to update skin color:', error)
        showNotification('Error updating skin color', 'error')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full w-full max-w-4xl mx-auto overflow-y-auto">
      <div className="flex flex-wrap gap-2 justify-center">
        {BODY_PARTS.map((part) => (
          <Button
            key={part.id}
            variant={selectedPart === part.id ? 'default' : 'secondary'}
            onClick={() => setSelectedPart(part.id)}
            className="min-w-[80px]"
          >
            {part.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 flex-1">
        <div className="w-full max-w-md">
          {initialColorLoaded && color !== null && (
            <ColorPicker value={color} onChange={handleColorChange} className="w-full" />
          )}
        </div>
      </div>

      <div className="flex justify-center pt-4 pb-8">
        <Button
          onClick={handleSave}
          disabled={setBodyColorsMutation.isPending || color === null}
          className="w-full max-w-xs"
          size="lg"
        >
          {setBodyColorsMutation.isPending ? 'Updating...' : 'Update Skin Color'}
        </Button>
      </div>
    </div>
  )
}

export default SkinColorEditor
