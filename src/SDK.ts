import { getPanelTabName } from './utils'

export interface SDKOptions {
  /**
   * When set to `true`, all logs will be printed to console.
   */
  debug?: boolean

  /**
   * When set to `true`, the extensions will be loaded and executed.
   */
  disabled?: boolean
}

export interface SDKExtension {
  /**
   * A link to the CDN from which to load the extension executable file.
   */
  cdnURL: string
}

export enum event {
  /**
   * The event is triggered when the SDK is initialized.
   */
  INIT = 'init',
}

export enum PanelTab {
  cc = 'cc',
  pg = 'pg',
  lc = 'lc',
  ref = 'ref',
  dv = 'dv',
  br = 'br',
  os = 'os',
  so = 'so',
  me = 'me',
  ca = 'ca',
  lt = 'lt',
}

enum DebugType {
  LOG = 'log',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
}

export type EventsObject = {
  [key in event]?: (eventData: any) => any
}

type SwetrixCallbacks = {
  onAddExportDataRow: (name: string, onClick: () => void) => void
  onRemoveExportDataRow: (name: string) => void
  onAddPanelTab: (extensionID: string, panelID: string, onClick: () => void) => void
  onRemovePanelTab: (extensionID: string, panelID: string) => void
}

/**
 * Initialise the SDK instance.
 *
 * @param {string} pid The Project ID to link the instance of Swetrix.js to.
 * @param {SDKOptions} options Options related to the tracking.
 * @returns {SDK} Instance of the Swetrix.js.
 */
export class SDK {
  private events: EventsObject = {}
  private exportDataRowValues: Array<string> = []
  private panelTabValues: Array<string> = []

  /**
   * Initialise the SDK instance.
   * 
   * @param {SDKExtension[]} extensions The extensions to load and execute.
   * @param {SDKOptions} options Swetrix SDK options.
   */
  constructor(private extensions: SDKExtension[], private options?: SDKOptions, private swetrixCallbacks?: SwetrixCallbacks) {
    this.init()
  }

  private init(): void {
    if (this.options?.disabled) {
      this.debug('SDK is disabled, skipping initialisation')
      return
    }

    this.extensions.forEach(({ cdnURL }) => {
      this.loadExtension(cdnURL)
    })
  }

  private onExtesionLoadError = (cdnURL: string) => {
    this.debug(`Error while loading extension from ${cdnURL}`, DebugType.ERROR)
  }

  private loadExtension = (cdnURL: string): void => {
    fetch(cdnURL)
      // Parse the response as text, return a dummy script if the response is not ok
      .then((res) => {
        if (!res.ok) {
          this.onExtesionLoadError(cdnURL)
          return '(() => {})'
        }

        return res.text()
      })
      // Execute the extension
      .then(code => {
        eval(code)(this)
      })
  }

  private debug(message: string, type: DebugType = DebugType.LOG): void {
    if (this.options?.debug) {
      console[type]('[Swetrix SDK]', message)
    }
  }

  public _emitEvent(event: event, eventData: any): void {
    this.debug(`Emitting event ${event}`)
    this.events[event]?.(eventData)
  }

  public _destroy(): void {
    this.debug('Destroying the SDK instance')
    this.events = {}
    this.extensions = []
  }

  // -----------
  // Public methods that are avaliable to the extension developers.
  // -----------

  /**
   * Add an event listener.
   * 
   * @param {event} event The event to listen to.
   * @param {(eventData: any) => any} callback The callback to execute when the event is triggered.
   * @returns {void}
   */
  public addEventListener(
    event: event,
    callback: (eventData: any) => any,
  ): void {
    this.debug(`Adding event listener for ${event}`)

    this.events = {
      ...this.events,
      [event]: callback,
    }
  }

  /**
   * Remove an event listener.
   * 
   * @param {event} event The event to remove the listener from.
   * @returns {void}
   */
  public removeEventListener(event: event): void {
    this.debug(`Removing event listener for ${event}`)

    this.events = {
      ...this.events,
      [event]: undefined,
    }
  }

  public addExportDataRow(name: string, onClick: () => void): void {
    this.debug(`Adding export data row ${name}`)

    if (this.exportDataRowValues.includes(name)) {
      this.debug(`Export data row ${name} already exists`, DebugType.WARN)
      return
    }

    this.exportDataRowValues.push(name)
    this.swetrixCallbacks?.onAddExportDataRow(name, onClick)
  }

  public removeExportDataRow(name: string): void {
    this.debug(`Removing export data row ${name}`)

    if (!this.exportDataRowValues.includes(name)) {
      this.debug(`Export data row ${name} does not exist`, DebugType.WARN)
      return
    }

    this.exportDataRowValues = this.exportDataRowValues.filter(value => value !== name)
    this.swetrixCallbacks?.onRemoveExportDataRow(name)
  }

  public addPanelTab(extensionID: string, panelID: PanelTab, onClick: () => void): void {
    this.debug(`Adding panel tab ${panelID}`)
    const panelName = getPanelTabName(extensionID, panelID)

    if (this.panelTabValues.includes(panelName)) {
      this.debug(`Panel tab ${panelID} (${extensionID}) already exists`, DebugType.WARN)
      return
    }

    this.swetrixCallbacks?.onAddPanelTab(extensionID, panelID, onClick)
  }

  public removePanelTab(extensionID: string, panelID: PanelTab): void {
    this.debug(`Removing panel tab ${panelID}`)
    const panelName = getPanelTabName(extensionID, panelID)

    if (!this.panelTabValues.includes(panelName)) {
      this.debug(`Panel tab ${panelID} (${extensionID}) does not exist`, DebugType.WARN)
      return
    }

    this.swetrixCallbacks?.onRemovePanelTab(extensionID, panelID)
  }
}
