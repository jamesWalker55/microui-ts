import { HASH_INITIAL, hashString } from "./hash";
import { type NewType } from "./newtype";

function error(msg: string): never {
  throw new Error(msg);
}

type Vec2 = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export enum MouseButton {
  None = 0,
  Left = 1 << 0,
  Right = 1 << 1,
  Middle = 1 << 2,
}

export enum Key {
  None = 0,
  Shift = 1 << 0,
  Ctrl = 1 << 1,
  Alt = 1 << 2,
  Backspace = 1 << 3,
  Return = 1 << 4,
}

export enum Option {
  None = 0,
  AlignCenter = 1 << 0,
  AlignRight = 1 << 1,
  NoInteract = 1 << 2,
  NoFrame = 1 << 3,
  NoResize = 1 << 4,
  NoScroll = 1 << 5,
  NoClose = 1 << 6,
  NoTitle = 1 << 7,
  HoldFocus = 1 << 8,
  AutoSize = 1 << 9,
  Popup = 1 << 10,
  Closed = 1 << 11,
  Expanded = 1 << 12,
}

enum Position {
  Unset,
  Relative,
  Absolute,
}

export enum ColorId {
  Text,
  Border,
  WindowBG,
  TitleBG,
  TitleText,
  PanelBG,
  Button,
  ButtonHover,
  ButtonFocus,
  Base,
  BaseHover,
  BaseFocus,
  ScrollBase,
  ScrollThumb,
}

type Color = { r: number; g: number; b: number; a: number };

function rgba(r: number, g: number, b: number, a: number): Color {
  return { r, g, b, a };
}

export enum Response {
  Active = 1 << 0,
  Submit = 1 << 1,
  Change = 1 << 2,
}

declare const IdSymbol: unique symbol;
export type Id = NewType<number, typeof IdSymbol>;

type Font = any;

export type Style = {
  font: Font;
  size: Vec2;
  padding: number;
  spacing: number;
  indent: number;
  titleHeight: number;
  scrollbarSize: number;
  thumbSize: number;
  colors: Record<ColorId, Color>;
};

export const DEFAULT_STYLE: Style = {
  font: null,
  size: { x: 68, y: 10 },
  padding: 5,
  spacing: 4,
  indent: 24,
  titleHeight: 24,
  scrollbarSize: 12,
  thumbSize: 8,
  colors: {
    [ColorId.Text]: rgba(230, 230, 230, 255),
    [ColorId.Border]: rgba(25, 25, 25, 255),
    [ColorId.WindowBG]: rgba(50, 50, 50, 255),
    [ColorId.TitleBG]: rgba(25, 25, 25, 255),
    [ColorId.TitleText]: rgba(240, 240, 240, 255),
    [ColorId.PanelBG]: rgba(0, 0, 0, 0),
    [ColorId.Button]: rgba(75, 75, 75, 255),
    [ColorId.ButtonHover]: rgba(95, 95, 95, 255),
    [ColorId.ButtonFocus]: rgba(115, 115, 115, 255),
    [ColorId.Base]: rgba(30, 30, 30, 255),
    [ColorId.BaseHover]: rgba(35, 35, 35, 255),
    [ColorId.BaseFocus]: rgba(40, 40, 40, 255),
    [ColorId.ScrollBase]: rgba(43, 43, 43, 255),
    [ColorId.ScrollThumb]: rgba(30, 30, 30, 255),
  },
};

export type Container = {
  headIdx: number | null;
  tailIdx: number | null;
  rect: Rect;
  body: Rect;
  contentSize: Vec2;
  scroll: Vec2;
  zindex: number;
  open: boolean;
  root: boolean;
};

export type Layout = {
  body: Rect;
  next: Rect;
  position: Vec2;
  size: Vec2;
  max: Vec2;
  widths: number[];
  itemIndex: number;
  nextRow: number;
  nextType: Position;
  indent: number;
};

function Rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}

function rectOverlapsVec2(r: Rect, p: Vec2): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}

