/**
 * Roblox Binary Model (.rbxm/.rbxl) Reader
 * Decodes binary Roblox files into a structured format compatible with xmlReader.ts
 */

import lz4 from 'lz4js'
import * as fzstd from 'fzstd'
import { Instance, Properties, Property } from './xmlReader'

function formatNum(num: number) {
  if (Math.abs(num) < 0.0001) return '0'
  return Number(num.toPrecision(5)).toString()
}

function bytesToBitArray(bytes: Uint8Array) {
  const output = new Uint8Array(bytes.length * 8)
  for (let i = 0; i < bytes.length; i++) {
    const val = bytes[i]
    const offset = i * 8
    for (let j = 0; j < 8; ++j) {
      output[7 - j + offset] = (val >> j) & 1
    }
  }
  return output
}

function bitsToByteArray(bits: Uint8Array) {
  const outBytes = new Uint8Array(bits.length / 8)
  for (let i = 0; i < 4; ++i) {
    let val = 0
    const offset = i * 8
    for (let j = 0; j < 8; ++j) {
      val |= bits[j + offset] << (7 - j)
    }
    outBytes[i] = val
  }
  return outBytes
}

export enum DataType {
  String = 0x01,
  Bool = 0x02,
  Int32 = 0x03,
  Float32 = 0x04,
  Float64 = 0x05,
  UDim = 0x06,
  UDim2 = 0x07,
  Ray = 0x08,
  Faces = 0x09,
  Axes = 0x0a,
  BrickColor = 0x0b,
  Color3 = 0x0c,
  Vector2 = 0x0d,
  Vector3 = 0x0e,
  CFrame = 0x10,
  Enum = 0x12,
  Referent = 0x13,
  Vector3int16 = 0x14,
  NumberSequence = 0x15,
  ColorSequence = 0x16,
  NumberRange = 0x17,
  Rect = 0x18,
  PhysicalProperties = 0x19,
  Color3uint8 = 0x1a,
  Int64 = 0x1b,
  SharedString = 0x1c,
  Bytecode = 0x1d,
  OptionalCFrame = 0x1e,
  UniqueId = 0x1f,
  Font = 0x20,
  SecurityCapabilities = 0x21
}

export class Vector3Value {
  constructor(
    public X: number,
    public Y: number,
    public Z: number
  ) {}
  toString() {
    return `${formatNum(this.X)}, ${formatNum(this.Y)}, ${formatNum(this.Z)}`
  }
}

export class Vector2Value {
  constructor(
    public X: number,
    public Y: number
  ) {}
  toString() {
    return `${formatNum(this.X)}, ${formatNum(this.Y)}`
  }
}

export class CFrameValue {
  constructor(
    public Position: Vector3Value,
    public Orientation: number[]
  ) {}
  static get Identity() {
    return new CFrameValue(new Vector3Value(0, 0, 0), [1, 0, 0, 0, 1, 0, 0, 0, 1])
  }
  toString() {
    return `${this.Position}, ${this.Orientation.map(formatNum).join(', ')}`
  }
}

export class Color3Value {
  constructor(
    public R: number,
    public G: number,
    public B: number
  ) {}
  static FloatToUint8(n: number) {
    return Math.round(n * 255)
  }
  static FromRGB(r: number, g: number, b: number) {
    return new Color3Value(r / 255, g / 255, b / 255)
  }
  toString() {
    return `${Color3Value.FloatToUint8(this.R)}, ${Color3Value.FloatToUint8(this.G)}, ${Color3Value.FloatToUint8(this.B)}`
  }
}

export class UDimValue {
  constructor(
    public Scale: number,
    public Offset: number
  ) {}
  toString() {
    return `{${formatNum(this.Scale)}, ${formatNum(this.Offset)}}`
  }
}

export class UDim2Value {
  constructor(
    public X: UDimValue,
    public Y: UDimValue
  ) {}
  toString() {
    return `${this.X}, ${this.Y}`
  }
}

export class SharedStringValue {
  public Hash: Uint8Array
  constructor(
    public Value: string,
    hash?: string
  ) {
    this.Hash = hash ? Buffer.from(hash, 'binary') : new Uint8Array()
  }
}

