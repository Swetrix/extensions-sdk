import { PanelTab } from './SDK'

const getPanelTabName = (extensionID: string, name: PanelTab): string => `${extensionID}-${name}`

export {
  getPanelTabName,
}