function intersectRects(r1: Rect, r2: Rect): Rect {
  const x1 = Math.max(r1.x, r2.x);
  const y1 = Math.max(r1.y, r2.y);
  let x2 = Math.min(r1.x + r1.w, r2.x + r2.w);
  let y2 = Math.min(r1.y + r1.h, r2.y + r2.h);
  if (x2 < x1) {
    x2 = x1;
  }
  if (y2 < y1) {
    y2 = y1;
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function expandRect(rect: Rect, n: number): Rect {
  return {
    x: rect.x - n,
    y: rect.y - n,
    w: rect.w + n * 2,
    h: rect.h + n * 2,
  };
}

const UNCLIPPED_RECT: Rect = { x: 0, y: 0, w: 0x1000000, h: 0x1000000 };

export enum Clip {
  None,
  Part,
  All,
}

export enum IconId {
  Close,
  Check,
  Collapsed,
  Expanded,
}

export enum CommandType {
  Jump,
  Clip,
  Rect,
  Text,
  Icon,
}

type JumpCommand = { type: CommandType.Jump; dstIdx: number | null };
type ClipCommand = { type: CommandType.Clip; rect: Rect };
type RectCommand = { type: CommandType.Rect; rect: Rect; color: Color };
type TextCommand = {
  type: CommandType.Text;
  font: Font;
  pos: Vec2;
  color: Color;
  str: string;
};
type IconCommand = {
  type: CommandType.Icon;
  rect: Rect;
  id: IconId;
  color: Color;
};

type Command =
  | JumpCommand
  | ClipCommand
  | RectCommand
  | TextCommand
  | IconCommand;

export type TextWidthFunc = (font: Font, str: string, len?: number) => number;
export type TextHeightFunc = (font: Font) => number;

const MU_MAX_FMT = 127;

export class Context {
  /* callbacks */
  private textWidth: TextWidthFunc;
  private textHeight: TextHeightFunc;
  /* core state */
  public style: Style;
  private hover: Id | null;
  private focus: Id | null;
  public lastId: Id | null;
  private lastRect: Rect | null;
  private lastZindex: number;
  private updatedFocus: boolean;
  // private frame: number;
  private hoverRoot: Container | null;
  private nextHoverRoot: Container | null; // set the hover root for the next frame
  private scrollTarget: Container | null;
  /* widget-specific states */
  private numberEditBuf: string;
  private numberEdit: Id | null;
  private treeNodes: Record<Id, true | undefined>;
  /* stacks */
  private commands: Command[];
  private roots: Container[];
  private containerStack: Container[];
  private clipStack: Rect[];
  private idStack: Id[];
  private layoutStack: Layout[];
  private containers: Record<Id, Container>;
  /* input state */
  private mousePos: Vec2;
  private lastMousePos: Vec2;
  private mouseDelta: Vec2;
  private scrollDelta: Vec2;
  private mouseDown: MouseButton;
  private mousePressed: MouseButton;
  private keyDown: Key;
  private keyPressed: Key;
  private _inputText: string;

  constructor(
    textWidth: TextWidthFunc,
    textHeight: TextHeightFunc,
    style: Style = structuredClone(DEFAULT_STYLE),
  ) {
    this.textWidth = textWidth;
    this.textHeight = textHeight;
    /* core state */
    this.style = style;
    this.hover = null;
    this.focus = null;
    this.lastId = null;
    this.lastRect = null;
    this.lastZindex = 0;
    this.updatedFocus = false;
    this.hoverRoot = null;
    this.nextHoverRoot = null;
    this.scrollTarget = null;
    /* widget-specific states */
    this.numberEditBuf = "";
    this.numberEdit = null;
    this.treeNodes = {};
    /* stacks */
    this.commands = [];
    this.roots = [];
    this.containerStack = [];
    this.clipStack = [];
    this.idStack = [];
    this.layoutStack = [];
    this.containers = {};
    /* input state */
    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.mouseDelta = { x: 0, y: 0 };
    this.scrollDelta = { x: 0, y: 0 };
    this.mouseDown = MouseButton.None;
    this.mousePressed = MouseButton.None;
    this.keyDown = Key.None;
    this.keyPressed = Key.None;
    this._inputText = "";
  }

  inputMouseMove(x: number, y: number) {
    this.mousePos.x = x;
    this.mousePos.y = y;
  }

  inputScroll(x: number, y: number) {
    this.scrollDelta.x += x;
    this.scrollDelta.y += y;
  }

  inputText(text: string) {
    this._inputText = text;
  }

  inputMouseDown(btn: MouseButton) {
    this.mouseDown |= btn;
    this.mousePressed |= btn;
  }

  inputMouseUp(btn: MouseButton) {
    this.mouseDown &= ~btn;
  }

  /** Update btn directly on every frame. Alternative to both `inputMouseDown` and `inputMouseUp` */
  inputMouseContinuous(btn: MouseButton) {
    this.mousePressed |= btn & ~this.mouseDown;
    this.mouseDown = btn;
  }

  inputKeyDown(key: Key) {
    this.keyDown |= key;
    this.keyPressed |= key;
  }

  inputKeyUp(key: Key) {
    this.keyDown &= ~key;
  }

  /** Update key directly on every frame. Alternative to both `inputKeyDown` and `inputKeyUp` */
  inputKeyContinuous(key: Key) {
    this.keyPressed |= key & ~this.keyDown;
    this.keyDown = key;
  }

  begin() {
    this.commands = [];
    this.roots = [];
    this.scrollTarget = null;
    this.hoverRoot = this.nextHoverRoot;
    this.nextHoverRoot = null;
    this.mouseDelta.x = this.mousePos.x - this.lastMousePos.x;
    this.mouseDelta.y = this.mousePos.y - this.lastMousePos.y;
  }

  /**
   * Get a consistent, unique ID using the name and the current ID stack
   */
  getId(name: string): Id {
    const initialId =
      this.idStack.length === 0
        ? (HASH_INITIAL as Id)
        : this.idStack[this.idStack.length - 1];

    const newId = hashString(initialId, name) as Id;
    this.lastId = newId;

    return newId;
  }

  pushId(name: string) {
    this.idStack.push(this.getId(name));
  }

  popId() {
    this.idStack.pop();
  }

  bringToFront(cnt: Container) {
    cnt.zindex = ++this.lastZindex;
  }

  getContainer(id: Id, opt: Option = Option.None): Container | null {
    // try to find existing container state
    if (id in this.containers) return this.containers[id];

    // if closed, return null
    if ((opt & Option.Closed) !== 0) return null;

    // container hasn't been created yet, we'll create it now
    const container: Container = {
      headIdx: null,
      tailIdx: null,
      rect: { x: 0, y: 0, w: 0, h: 0 },
      body: { x: 0, y: 0, w: 0, h: 0 },
      contentSize: { x: 0, y: 0 },
      scroll: { x: 0, y: 0 },
      zindex: 0,
      open: true,
      // should be set to true for containers created by begin_root_container only
      root: false,
    };
    this.bringToFront(container);

    this.containers[id] = container;

    return container;
  }

  getCurrentContainer() {
    if (this.containerStack.length === 0)
      error("attempted to get current container when there are no containers");
    return this.containerStack[this.containerStack.length - 1];
  }

  private inHoverRoot(): boolean {
    for (let i = this.containerStack.length - 1; i >= 0; i--) {
      const cnt = this.containerStack[i];

      if (cnt === this.hoverRoot) return true;

      if (cnt.root) break;
    }
    return false;
  }

  getClipRect(): Rect {
    if (this.clipStack.length === 0) error("clip stack is empty");
    return this.clipStack[this.clipStack.length - 1];
  }

  mouseOver(rect: Rect): boolean {
    return (
      rectOverlapsVec2(rect, this.mousePos) &&
      rectOverlapsVec2(this.getClipRect(), this.mousePos) &&
      this.inHoverRoot()
    );
  }

  setFocus(id: Id | null) {
    this.focus = id;
    this.updatedFocus = true;
  }

  updateControl(id: Id, rect: Rect, opt: Option) {
    if (this.focus === id) this.updatedFocus = true;
    if ((opt & Option.NoInteract) !== 0) return;

    const mouseover = this.mouseOver(rect);
    if (mouseover && this.mouseDown === 0) this.hover = id;

    // unset focus on certain conditions
    if (this.focus === id) {
      if (this.mousePressed !== 0 && !mouseover) this.setFocus(null);
      if (this.mouseDown === 0 && (opt & Option.HoldFocus) === 0)
        this.setFocus(null);
    }

    if (this.hover === id) {
      if (this.mousePressed !== 0) {
        this.setFocus(id);
      } else if (!mouseover) {
        this.hover = null;
      }
    }
  }

  private pushJump(dstIdx: number | null, oob: boolean = false): number {
    if (!oob) {
      if (dstIdx === null || !(0 <= dstIdx && dstIdx < this.commands.length))
        error("attempted to push jump command to out-of-bounds");
    }

    const cmd: JumpCommand = { type: CommandType.Jump, dstIdx };
    this.commands.push(cmd);
    // return index of the newly-pushed command
    return this.commands.length - 1;
  }

  private beginRootContainer(cnt: Container) {
    this.containerStack.push(cnt);
    /* push container to roots list and push head command */
    this.roots.push(cnt);
    cnt.headIdx = this.pushJump(null, true);
    /* set as hover root if the mouse is overlapping this container and it has a
     ** higher zindex than the current hover root */
    if (
      rectOverlapsVec2(cnt.rect, this.mousePos) &&
      (!this.nextHoverRoot || cnt.zindex > this.nextHoverRoot.zindex)
    ) {
      this.nextHoverRoot = cnt;
    }
    /* clipping is reset here in case a root-container is made within
     ** another root-containers's begin/end block; this prevents the inner
     ** root-container being clipped to the outer */
    this.clipStack.push(UNCLIPPED_RECT);
  }

  drawRect(rect: Rect, color: Color) {
    rect = intersectRects(rect, this.getClipRect());

    if (rect.w > 0 && rect.h > 0) {
      const cmd: RectCommand = { type: CommandType.Rect, rect, color };
      this.commands.push(cmd);
    }
  }

  drawBox(r: Rect, color: Color) {
    this.drawRect({ x: r.x + 1, y: r.y, w: r.w - 2, h: 1 }, color);
    this.drawRect({ x: r.x + 1, y: r.y + r.h - 1, w: r.w - 2, h: 1 }, color);
    this.drawRect({ x: r.x, y: r.y, w: 1, h: r.h }, color);
    this.drawRect({ x: r.x + r.w - 1, y: r.y, w: 1, h: r.h }, color);
  }

  drawFrame(rect: Rect, colorId: ColorId) {
    const color = this.style.colors[colorId];
    this.drawRect(rect, color);

    if (
      colorId === ColorId.ScrollBase ||
      colorId === ColorId.ScrollThumb ||
      colorId === ColorId.TitleBG
    )
      return;

    // draw border
    if (this.style.colors[ColorId.Border].a > 0) {
      this.drawBox(expandRect(rect, 1), this.style.colors[ColorId.Border]);
    }
  }

  pushClipRect(rect: Rect) {
    const last = this.getClipRect();
    this.clipStack.push(intersectRects(rect, last));
  }

  popClipRect() {
    this.clipStack.pop();
  }

  checkClip(r: Rect): Clip {
    const cr = this.getClipRect();
    if (
      r.x > cr.x + cr.w ||
      r.x + r.w < cr.x ||
      r.y > cr.y + cr.h ||
      r.y + r.h < cr.y
    ) {
      return Clip.All;
    }
    if (
      r.x >= cr.x &&
      r.x + r.w <= cr.x + cr.w &&
      r.y >= cr.y &&
      r.y + r.h <= cr.y + cr.h
    ) {
      return Clip.None;
    }
    return Clip.Part;
  }

  setClip(rect: Rect) {
    // mu_Command *cmd;
    const cmd: ClipCommand = { type: CommandType.Clip, rect };
    this.commands.push(cmd);
  }

  drawText(
    font: Font,
    str: string,
    len: number | null,
    pos: Vec2,
    color: Color,
  ) {
    // mu_Command *cmd;
    const rect: Rect = {
      x: pos.x,
      y: pos.y,
      w: this.textWidth(font, str, len === null ? undefined : len),
      h: this.textHeight(font),
    };
    const clipped: Clip = this.checkClip(rect);
    if (clipped === Clip.All) return;

    if (clipped === Clip.Part) this.setClip(this.getClipRect());

    /* add command */
    if (len === null) {
      len = str.length;
    }
    const cmd: TextCommand = { type: CommandType.Text, color, font, pos, str };
    this.commands.push(cmd);
    /* reset clipping if it was set */
    if (clipped !== Clip.None) {
      this.setClip(UNCLIPPED_RECT);
    }
  }

  drawControlFrame(id: Id, rect: Rect, colorid: ColorId, opt: Option) {
    if ((opt & Option.NoFrame) !== 0) return;

    colorid += this.focus === id ? 2 : this.hover === id ? 1 : 0;
    this.drawFrame(rect, colorid);
  }

  drawControlText(str: string, rect: Rect, colorid: ColorId, opt: Option) {
    const pos: Vec2 = { x: 0, y: 0 };
    const font: Font = this.style.font;
    const tw = this.textWidth(font, str);
    this.pushClipRect(rect);
    pos.y = rect.y + (rect.h - this.textHeight(font)) / 2;
    if ((opt & Option.AlignCenter) !== 0) {
      pos.x = rect.x + (rect.w - tw) / 2;
    } else if ((opt & Option.AlignRight) !== 0) {
      pos.x = rect.x + rect.w - tw - this.style.padding;
    } else {
      pos.x = rect.x + this.style.padding;
    }
    this.drawText(font, str, -1, pos, this.style.colors[colorid]);
    this.popClipRect();
  }

  drawIcon(id: IconId, rect: Rect, color: Color) {
    /* do clip command if the rect isn't fully contained within the cliprect */
    const clipped = this.checkClip(rect);
    if (clipped === Clip.All) return;

    if (clipped === Clip.Part) {
      this.setClip(this.getClipRect());
    }
    /* do icon command */
    const cmd: IconCommand = { type: CommandType.Icon, color, rect, id };
    this.commands.push(cmd);
    /* reset clipping if it was set */
    if (clipped !== Clip.None) {
      this.setClip(UNCLIPPED_RECT);
    }
  }

  private scrollbar(
    cnt: Container,
    viewBounds: Rect,
    contentSize: Vec2,
    otherDir: "x" | "y",
    scrollDir: "x" | "y",
    otherLength: "w" | "h",
    scrollLength: "w" | "h",
  ) {
    /* only add scrollbar if content size is larger than body */
    const maxscroll = contentSize[scrollDir] - viewBounds[scrollLength];

    if (maxscroll > 0 && viewBounds[scrollLength] > 0) {
      const id = this.getId(`!scrollbar${scrollDir}`);

      /* get sizing / positioning */
      const base = structuredClone(viewBounds);
      base[otherDir] = viewBounds[otherDir] + viewBounds[otherLength];
      base[otherLength] = this.style.scrollbarSize;

      /* handle input */
      this.updateControl(id, base, 0);
      if (this.focus === id && this.mouseDown === MouseButton.Left) {
        cnt.scroll[scrollDir] +=
          (this.mouseDelta[scrollDir] * contentSize[scrollDir]) /
          base[scrollLength];
      }
      /* clamp scroll to limits */
      cnt.scroll[scrollDir] = clamp(cnt.scroll[scrollDir], 0, maxscroll);

      /* draw base and thumb */
      this.drawFrame(base, ColorId.ScrollBase);
      const thumb = structuredClone(base);
      thumb[scrollLength] = Math.max(
        this.style.thumbSize,
        (base[scrollLength] * viewBounds[scrollLength]) /
          contentSize[scrollDir],
      );
      thumb[scrollDir] +=
        (cnt.scroll[scrollDir] * (base[scrollLength] - thumb[scrollLength])) /
        maxscroll;
      this.drawFrame(thumb, ColorId.ScrollThumb);

      /* set this as the scrollTarget (will get scrolled on mousewheel) */
      /* if the mouse is over it */
      if (this.mouseOver(viewBounds)) {
        this.scrollTarget = cnt;
      }
    } else {
      cnt.scroll[scrollDir] = 0;
    }
  }

  private scrollbars(cnt: Container, body: Rect) {
    const sz = this.style.scrollbarSize;
    const cs = structuredClone(cnt.contentSize);
    cs.x += this.style.padding * 2;
    cs.y += this.style.padding * 2;
    this.pushClipRect(body);
    /* resize body to make room for scrollbars */
    if (cs.y > cnt.body.h) {
      body.w -= sz;
    }
    if (cs.x > cnt.body.w) {
      body.h -= sz;
    }
    /* to create a horizontal or vertical scrollbar almost-identical code is
     ** used; only the references to `x|y` `w|h` need to be switched */
    this.scrollbar(cnt, body, cs, "x", "y", "w", "h");
    this.scrollbar(cnt, body, cs, "y", "x", "h", "w");
    this.popClipRect();
  }

  private getLayout() {
    const count = this.layoutStack.length;
    if (count === 0) error("layout stack is empty");

    return this.layoutStack[count - 1];
  }

  layoutRow(widths: number[] | null, height: number) {
    const layout = this.getLayout();
    if (widths !== null) {
      if (widths.length === 0)
        error("list of widths must contain at least 1 number");
      layout.widths = [...widths];
    } else {
      // do nothing, reuse existing widths
    }
    layout.position = { x: layout.indent, y: layout.nextRow };
    layout.size.y = height;
    layout.itemIndex = 0;
  }

  private pushLayout(body: Rect, scroll: Vec2) {
    const layout: Layout = {
      body: {
        x: body.x - scroll.x,
        y: body.y - scroll.y,
        w: body.w,
        h: body.h,
      },
      next: { x: 0, y: 0, w: 0, h: 0 },
      position: { x: 0, y: 0 },
      size: { x: 0, y: 0 },
      max: { x: -0x1000000, y: -0x1000000 },
      widths: [],
      itemIndex: 0,
      nextRow: 0,
      nextType: Position.Unset,
      indent: 0,
    };
    this.layoutStack.push(layout);
    this.layoutRow([0], 0);
  }

  layoutNext() {
    const layout = this.getLayout();
    let res: Rect = { x: 0, y: 0, w: 0, h: 0 };

    if (layout.nextType !== Position.Unset) {
      // handle rect set by `mu_layout_set_next`
      const type = layout.nextType;
      layout.nextType = Position.Unset;
      res = layout.next;
      if (type === Position.Absolute) {
        this.lastRect = { ...res };
        return res;
      }
    } else {
      /* handle next row */
      if (layout.itemIndex === layout.widths.length) {
        this.layoutRow(null, layout.size.y);
      }

      /* position */
      res.x = layout.position.x;
      res.y = layout.position.y;

      /* size */
      res.w =
        layout.widths.length > 0
          ? layout.widths[layout.itemIndex]
          : layout.size.x;
      res.h = layout.size.y;

      if (res.w === 0) {
        res.w = this.style.size.x + this.style.padding * 2;
      }
      if (res.h === 0) {
        res.h = this.style.size.y + this.style.padding * 2;
      }
      if (res.w < 0) {
        res.w += layout.body.w - res.x + 1;
      }
      if (res.h < 0) {
        res.h += layout.body.h - res.y + 1;
      }

      layout.itemIndex++;
    }

    // update position
    layout.position.x += res.w + this.style.spacing;
    layout.nextRow = Math.max(
      layout.nextRow,
      res.y + res.h + this.style.spacing,
    );

    // apply body offset
    res.x += layout.body.x;
    res.y += layout.body.y;

    // update max position
    layout.max.x = Math.max(layout.max.x, res.x + res.w);
    layout.max.y = Math.max(layout.max.y, res.y + res.h);

    this.lastRect = { ...res };
    return res;
  }

  private pushContainerBody(cnt: Container, body: Rect, opt: Option) {
    if ((opt & Option.NoScroll) === 0) {
      this.scrollbars(cnt, body);
    }
    this.pushLayout(expandRect(body, -this.style.padding), cnt.scroll);
    cnt.body = body;
  }

  beginWindow(
    title: string,
    rect: Rect,
    opt: Option = Option.None,
  ): Response | false {
    const id = this.getId(title);
    const cnt = this.getContainer(id, opt);
    if (!cnt || !cnt.open) return false;

    this.idStack.push(id);

    if (cnt.rect.w === 0) {
      // if container is newly initialised (rect will be all 0),
      // set its size to rect
      cnt.rect = rect;
    } else {
      // otherwise, use existing rect
      rect = cnt.rect;
    }
    const body = structuredClone(rect);

    this.beginRootContainer(cnt);

    // do frame
    if ((opt & Option.NoFrame) === 0) {
      this.drawFrame(rect, ColorId.WindowBG);
    }

    // do title bar
    if ((opt & Option.NoTitle) === 0) {
      const tr: Rect = { ...rect, h: this.style.titleHeight };
      this.drawFrame(tr, ColorId.TitleBG);

      // do title text
      const id = this.getId("!title");
      this.updateControl(id, tr, opt);
      this.drawControlText(title, tr, ColorId.TitleText, opt);
      if (this.focus === id && this.mouseDown === MouseButton.Left) {
        cnt.rect.x += this.mouseDelta.x;
        cnt.rect.y += this.mouseDelta.y;
      }
      body.y += tr.h;
      body.h -= tr.h;

      // do close button
      if ((opt & Option.NoClose) === 0) {
        const id = this.getId("!close");
        const r: Rect = { x: tr.x + tr.w - tr.h, y: tr.y, w: tr.h, h: tr.h };
        tr.w -= r.w;

        this.drawIcon(IconId.Close, r, this.style.colors[ColorId.TitleText]);
        this.updateControl(id, r, opt);
        if (this.focus === id && this.mouseDown === MouseButton.Left) {
          cnt.open = false;
        }
      }
    }

    this.pushContainerBody(cnt, body, opt);

    // do resize handle
    if ((opt & Option.NoResize) === 0) {
      const sz = this.style.titleHeight;
      const id = this.getId("!resize");
      const r: Rect = {
        x: rect.x + rect.w - sz,
        y: rect.y + rect.h - sz,
        w: sz,
        h: sz,
      };
      this.updateControl(id, r, opt);
      if (this.focus === id && this.mouseDown === MouseButton.Left) {
        cnt.rect.w = Math.max(96, cnt.rect.w + this.mouseDelta.x);
        cnt.rect.h = Math.max(64, cnt.rect.h + this.mouseDelta.y);
      }
    }

    // resize to content size
    if ((opt & Option.AutoSize) !== 0) {
      const r: Rect = this.getLayout().body;
      cnt.rect.w = cnt.contentSize.x + (cnt.rect.w - r.w);
      cnt.rect.h = cnt.contentSize.y + (cnt.rect.h - r.h);
    }

    // close if this is a popup window and elsewhere was clicked
    if (
      (opt & Option.Popup) !== 0 &&
      this.mousePressed !== 0 &&
      this.hoverRoot !== cnt
    ) {
      cnt.open = false;
    }

    this.pushClipRect(cnt.body);
    return Response.Active;
  }

  private popContainer() {
    const cnt = this.getCurrentContainer();
    const layout = this.getLayout();
    cnt.contentSize.x = layout.max.x - layout.body.x;
    cnt.contentSize.y = layout.max.y - layout.body.y;
    this.containerStack.pop();
    this.layoutStack.pop();
    this.idStack.pop();
  }

  private endRootContainer() {
    /* push tail 'goto' jump command and set head 'skip' command. the final steps
     ** on initing these are done in mu_end() */
    const cnt = this.getCurrentContainer();
    cnt.tailIdx = this.pushJump(null, true);

    if (cnt.headIdx === null)
      error("container headIdx is null when ending root container");
    const head = this.commands[cnt.headIdx];
    if (head.type !== CommandType.Jump)
      error("container headIdx doesn't point to Jump command");
    head.dstIdx = this.commands.length;

    /* pop base clip rect and container */
    this.popClipRect();
    this.popContainer();
  }

  endWindow() {
    this.popClipRect();
    this.endRootContainer();
  }

  end() {
    // check stacks
    if (this.containerStack.length !== 0)
      error("container stack should be empty");
    if (this.clipStack.length !== 0) error("clip stack should be empty");
    if (this.idStack.length !== 0) error("id stack should be empty");
    if (this.layoutStack.length !== 0) error("layout stack should be empty");

    // handle scroll input
    if (this.scrollTarget !== null) {
      this.scrollTarget.scroll.x += this.scrollDelta.x;
      this.scrollTarget.scroll.y += this.scrollDelta.y;
    }

    // unset focus if focus id was not touched this frame
    if (!this.updatedFocus) this.focus = null;
    this.updatedFocus = false;

    // bring hover root to front if mouse was pressed
    if (
      this.mousePressed !== 0 &&
      this.nextHoverRoot !== null &&
      this.nextHoverRoot.zindex < this.lastZindex &&
      this.nextHoverRoot.zindex >= 0
    ) {
      this.bringToFront(this.nextHoverRoot);
    }

    // reset input state
    this.keyPressed = Key.None;
    this._inputText = "";
    this.mousePressed = MouseButton.None;
    this.scrollDelta = { x: 0, y: 0 };
    this.lastMousePos.x = this.mousePos.x;
    this.lastMousePos.y = this.mousePos.y;

    // sort root containers by zindex
    this.roots.sort((a, b) => a.zindex - b.zindex);

    // set root container jump commands
    for (let i = 0; i < this.roots.length; i++) {
      const cnt = this.roots[i];
      // if this is the first container then make the first command jump to it.
      // ** otherwise set the previous container's tail to jump to this one
      if (i === 0) {
        const cmd = this.commands[0];
        if (cmd.type !== CommandType.Jump)
          error("first command in list should be jump");
        if (cnt.headIdx === null) error("headIdx of container is not set");

        cmd.dstIdx = cnt.headIdx + 1;
      } else {
        const prev = this.roots[i - 1];
        if (prev.tailIdx === null) error("tailIdx of container is not set");

        const cmd = this.commands[prev.tailIdx];
        if (cmd.type !== CommandType.Jump)
          error("first command in list should be jump");

        if (cnt.headIdx === null) error("headIdx of container is not set");

        cmd.dstIdx = cnt.headIdx + 1;
      }
      // make the last container's tail jump to the end of command list
      if (i === this.roots.length - 1) {
        if (cnt.tailIdx === null) error("tailIdx of container is not set");

        const cmd = this.commands[cnt.tailIdx];
        if (cmd.type !== CommandType.Jump)
          error("first command in list should be jump");

        cmd.dstIdx = this.commands.length;
      }
    }
  }

  *iterCommands() {
    let i = 0;
    while (true) {
      if (i >= this.commands.length) break;

      const cmd = this.commands[i];
      if (cmd.type === CommandType.Jump) {
        if (cmd.dstIdx === null)
          error("attempt to perform Jump command with null destination");
        i = cmd.dstIdx;
        continue;
      }

      yield cmd;

      i += 1;
    }
  }

  header(label: string, opt: Option = Option.None): Response | false {
    return this._header(label, opt, false);
  }

  private _header(
    label: string,
    opt: Option = Option.None,
    istreenode: boolean = false,
  ): Response | false {
    // mu_Rect r;
    // int active, expanded;
    const id = this.getId(label);
    this.layoutRow([-1], 0);

    let active = this.treeNodes[id] === true;
    const expanded = (opt & Option.Expanded) !== 0 ? !active : active;
    const r = this.layoutNext();
    this.updateControl(id, r, Option.None);

    // handle click
    if (this.mousePressed === MouseButton.Left && this.focus === id) {
      active = !active;
    }

    // update pool ref
    if (active) {
      this.treeNodes[id] = true;
    } else {
      delete this.treeNodes[id];
    }

    // draw
    if (istreenode) {
      if (this.hover === id) {
        this.drawFrame(r, ColorId.ButtonHover);
      }
    } else {
      this.drawControlFrame(id, r, ColorId.Button, 0);
    }

    this.drawIcon(
      expanded ? IconId.Expanded : IconId.Collapsed,
      Rect(r.x, r.y, r.h, r.h),
      this.style.colors[ColorId.Text],
    );
    r.x += r.h - this.style.padding;
    r.w -= r.h - this.style.padding;
    this.drawControlText(label, r, ColorId.Text, 0);

    return expanded ? Response.Active : false;
  }

  label(text: string) {
    this.drawControlText(text, this.layoutNext(), ColorId.Text, 0);
  }

  button(label: string | IconId, opt: Option = Option.None): Response | false {
    let res: Response | 0 = 0;
    const id =
      typeof label === "string"
        ? this.getId(label)
        : this.getId(`icon${label.toString()}`);
    const r = this.layoutNext();
    this.updateControl(id, r, opt);

    // handle click
    if (this.mousePressed === MouseButton.Left && this.focus === id) {
      res |= Response.Submit;
    }

    // draw
    this.drawControlFrame(id, r, ColorId.Button, opt);
    if (typeof label === "string") {
      this.drawControlText(label, r, ColorId.Text, opt);
    } else {
      this.drawIcon(label, r, this.style.colors[ColorId.Text]);
    }

    return res === 0 ? false : res;
  }

  openPopup(name: string) {
    const id = this.getId(name);
    const cnt = this.getContainer(id);
    if (cnt === null) error("openPopup: container is null");

    // set as hover root so popup isn't closed in begin_window_ex()
    this.hoverRoot = this.nextHoverRoot = cnt;
    // position at mouse cursor, open and bring-to-front
    cnt.rect = Rect(this.mousePos.x, this.mousePos.y, 1, 1);
    cnt.open = true;
    this.bringToFront(cnt);
  }

  beginPopup(
    name: string,
    rect: Rect = { x: 0, y: 0, w: 0, h: 0 },
    opt: Option = Option.Popup |
      Option.AutoSize |
      Option.NoResize |
      Option.NoScroll |
      Option.NoTitle |
      Option.Closed,
  ) {
    return this.beginWindow(name, rect, opt);
  }

  endPopup() {
    this.endWindow();
  }

  layoutBeginColumn() {
    this.pushLayout(this.layoutNext(), { x: 0, y: 0 });
  }

  layoutEndColumn() {
    const b = this.getLayout();
    this.layoutStack.pop();
    /* inherit position/nextRow/max from child layout if they are greater */
    const a = this.getLayout();
    a.position.x = Math.max(a.position.x, b.position.x + b.body.x - a.body.x);
    a.nextRow = Math.max(a.nextRow, b.nextRow + b.body.y - a.body.y);
    a.max.x = Math.max(a.max.x, b.max.x);
    a.max.y = Math.max(a.max.y, b.max.y);
  }

  textboxRaw(
    buf: string,
    maxBufSize: number | null,
    id: Id,
    r: Rect,
    opt: Option,
  ): [Response | false, string] {
    let res: false | Response = false;
    this.updateControl(id, r, opt | Option.HoldFocus);

    if (this.focus === id) {
      // handle text input
      if (maxBufSize === null) {
        const newCharCount = this._inputText.length;
        if (newCharCount > 0) {
          buf = buf + this._inputText;
          res = Response.Change;
        }
      } else {
        const freeSpace = maxBufSize - buf.length;
        const newCharCount = this._inputText.length;
        if (freeSpace > 0 && newCharCount > 0) {
          buf = buf + this._inputText.slice(0, freeSpace);
          res = Response.Change;
        }
      }
      // handle backspace
      if ((this.keyPressed & Key.Backspace) !== 0 && buf.length > 0) {
        // skip utf-8 continuation bytes
        buf = buf.slice(0, buf.length - 1);
        res = Response.Change;
      }
      // handle return
      if ((this.keyPressed & Key.Return) !== 0) {
        this.setFocus(null);
        res = Response.Submit;
      }
    }

    // draw
    this.drawControlFrame(id, r, ColorId.Base, opt);
    if (this.focus === id) {
      const color = this.style.colors[ColorId.Text];
      const font = this.style.font;
      const textw = this.textWidth(font, buf);
      const texth = this.textHeight(font);
      const ofx = r.w - this.style.padding - textw - 1;
      const textx = r.x + Math.min(ofx, this.style.padding);
      const texty = r.y + (r.h - texth) / 2;
      this.pushClipRect(r);
      this.drawText(font, buf, null, { x: textx, y: texty }, color);
      this.drawRect(Rect(textx + textw, texty, 1, texth), color);
      this.popClipRect();
    } else {
      this.drawControlText(buf, r, ColorId.Text, opt);
    }

    return [res, buf];
  }

  // response indicates whether textbox is being edited right now
  private numberTextbox(
    value: number,
    r: Rect,
    id: Id,
  ): [false | Response, number] {
    // if shift-press the textbox
    if (
      this.mousePressed === MouseButton.Left &&
      (this.keyDown & Key.Shift) !== 0 &&
      this.hover === id
    ) {
      this.numberEdit = id;
      this.numberEditBuf = value.toPrecision(3);
    }
    if (this.numberEdit === id) {
      const [res, newVal] = this.textboxRaw(
        this.numberEditBuf,
        MU_MAX_FMT,
        id,
        r,
        0,
      );
      if (res) this.numberEditBuf = newVal;

      if ((res && (res & Response.Submit) !== 0) || this.focus !== id) {
        // if press enter / focus on something else,
        // commit the change
        value = parseFloat(this.numberEditBuf);
        this.numberEdit = null;
      } else {
        // otherwise keep editing
        return [Response.Active, value];
      }
    }
    return [false, value];
  }

  slider(
    identifier: string,
    value: number,
    low: number,
    high: number,
    step: number | null = null,
    precision: number = 2,
    opt: Option = Option.AlignCenter,
  ): number {
    // int x, w, res = 0;
    let res: false | Response = false;
    const last = value;

    const id = this.getId(identifier);
    const base = this.layoutNext();

    // handle text input mode
    const [textboxRes, newVal] = this.numberTextbox(value, base, id);
    if (textboxRes) {
      // textbox is being edited right now
      return newVal;
    }

    // handle normal mode
    this.updateControl(id, base, opt);

    // handle input
    if (
      this.focus === id &&
      (this.mouseDown | this.mousePressed) === MouseButton.Left
    ) {
      value = low + ((this.mousePos.x - base.x) * (high - low)) / base.w;
      if (step !== null && step !== 0) {
        value = ((value + step / 2) / step) * step;
      }
    }
    // clamp and store value, update res
    value = clamp(value, low, high);
    if (last !== value) {
      res = Response.Change;
    }

    // draw base
    this.drawControlFrame(id, base, ColorId.Base, opt);

    // draw thumb
    const w = this.style.thumbSize;
    const x = ((value - low) * (base.w - w)) / (high - low);
    const thumb = Rect(base.x + x, base.y, w, base.h);
    this.drawControlFrame(id, thumb, ColorId.Button, opt);

    // draw text
    const buf = value.toFixed(precision);
    this.drawControlText(buf, base, ColorId.Text, opt);

    return value;
  }

  beginTreenode(label: string, opt: Option = Option.None) {
    const res = this._header(label, opt, true);
    if (res && (res & Response.Active) !== 0) {
      this.getLayout().indent += this.style.indent;
      if (this.lastId === null) error("last id is not set");
      this.idStack.push(this.lastId);
    }
    return res;
  }

  endTreenode() {
    this.getLayout().indent -= this.style.indent;
    this.idStack.pop();
  }

  checkbox(label: string, state: boolean): boolean {
    let res: false | Response = false;
    const id = this.getId(label);
    const r = this.layoutNext();
    const box = Rect(r.x, r.y, r.h, r.h);
    this.updateControl(id, r, 0);
    /* handle click */
    if (this.mousePressed === MouseButton.Left && this.focus === id) {
      res = Response.Change;
      state = !state;
    }
    /* draw */
    this.drawControlFrame(id, box, ColorId.Base, 0);
    if (state) {
      this.drawIcon(IconId.Check, box, this.style.colors[ColorId.Text]);
    }
    const r2 = Rect(r.x + box.w, r.y, r.w - box.w, r.h);
    this.drawControlText(label, r2, ColorId.Text, 0);
    return state;
  }

  text(text: string) {
    const spaceWidth = this.textWidth(this.style.font, " ");

    const font: Font = this.style.font;
    const color: Color = this.style.colors[ColorId.Text];
    this.layoutBeginColumn();
    this.layoutRow([-1], this.textHeight(font));

    let start = 0;
    let end = 0;
    let p = 0;

    while (true) {
      const r: Rect = this.layoutNext();
      let currentLineWidth = 0;
      start = end = p;
      while (true) {
        const wordStart = p;
        // move `p` to either one of: (' ', '\n', EOF)
        let pChar;
        while (true) {
          pChar = text.charAt(p);
          if (pChar.length === 0 || pChar === " " || pChar === "\n") break;
          p++;
        }
        // add current word to width
        currentLineWidth += this.textWidth(font, text.slice(wordStart, p));
        // if current line is too long for width (and line isn't empty)
        // move on to next line
        if (currentLineWidth > r.w && end !== start) {
          break;
        }
        // add space width if `p` lands on whitespace
        if (pChar === " ") currentLineWidth += spaceWidth;
        end = p++;

        const endChar = text.charAt(end);
        if (endChar.length === 0 || endChar === "\n") break;
      }
      this.drawText(
        font,
        text.slice(start, end),
        null,
        { x: r.x, y: r.y },
        color,
      );
      p = end + 1;

      if (end >= text.length) break;
    }
    this.layoutEndColumn();
  }

  textbox(identifier: string, buf: string, opt: Option = Option.None) {
    const id = this.getId(identifier);
    const r = this.layoutNext();
    return this.textboxRaw(buf, null, id, r, opt);
  }

  beginPanel(name: string, opt: Option = Option.None) {
    const id = this.getId(name);
    this.idStack.push(id);
    if (this.lastId === null)
      error("attempted to begin panel with no parent container");
    const cnt = this.getContainer(this.lastId, opt);
    if (cnt === null) error("panel must never be closed!");

    cnt.rect = this.layoutNext();
    if ((opt & Option.NoFrame) !== 0) {
      this.drawFrame(cnt.rect, ColorId.PanelBG);
    }
    this.containerStack.push(cnt);
    this.pushContainerBody(cnt, cnt.rect, opt);
    this.pushClipRect(cnt.body);
  }

  endPanel() {
    this.popClipRect();
    this.popContainer();
  }
}