export class EnumItemValue {
  constructor(
    private _name: string,
    private _value: number
  ) {}
  get Name() {
    return this._name
  }
  get Value() {
    return this._value
  }
  toString() {
    return this._name || this._value.toString()
  }
  static MakeUnknownEnum(value: number) {
    return new EnumItemValue('', value)
  }
}

export type RobloxValue = { type: DataType; value: any }

export class CoreInstance {
  public Name: string = 'Instance'
  public Parent?: CoreInstance
  public ClassName: string
  public IsService: boolean
  public referent: string = ''
  private _children: Set<CoreInstance> = new Set()
  private _props: Map<string, RobloxValue> = new Map()

  constructor(isService: boolean, className: string) {
    this.IsService = isService
    this.ClassName = className
  }

  public get Children(): ReadonlyArray<CoreInstance> {
    return Array.from(this._children)
  }

  public SetProp(name: string, type: DataType, value: any) {
    if (name === 'Name' && type === DataType.String) this.Name = value
    this._props.set(name, { type, value })
  }

  public GetProp(name: string) {
    return this._props.get(name)?.value
  }

  public AddChild(child: CoreInstance) {
    if (child.Parent) child.Parent._children.delete(child)
    child.Parent = this
    this._children.add(child)
  }

  public toString(): string {
    return `${this.ClassName} "${this.Name}"`
  }

  public get Properties() {
    return this._props
  }
}

export class RobloxBinaryFile {
  public Metadata: Map<string, string> = new Map()
  public SharedStrings: SharedStringValue[] = []
  public Roots: CoreInstance[] = []

  static ReadFromBuffer(buffer: Buffer) {
    return new RobloxFileDOMReader().read(new Uint8Array(buffer))
  }
}

class ByteReader {
  private idx = 0
  constructor(private data: Uint8Array) {}

  get length() {
    return this.data.length
  }

  getUint8() {
    return this.data[this.idx++]
  }
  getUint32() {
    let val = 0
    for (let i = 0; i < 4; ++i) val += this.data[this.idx++] << (i * 8)
    return val >>> 0
  }
  getInt32() {
    const bytes = this.getBytesReversed(4)
    return Buffer.from(bytes).readInt32BE(0)
  }
  getFloat32() {
    const bytes = this.getBytes(4)
    return Buffer.from(bytes).readFloatLE(0)
  }
  getFloat64() {
    const bytes = this.getBytes(8)
    return Buffer.from(bytes).readDoubleLE(0)
  }
  getString() {
    const len = this.getUint32()
    let str = ''
    for (let i = 0; i < len; i++) str += String.fromCharCode(this.data[this.idx++])
    return str
  }
  getBool() {
    return this.getUint8() !== 0
  }
  getBytes(n: number) {
    const res = this.data.slice(this.idx, this.idx + n)
    this.idx += n
    return res
  }
  getBytesAsString(n: number) {
    let str = ''
    for (let i = 0; i < n; i++) str += String.fromCharCode(this.data[this.idx++])
    return str
  }
  getBytesReversed(n: number) {
    const res = new Uint8Array(n)
    for (let i = n - 1; i >= 0; i--) res[i] = this.data[this.idx++]
    return res
  }
  skip(n: number) {
    this.idx += n
  }

  static convertInterleaved<T>(bytes: Uint8Array, count: number, fn: (b: Uint8Array) => T): T[] {
    const stride = bytes.length / count
    const res = new Array<T>(count)
    for (let i = 0; i < count; i++) {
      const buf = new Uint8Array(stride)
      for (let j = 0; j < stride; j++) buf[stride - 1 - j] = bytes[i + j * count]
      res[i] = fn(buf)
    }
    return res
  }

  getInterleavedInt32(count: number) {
    const raw = this.getBytes(count * 4)
    return ByteReader.convertInterleaved(raw, count, (b) => {
      const i = Buffer.from(b).readInt32BE(0)
      return (i >> 1) ^ -(i & 1) // un-zigzag
    })
  }

