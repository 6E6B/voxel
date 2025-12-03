// idk who to credit for this

import { parseStringPromise, Builder } from 'xml2js'
import crypto from 'crypto'

export interface Property {
  value: any
  type: string
}

export interface Properties {
  [name: string]: Property
}

export interface PropertyXML {
  $: { name: string }
  _?: string
}

export interface PropertiesXML {
  [name: string]: PropertyXML[]
}

export interface InstanceXML {
  $: { class: string; referent: string }
  Properties: [PropertiesXML]
  Item: InstanceXML[]
}

export class Instance {
  referent: string
  class: string
  children: Instance[] = []
  properties: { [name: string]: Property }
  parent?: Instance

  setParent(newParent: Instance) {
    const oldparent = this.parent
    if (oldparent) {
      oldparent.children = oldparent.children.filter((x) => x.referent != this.referent)
    }
    this.parent = newParent
    newParent.children.push(this)
  }

  Clone(): Instance {
    const clone = new Instance(this.class)
    clone.properties = this.properties
    this.children.forEach((element) => {
      element.Clone().setParent(clone)
    })
    return clone
  }

  getDescendants(): Instance[] {
    let descendants: Instance[] = []
    this.children.forEach((element) => {
      descendants.push(element)
      element.getDescendants().forEach((element) => {
        descendants.push(element)
      })
    })
    return descendants
  }

  constructor(className: string, parent?: Instance) {
    this.referent = 'RBX' + crypto.randomBytes(16).toString('hex').toUpperCase()
    this.class = className || 'Part'
    this.properties = { Name: { value: className, type: 'string' } }
    if (parent) {
      this.setParent(parent)
    }
  }
}

export function convertProperties(properties: Properties): PropertiesXML {
  let grouped: PropertiesXML = {}
  for (let name in properties) {
    const { value, type } = properties[name]

    if (!grouped[type]) {
      // create category if list doesn't exists
      grouped[type] = []
    }

    let property: any = { $: { name: name } }
    if (typeof value == 'object') {
      property = Object.assign({}, property, value) // merge
      grouped[type].push(property)
    } else if (value) {
      // set value on xml
      property._ = value.toString()
      grouped[type].push(property)
    }
  }
  return grouped
}

export function parseProperties(properties: PropertiesXML): Properties {
  let parsed: Properties = {}
  for (let type in properties) {
    const props: PropertyXML[] = properties[type]

    for (let i in props) {
      const property: PropertyXML = props[i]
      const name = property['$'].name
      let value: any = property._

      if (!value && Object.keys(property).length > 1) {
        value = {}
        let values: any = property
        delete values['$']

        for (let key in values) {
          const val = values[key][0]
          if (val) {
            value[key] = val
          }
        }
      }

      parsed[name] = { value: value, type: type }
    }
  }
  return parsed
}

export function parseInstance(instance: { [name: string]: any }): Instance {
  const { class: className, referent } = instance['$']
  const result = new Instance(className)

  result.properties = parseProperties(instance.Properties[0])
  result.referent = referent
  if (instance.Item) {
    for (let i in instance.Item) {
      parseInstance(instance.Item[i]).setParent(result)
    }
  }
  return result
}

export function convertInstance(instance: Instance): InstanceXML {
  let converted: InstanceXML = {
    ['$']: { class: instance.class, referent: instance.referent },
    Properties: [convertProperties(instance.properties)],
    Item: []
  }
  instance.children.forEach((element) => {
    converted.Item.push(convertInstance(element))
  })
  return converted
}

export class RobloxXMLParser {
  dataModel: Instance

  async parse(xmlContent: string) {
    const parsed = await parseStringPromise(xmlContent)
    for (let i in parsed.roblox.Item) {
      parseInstance(parsed.roblox.Item[i]).setParent(this.dataModel)
    }
  }

  convertToXML(): string {
    const builder = new Builder()
    let base: any = { roblox: { ['$']: { version: '4' }, Item: [] } }
    this.dataModel.children.forEach((element) => {
      base.roblox.Item.push(convertInstance(element))
    })
    return builder
      .buildObject(base)
      .replaceAll('&#xD;', '')
      .replace('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n', '')
  }

  constructor() {
    this.dataModel = new Instance('DataModel')
    this.dataModel.properties = {}
  }
}
