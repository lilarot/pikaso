import Konva from 'konva'

import { History } from '../History'
import { Events } from '../Events'

import { Selection } from '../Selection'
import { Background } from '../Background'

import { ShapeModel } from '../shape/ShapeModel'

import type { Settings, DrawType } from '../types'

/**
 * Board class create and controls the main canvas
 * and manages the shapes in the workspace
 */
export class Board {
  /**
   * The stage that contains all layers
   * @see [[https://konvajs.org/api/Konva.Stage.html | Stage]]
   */
  public readonly stage: Konva.Stage

  /**
   * The main layer that contains all shapes and transformers
   * @see [[https://konvajs.org/api/Konva.Layer.html | Layer]]
   */
  public readonly layer: Konva.Layer

  /**
   * The html container element which the editor renders into that
   */
  public readonly container: HTMLDivElement

  /**
   * The settings
   */
  public readonly settings: Settings

  /**
   * The background of main layer that contains image and overlay
   *
   * @remark
   * Background component is a not selectable shape that represents Image and Rect nodes.
   * The nodes are accessible with `background.image` and `background.overlay` APIs
   * @see [[https://konvajs.org/api/Konva.Image.html | Image]] and [[ https://konvajs.org/api/Konva.Rect.html | Rect]]
   *
   * @example
   * ```ts
   * editor.board.background.setImageFromUrl('<url>')
   * ```
   *
   * @example
   * ```ts
   * editor.board.background.fill('rgba(0, 0, 0, 0.5)')
   * ```
   *
   * @example
   * ```ts
   * editor.board.background.filter({
   *  name: 'Blur',
   *  options: {
   *    blurRadius: 20
   *  }
   * })
   * ```
   */
  public readonly background: Background

  /**
   * The selection manager components that lets select and manage shapes with UI or API
   *
   * @example
   * Selects all shapes
   * ```ts
   * editor.board.selection.selectAll()
   * ```
   *
   * @example
   * Deselects all shapes
   * ```ts
   * editor.board.selection.deselectAll()
   * ```
   */
  public readonly selection: Selection

  /**
   * Demonstrates the current active drawing. it can be one of [[DrawType]] values or `null`.
   *
   * This property is managing by [[ShapeDrawer]] directly
   */
  public activeDrawing: DrawType | null = null

  /**
   * @see [[Events]]
   */
  public readonly events: Events

  /**
   * @see [[History]]
   */
  public readonly history: History

  /**
   * The array that contains all created shapes including active and deleted items. this property is managing by [[ShapeDrawer]] and [[Selection]]
   *
   * @see [[Board.addShape]] and [[Board.setShapes]]
   *
   */
  private shapes: Array<ShapeModel> = []

  /**
   * Creates a new stage, layer, background and selection instance
   *
   * @param settings The [[Settings]]
   * @param events The [[Events]]
   * @param history The [[History]]
   */
  constructor(settings: Settings, events: Events, history: History) {
    this.settings = settings
    this.history = history
    this.events = events

    const width = this.settings.width || this.settings.container.clientWidth
    const height = this.settings.height || this.settings.container.clientHeight

    // store settings
    this.settings = {
      ...this.settings,
      width,
      height
    }

    this.stage = new Konva.Stage({
      container: this.settings.container,
      width,
      height
    })

    // rename class name
    this.stage.content.className = 'pikaso'

    // set container position to center-center
    Object.assign(this.stage.content.style, {
      position: 'relative',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)'
    })

    this.stage.on('widthChange', this.rescale.bind(this))
    this.stage.on('heightChange', this.rescale.bind(this))

    // disable context menu
    this.settings.container.addEventListener('contextmenu', (e: MouseEvent) =>
      e.preventDefault()
    )

    this.layer = new Konva.Layer()
    this.stage.add(this.layer)

    this.background = new Background(this)
    this.selection = new Selection(this)

    this.container = this.settings.container
  }

  /**
   * Calculates the board dimensions based on different components
   *
   * @returns [[Dimension]]
   */
  public getDimensions() {
    return {
      width:
        this.background.image.node.width() ||
        this.background.overlay.node.width() ||
        this.stage.width() ||
        this.settings.width!,
      height:
        this.background.image.node.height() ||
        this.background.overlay.node.height() ||
        this.stage.height() ||
        this.settings.height!
    }
  }

  /**
   * Returns all nodes in the main layer including background nodes
   *
   * @returns array of [[Shape.node]]
   */
  public getNodes() {
    return [
      ...this.background.nodes,
      ...this.getShapes().map(shape => shape.node)
    ]
  }

  /**
   * Returns all created shapes
   *
   * @see [[ShapeModel]]
   */
  public getShapes() {
    return this.shapes.filter(shape => !shape.isDeleted)
  }

  /**
   * Add a new shape to the list of the shapes
   */
  public addShape(shape: ShapeModel) {
    this.shapes.push(shape)
  }

  /**
   * Updates list of the shapes
   */
  public setShapes(shapes: ShapeModel[]) {
    this.shapes = shapes
  }

  /**
   * Rescales the container based on its width and height
   */
  public rescale() {
    const transform = this.getContainerTransform()

    if (this.stage.content.style.transform === transform) {
      return
    }

    this.stage.content.style.transform = transform

    this.events.emit('board:rescale', {
      data: {
        transform
      }
    })
  }

  /**
   * Changes the active drawing mode
   */
  public setActiveDrawing(mode: DrawType | null) {
    if (mode) {
      this.selection.transformer.hide()
      this.draw()
    }

    if (mode !== this.activeDrawing) {
      this.events.emit('board:change-active-drawing', {
        data: {
          type: mode
        }
      })
    }

    this.activeDrawing = mode
  }

  /**
   * Calculates the CSS transformations of board based on stage width and height
   *
   * @returns transform style of the container
   */
  public getContainerTransform() {
    const size = this.getDimensions()

    let scale =
      this.container.clientWidth < this.container.clientHeight
        ? this.stage.width() / size.width
        : this.stage.height() / size.height

    if (scale * this.stage.width() > this.container.clientWidth) {
      scale = this.container.clientWidth / this.stage.width()
    }

    if (scale * this.stage.height() > this.container.clientHeight) {
      scale = this.container.clientHeight / this.stage.height()
    }

    return `translate(-50%, -50%) scale(${scale.toFixed(6)})`
  }

  /**
   * Redraws the main layer
   */
  public draw() {
    this.layer.batchDraw()
  }
}