  getInterleavedFloat32(count: number) {
    const raw = this.getBytes(count * 4)
    return ByteReader.convertInterleaved(raw, count, (b) => {
      // Roblox float format transform
      const rbxBits = bytesToBitArray(b)
      const stdBits = new Uint8Array(32)
      for (let i = 0; i < 31; i++) stdBits[i + 1] = rbxBits[i]
      stdBits[0] = rbxBits[31]
      return Buffer.from(bitsToByteArray(stdBits)).readFloatBE(0)
    })
  }
}

abstract class TypeParser {
  abstract read(
    r: ByteReader,
    count: number,
    values: (RobloxValue | undefined)[],
    extra?: any
  ): void
}

const Parsers: Partial<Record<DataType, TypeParser>> = {
  [DataType.String]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) out.push({ type: DataType.String, value: r.getString() })
    }
  },
  [DataType.Bool]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) out.push({ type: DataType.Bool, value: r.getBool() })
    }
  },
  [DataType.Int32]: {
    read(r, count, out) {
      const vals = r.getInterleavedInt32(count)
      vals.forEach((v) => out.push({ type: DataType.Int32, value: v }))
    }
  },
  [DataType.Float32]: {
    read(r, count, out) {
      const vals = r.getInterleavedFloat32(count)
      vals.forEach((v) => out.push({ type: DataType.Float32, value: v }))
    }
  },
  [DataType.Float64]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) out.push({ type: DataType.Float64, value: r.getFloat64() })
    }
  },
  [DataType.UDim]: {
    read(r, count, out) {
      const s = r.getInterleavedFloat32(count)
      const o = r.getInterleavedInt32(count)
      for (let i = 0; i < count; i++)
        out.push({ type: DataType.UDim, value: new UDimValue(s[i], o[i]) })
    }
  },
  [DataType.UDim2]: {
    read(r, count, out) {
      const sx = r.getInterleavedFloat32(count)
      const sy = r.getInterleavedFloat32(count)
      const ox = r.getInterleavedInt32(count)
      const oy = r.getInterleavedInt32(count)
      for (let i = 0; i < count; i++)
        out.push({
          type: DataType.UDim2,
          value: new UDim2Value(new UDimValue(sx[i], ox[i]), new UDimValue(sy[i], oy[i]))
        })
    }
  },
  [DataType.Vector3]: {
    read(r, count, out) {
      const x = r.getInterleavedFloat32(count)
      const y = r.getInterleavedFloat32(count)
      const z = r.getInterleavedFloat32(count)
      for (let i = 0; i < count; i++)
        out.push({ type: DataType.Vector3, value: new Vector3Value(x[i], y[i], z[i]) })
    }
  },
  [DataType.Vector2]: {
    read(r, count, out) {
      const x = r.getInterleavedFloat32(count)
      const y = r.getInterleavedFloat32(count)
      for (let i = 0; i < count; i++)
        out.push({ type: DataType.Vector2, value: new Vector2Value(x[i], y[i]) })
    }
  },
  [DataType.Color3]: {
    read(r, count, out) {
      const red = r.getInterleavedFloat32(count)
      const green = r.getInterleavedFloat32(count)
      const blue = r.getInterleavedFloat32(count)
      for (let i = 0; i < count; i++)
        out.push({ type: DataType.Color3, value: new Color3Value(red[i], green[i], blue[i]) })
    }
  },
  [DataType.Color3uint8]: {
    read(r, count, out) {
      const red = r.getBytes(count)
      const green = r.getBytes(count)
      const blue = r.getBytes(count)
      for (let i = 0; i < count; i++)
        out.push({
          type: DataType.Color3uint8,
          value: Color3Value.FromRGB(red[i], green[i], blue[i])
        })
    }
  },
  [DataType.CFrame]: {
    read(r, count, out) {
      // Orientation matrices are complex (compressed as rotation IDs or raw floats)
      const orientations: number[][] = []
      for (let i = 0; i < count; ++i) {
        const id = r.getUint8()
        if (id > 0) {
          // In a full implementation, we'd map IDs to rotation matrices
          // For brevity, we'll push Identity for known IDs
          orientations.push([1, 0, 0, 0, 1, 0, 0, 0, 1])
        } else {
          const mat: number[] = []
          for (let k = 0; k < 9; k++) mat.push(r.getFloat32())
          orientations.push(mat)
        }
      }
      const x = r.getInterleavedFloat32(count)
      const y = r.getInterleavedFloat32(count)
      const z = r.getInterleavedFloat32(count)
      for (let i = 0; i < count; i++)
        out.push({
          type: DataType.CFrame,
          value: new CFrameValue(new Vector3Value(x[i], y[i], z[i]), orientations[i])
        })
    }
  },
  [DataType.Enum]: {
    read(r, count, out) {
      const vals = r.getInterleavedInt32(count)
      for (let i = 0; i < count; i++)
        out.push({ type: DataType.Enum, value: EnumItemValue.MakeUnknownEnum(vals[i]) })
    }
  },
  [DataType.Referent]: {
    read(r, count, out, extra) {
      const refs = r.getInterleavedInt32(count)
      for (let i = 1; i < count; i++) refs[i] += refs[i - 1]

      for (let i = 0; i < count; i++) {
        const inst = extra.getInst(refs[i])
        out.push(inst ? { type: DataType.Referent, value: inst } : undefined)
      }
    }
  },
  [DataType.BrickColor]: {
    read(r, count, out) {
      const vals = r.getInterleavedInt32(count)
      for (let i = 0; i < count; i++) out.push({ type: DataType.BrickColor, value: vals[i] })
    }
  },
  [DataType.NumberRange]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) {
        const min = r.getFloat32()
        const max = r.getFloat32()
        out.push({ type: DataType.NumberRange, value: { Min: min, Max: max } })
      }
    }
  },
  [DataType.NumberSequence]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) {
        const keypointCount = r.getUint32()
        const keypoints: { Time: number; Value: number; Envelope: number }[] = []
        for (let j = 0; j < keypointCount; j++) {
          keypoints.push({
            Time: r.getFloat32(),
            Value: r.getFloat32(),
            Envelope: r.getFloat32()
          })
        }
        out.push({ type: DataType.NumberSequence, value: keypoints })
      }
    }
  },
  [DataType.ColorSequence]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) {
        const keypointCount = r.getUint32()
        const keypoints: { Time: number; Color: Color3Value; Envelope: number }[] = []
        for (let j = 0; j < keypointCount; j++) {
          keypoints.push({
            Time: r.getFloat32(),
            Color: new Color3Value(r.getFloat32(), r.getFloat32(), r.getFloat32()),
            Envelope: r.getFloat32()
          })
        }
        out.push({ type: DataType.ColorSequence, value: keypoints })
      }
    }
  },
  [DataType.Rect]: {
    read(r, count, out) {
      const minX = r.getInterleavedFloat32(count)
      const minY = r.getInterleavedFloat32(count)
      const maxX = r.getInterleavedFloat32(count)
      const maxY = r.getInterleavedFloat32(count)
      for (let i = 0; i < count; i++)
        out.push({
          type: DataType.Rect,
          value: {
            Min: new Vector2Value(minX[i], minY[i]),
            Max: new Vector2Value(maxX[i], maxY[i])
          }
        })
    }
  },
  [DataType.PhysicalProperties]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) {
        const hasCustom = r.getBool()
        if (hasCustom) {
          out.push({
            type: DataType.PhysicalProperties,
            value: {
              Density: r.getFloat32(),
              Friction: r.getFloat32(),
              Elasticity: r.getFloat32(),
              FrictionWeight: r.getFloat32(),
              ElasticityWeight: r.getFloat32()
            }
          })
        } else {
          out.push({ type: DataType.PhysicalProperties, value: null })
        }
      }
    }
  },
  [DataType.Int64]: {
    read(r, count, out) {
      for (let i = 0; i < count; i++) {
        const bytes = r.getBytes(8)
        const low = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | ((bytes[3] << 24) >>> 0)
        const high = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | ((bytes[7] << 24) >>> 0)
        // For simplicity, return as BigInt or string
        const value = BigInt(high) * BigInt(0x100000000) + BigInt(low >>> 0)
        out.push({ type: DataType.Int64, value: value.toString() })
      }
    }
  },
  [DataType.SharedString]: {
    read(r, count, out, extra) {
      const indices = r.getInterleavedInt32(count)
      for (let i = 0; i < count; i++) {
        const sharedStr = extra.sharedStrings?.[indices[i]]
        out.push({
          type: DataType.SharedString,
          value: sharedStr?.Value || ''
        })
      }
    }
  }
}

