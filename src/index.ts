import { mergeSettings } from './utils/merge-settings'

import { Board } from './Board'
import { Events } from './Events'
import { History } from './History'
import { Export } from './Export'
import { Import } from './Import'

import { Flip } from './Flip'
import { Filter } from './Filter'
import { Cropper } from './Cropper'
import { Rotation } from './Rotation'
import { SnapGrid } from './SnapGrid'
import { Selection } from './Selection'

import { SvgDrawer } from './shape/drawers/SvgDrawer'
import { TextDrawer } from './shape/drawers/TextDrawer'
import { LineDrawer } from './shape/drawers/LineDrawer'
import { RectDrawer } from './shape/drawers/RectDrawer'
import { ArrowDrawer } from './shape/drawers/ArrowDrawer'
import { LabelDrawer } from './shape/drawers/LabelDrawer'
import { PencilDrawer } from './shape/drawers/PencilDrawer'
import { ImageDrawer } from './shape/drawers/ImageDrawer'
import { CircleDrawer } from './shape/drawers/CircleDrawer'
import { EllipseDrawer } from './shape/drawers/EllipseDrawer'
import { PolygonDrawer } from './shape/drawers/PolygonDrawer'
import { TriangleDrawer } from './shape/drawers/TriangleDrawer'

import { isBrowser } from './utils/detect-environment'

import type {
  Settings,
  EventListenerNames,
  ListenerCallback,
  BaseShapes,
  RegisterShapesFn,
  BackgroundOptions
} from './types'

/**
 * This is the main class and entry point that creates a new editor instance
 * @see [[constructor]]
 */
export default class Pikaso<Shapes extends BaseShapes = BaseShapes> {
  /**
   * Represents the [[Board]]
   */
  public board: Board

  /**
   * Represents the [[Export]]
   */
  public export: Export

  /**
   * Represents the [[Import]]
   */
  public import: Import

  /**
   * Represents the [[ShapeModel | Shapes]] creators
   */
  public shapes: Shapes

  /**
   * Represents the [[Selection]] component
   */
  public selection: Selection

  /**
   * Represents the [[Rotation]] component
   */
  public rotation: Rotation

  /**
   * Represents [[Cropper]] component
   */
  public cropper: Cropper

  /**
   * Represents [[Flip]] component
   */
  public flip: Flip

  /**
   * Represents the [[Events | event manager]]
   *
   * This is also possible to Subscribe and Unsubscribe events
   * with [[on | on method]] and [[off | off method]] of the main class
   *
   * @see [[Events]]
   * @see list of listeneres: [[EventListenerNames]]
   */
  public events: Events

  /**
   * Represents the [[History | actions history]]
   */
  public history: History

  /**
   * Represents the [[Filter]]
   */
  public filters: Filter

  /**
   * Represents the [[SnapGrid]]
   */
  public snapGrid: SnapGrid

  /**
   * Represents [[Settings]]
   */
  private settings: Settings

  /**
   *
   */
  private registerShapes?: RegisterShapesFn<Shapes>

  /**
   * Creates a new editor instance
   *
   * @param settings The editor settings
   *
   * @example
   * ```ts
   * const editor = new Pikaso({
   *   container: document.getElementById('myDiv') as HTMLDivElement
   * })
   * ```
   * @public
   */
  constructor(settings: Settings, registerShapes?: RegisterShapesFn<Shapes>) {
    if (isBrowser() && !settings.container) {
      throw new Error('It needs to have a container element')
    }

    this.settings = mergeSettings(settings)
    this.registerShapes = registerShapes

    this.init()
  }

  /**
   * Loads the background image from url
   * This method is a shortcut to [[Background.setImageFromFile]]
   *
   * @param file The image file
   * @param options The background options
   */
  public async loadFromFile(file: File, options?: Partial<BackgroundOptions>) {
    await this.board.background.setImageFromFile(file, options)
  }

  /**
   * Loads the background image from url
   * This method is a shortcut to [[Background.setImageFromUrl]]
   *
   * @param url The image url
   * @param options The background options
   */
  public async loadFromUrl(url: string, options?: Partial<BackgroundOptions>) {
    await this.board.background.setImageFromUrl(url, options)
  }

  /**
   * Resizes the board based on the new container size
   *
   * This method is a shortcut to [[Board.rescale]]
   *
   * @remarks
   * This method can be used with resize event of window to rescale the board
   *
   * @example
   *
   * ```ts
   * const editor = new Pikaso({
   *   container: document.getElementById('myDiv') as HTMLDivElement
   * })
   *
   * window.addEventListener('resize', () => {
   *  editor.board.rescale()
   * })
   * ```
   */
  public rescale() {
    this.board.rescale()
  }

  /**
   * Reverses the last action
   */
  public undo() {
    this.history.undo()
  }

  /**
   * Reverses the last [[undo]]
   */
  public redo() {
    this.history.redo()
  }

  /**
   * Subscribes to one or multiple events
   *
   * This method is a shortcut to [[Events.on]]
   */
  public on(
    name: EventListenerNames | EventListenerNames[],
    callback: ListenerCallback
  ) {
    this.events.on(name, callback)
  }

  /**
   * UnSubscribes from one or multiple events
   *
   * This method is a shortcut to [[Events.off]]
   */
  public off(
    name: EventListenerNames | EventListenerNames[],
    callback: ListenerCallback
  ) {
    this.events.off(name, callback)
  }

  /**
   * Resets everything and reinitializes the editor
   */
  public reset() {
    this.init()
    this.events.emit('history:reset')
  }

  /**
   * Reloads the workspace with the given data
   *
   * @param data The JSON object
   */
  public async load(data: string) {
    this.reset()
    await this.import.json(JSON.parse(data))
  }

  /**
   * Initializes the editor
   */
  private init() {
    const events = new Events()
    const history = new History(this.settings, events)
    const board = new Board(this.settings, events, history)

    console.log("hihihihihihihihih")

    this.selection = board.selection

    this.flip = new Flip(board)
    this.filters = new Filter(board)
    this.cropper = new Cropper(board)
    this.rotation = new Rotation(board)
    this.snapGrid = new SnapGrid(board)

    this.shapes = {
      arrow: new ArrowDrawer(board),
      circle: new CircleDrawer(board),
      ellipse: new EllipseDrawer(board),
      image: new ImageDrawer(board),
      label: new LabelDrawer(board),
      line: new LineDrawer(board),
      pencil: new PencilDrawer(board),
      polygon: new PolygonDrawer(board),
      rect: new RectDrawer(board),
      triangle: new TriangleDrawer(board),
      text: new TextDrawer(board),
      svg: new SvgDrawer(board),
      ...this.registerShapes?.(board)
    } as Shapes

    this.import = new Import(board, this.shapes)
    this.export = new Export(board, this.cropper)

    this.board = board
    this.events = events
    this.history = history
  }
}