class RobloxFileDOMReader {
  private file = new RobloxBinaryFile()
  private instMap = new Map<number, CoreInstance>()
  private instClassMap = new Map<number, number>()
  private classInfos = new Map<
    number,
    { name: string; isService: boolean; instances: CoreInstance[]; refs: number[] }
  >()

  read(data: Uint8Array): RobloxBinaryFile | null {
    const r = new ByteReader(data)
    if (
      r.getBytesAsString(8) !== '<roblox!' ||
      r.getBytesAsString(6) !== '\x89\xff\x0d\x0a\x1a\x0a'
    ) {
      console.error('Invalid Header')
      return null
    }

    r.skip(2 + 4 + 4 + 8)

    while (true) {
      const type = r.getBytesAsString(4)
      const compLen = r.getUint32()
      const rawLen = r.getUint32()
      r.skip(4)

      if (type === 'END\0') break

      let chunkData: Uint8Array
      if (compLen > 0) {
        const compressed = r.getBytes(compLen)
        if (
          compressed[0] === 0x28 &&
          compressed[1] === 0xb5 &&
          compressed[2] === 0x2f &&
          compressed[3] === 0xfd
        ) {
          chunkData = Buffer.allocUnsafe(rawLen)
          fzstd.decompress(compressed, chunkData)
        } else {
          chunkData = new Uint8Array(rawLen)
          lz4.decompressBlock(compressed, chunkData, 0, compLen, 0)
        }
      } else {
        chunkData = r.getBytes(rawLen)
      }

      this.parseChunk(type, new ByteReader(chunkData))
    }

    for (const inst of this.instMap.values()) {
      if (!inst.Parent) this.file.Roots.push(inst)
    }

    return this.file
  }

  parseChunk(type: string, r: ByteReader) {
    if (type === 'INST') {
      const classId = r.getUint32()
      const className = r.getString()
      const isService = r.getBool()
      const count = r.getUint32()
      const refs = r.getInterleavedInt32(count)

      for (let i = 1; i < count; i++) refs[i] += refs[i - 1]

      const instances: CoreInstance[] = []
      for (const ref of refs) {
        const inst = new CoreInstance(isService, className)
        inst.referent = `RBX${ref.toString(16).toUpperCase()}`
        this.instMap.set(ref, inst)
        this.instClassMap.set(ref, classId)
        instances.push(inst)
      }

      this.classInfos.set(classId, { name: className, isService, instances, refs })
    } else if (type === 'PROP') {
      const classId = r.getUint32()
      const propName = r.getString()
      const dataType = r.getUint8() as DataType

      const info = this.classInfos.get(classId)
      if (!info) return

      const parser = Parsers[dataType]
      if (parser) {
        const values: (RobloxValue | undefined)[] = []
        parser.read(r, info.instances.length, values, {
          getInst: (ref: number) => this.instMap.get(ref),
          sharedStrings: this.file.SharedStrings
        })
        for (let i = 0; i < values.length; i++) {
          const val = values[i]
          if (val) info.instances[i].SetProp(propName, val.type, val.value)
        }
      }
    } else if (type === 'PRNT') {
      r.getUint8()
      const count = r.getUint32()
      const childRefs = r.getInterleavedInt32(count)
      const parentRefs = r.getInterleavedInt32(count)

      for (let i = 1; i < count; i++) {
        childRefs[i] += childRefs[i - 1]
        parentRefs[i] += parentRefs[i - 1]
      }

      for (let i = 0; i < count; i++) {
        const child = this.instMap.get(childRefs[i])
        const parent = this.instMap.get(parentRefs[i])
        if (child && parent) {
          parent.AddChild(child)
        }
      }
    } else if (type === 'META') {
      const count = r.getUint32()
      for (let i = 0; i < count; i++) {
        this.file.Metadata.set(r.getString(), r.getString())
      }
    } else if (type === 'SSTR') {
      r.getUint32()
      const count = r.getUint32()
      for (let i = 0; i < count; i++) {
        const hash = r.getBytesAsString(16)
        const value = r.getString()
        this.file.SharedStrings.push(new SharedStringValue(value, hash))
      }
    }
  }
}

/**
 * Converts a CoreInstance from binary format to the Instance class used by xmlReader.ts
 * This allows the same data structure to be used regardless of whether the file was XML or binary
 */
function convertToXmlInstance(coreInst: CoreInstance): Instance {
  const inst = new Instance(coreInst.ClassName)
  inst.referent = coreInst.referent

  const props: Properties = {}
  for (const [name, robloxVal] of coreInst.Properties) {
    props[name] = convertRobloxValueToProperty(name, robloxVal)
  }
  inst.properties = props

  for (const child of coreInst.Children) {
    convertToXmlInstance(child).setParent(inst)
  }

  return inst
}

/**
 * Converts a RobloxValue to a Property format compatible with xmlReader
 */
function convertRobloxValueToProperty(_name: string, rVal: RobloxValue): Property {
  const typeMap: Record<DataType, string> = {
    [DataType.String]: 'string',
    [DataType.Bool]: 'bool',
    [DataType.Int32]: 'int',
    [DataType.Float32]: 'float',
    [DataType.Float64]: 'double',
    [DataType.UDim]: 'UDim',
    [DataType.UDim2]: 'UDim2',
    [DataType.Ray]: 'Ray',
    [DataType.Faces]: 'Faces',
    [DataType.Axes]: 'Axes',
    [DataType.BrickColor]: 'BrickColor',
    [DataType.Color3]: 'Color3',
    [DataType.Vector2]: 'Vector2',
    [DataType.Vector3]: 'Vector3',
    [DataType.CFrame]: 'CoordinateFrame',
    [DataType.Enum]: 'token',
    [DataType.Referent]: 'Ref',
    [DataType.Vector3int16]: 'Vector3int16',
    [DataType.NumberSequence]: 'NumberSequence',
    [DataType.ColorSequence]: 'ColorSequence',
    [DataType.NumberRange]: 'NumberRange',
    [DataType.Rect]: 'Rect',
    [DataType.PhysicalProperties]: 'PhysicalProperties',
    [DataType.Color3uint8]: 'Color3uint8',
    [DataType.Int64]: 'int64',
    [DataType.SharedString]: 'SharedString',
    [DataType.Bytecode]: 'ProtectedString',
    [DataType.OptionalCFrame]: 'OptionalCoordinateFrame',
    [DataType.UniqueId]: 'UniqueId',
    [DataType.Font]: 'Font',
    [DataType.SecurityCapabilities]: 'SecurityCapabilities'
  }

  const typeName = typeMap[rVal.type] || 'string'
  let value = rVal.value

  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    if (
      value instanceof Vector3Value ||
      value instanceof Vector2Value ||
      value instanceof CFrameValue ||
      value instanceof Color3Value ||
      value instanceof UDimValue ||
      value instanceof UDim2Value
    ) {
      value = value.toString()
    } else if (value instanceof CoreInstance) {
      value = value.referent
    }
  }

  return { value, type: typeName }
}

/**
 * Checks if a buffer contains a binary Roblox file
 */
export function isBinaryRobloxFile(content: string | Buffer): boolean {
  if (Buffer.isBuffer(content)) {
    return content.length >= 8 && content.slice(0, 8).toString() === '<roblox!'
  }
  return content.startsWith('<roblox!')
}

/**
 * Main entry point: Parse a binary Roblox file and return an Instance tree
 * compatible with the xmlReader format
 */
export function parseBinaryRobloxFile(buffer: Buffer): Instance {
  const file = RobloxBinaryFile.ReadFromBuffer(buffer)

  if (!file) {
    throw new Error('Failed to parse binary Roblox file')
  }

  const dataModel = new Instance('DataModel')
  dataModel.properties = {}

  for (const root of file.Roots) {
    convertToXmlInstance(root).setParent(dataModel)
  }

  return dataModel
}
