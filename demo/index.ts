import * as log from "./log";
import { DrawStrFlags, MouseCap } from "./reaperEnums";
import {
  ColorId,
  CommandType,
  Context,
  IconId,
  Key,
  MouseButton,
  Option,
  Response,
} from "./ui";

class ThemeParameter {
  constructor(
    public readonly idx: number,
    public readonly name: string,
    public readonly desc: string,
    public readonly initialValue: number,
    private currentValue: number,
    public readonly defaultValue: number,
    public readonly minValue: number,
    public readonly maxValue: number,
  ) {}

  static get(i: number) {
    const [name, desc, initialValue, defaultValue, minValue, maxValue] =
      reaper.ThemeLayout_GetParameter(i);
    if (name === null) return null;

    return new ThemeParameter(
      i,
      name,
      desc,
      initialValue,
      initialValue,
      defaultValue,
      minValue,
      maxValue,
    );
  }

  static getAll() {
    const params: ThemeParameter[] = [];

    let i = 0;
    while (true) {
      const param = ThemeParameter.get(i);
      if (param === null) return params;

      params.push(param);
      i += 1;
    }
  }

  /** This sets the parameter temporarily. Changes will be lost upon reload. */
  set value(x: number) {
    this.currentValue = x;
    reaper.ThemeLayout_SetParameter(this.idx, x, false);
  }

  /** Save the settings. Changes will persist upon reload. */
  save() {
    // TODO: Update this.initialValue
    reaper.ThemeLayout_SetParameter(this.idx, this.currentValue, true);
  }

  get value() {
    return this.currentValue;
  }
}

function deferLoop(func: (stop: () => void) => void) {
  let shouldStop = false;
  function stop() {
    shouldStop = true;
  }

  function inner(this: void) {
    func(stop);

    if (shouldStop) return;

    reaper.defer(inner);
  }
  inner();
}

function main() {
  gfx.init("Test window", 500, 500);
  gfx.setfont(1, "Arial", 12);

  const ctx = new Context(
    (font, str, len) => {
      if (len !== undefined) {
        str = str.slice(0, len);
      }
      const [width, _] = gfx.measurestr(str);
      return width;
    },
    (font) => {
      return gfx.texth;
    },
  );

  const bgColor = [90, 95, 100];
  const checks = [true, false, true];

  let logWindowTextboxInput = "";
  let logWindowLogUpdated = false;
  let logWindowLog = "";

  function writeLog(text: string) {
    if (logWindowLog.length > 0) {
      logWindowLog += `\n${text}`;
    } else {
      logWindowLog = text;
    }
    logWindowLogUpdated = true;
  }

  function logWindow(ctx: Context) {
    if (ctx.beginWindow("Log Window", { x: 350, y: 40, w: 300, h: 200 })) {
      /* output text panel */
      ctx.layoutRow([-1], -25);
      ctx.beginPanel("Log Output");
      const panel = ctx.getCurrentContainer();
      ctx.layoutRow([-1], -1);
      ctx.text(logWindowLog);
      ctx.endPanel();
      if (logWindowLogUpdated) {
        panel.scroll.y = panel.contentSize.y;
        logWindowLogUpdated = false;
      }

      /* input textbox + submit button */
      let submitted = false;
      ctx.layoutRow([-70, -1], 0);
      const [res, newVal] = ctx.textbox("textbox", logWindowTextboxInput);
      logWindowTextboxInput = newVal;
      if (res && (res & Response.Submit) !== 0) {
        ctx.setFocus(ctx.lastId);
        submitted = true;
      }
      if (ctx.button("Submit")) {
        submitted = true;
      }
      if (submitted) {
        writeLog(logWindowTextboxInput);
        logWindowTextboxInput = "";
      }

      ctx.endWindow();
    }
  }

  function testWindow(ctx: Context) {
    if (ctx.beginWindow("Demo Window", { x: 40, y: 40, w: 300, h: 450 })) {
      const win = ctx.getCurrentContainer();
      win.rect.w = Math.max(win.rect.w, 240);
      win.rect.h = Math.max(win.rect.h, 240);

      if (ctx.header("Window Info")) {
        const win = ctx.getCurrentContainer();
        ctx.layoutRow([54, -1], 0);

        ctx.label("Position:");
        ctx.label(`${win.rect.x}, ${win.rect.y}`);

        ctx.label("Size:");
        ctx.label(`${win.rect.w}, ${win.rect.h}`);
      }

      if (ctx.header("Test Buttons", Option.Expanded)) {
        ctx.layoutRow([86, -110, -1], 0);
        ctx.label("Test buttons 1:");
        if (ctx.button("Button 1")) {
          writeLog("Pressed button 1");
        }
        if (ctx.button("Button 2")) {
          writeLog("Pressed button 2");
        }
        ctx.label("Test buttons 2:");
        if (ctx.button("Button 3")) {
          writeLog("Pressed button 3");
        }
        if (ctx.button("Popup")) {
          ctx.openPopup("Test Popup");
        }
        if (ctx.beginPopup("Test Popup")) {
          ctx.button("Hello");
          ctx.button("World");
          ctx.endPopup();
        }
      }

      if (ctx.header("Tree and Text", Option.Expanded)) {
        ctx.layoutRow([140, -1], 0);
        ctx.layoutBeginColumn();
        if (ctx.beginTreenode("Test 1")) {
          if (ctx.beginTreenode("Test 1a")) {
            ctx.label("Hello");
            ctx.label("world");
            ctx.endTreenode();
          }
          if (ctx.beginTreenode("Test 1b")) {
            if (ctx.button("Button 1")) writeLog("Pressed button 1");
            if (ctx.button("Button 2")) writeLog("Pressed button 2");
            ctx.endTreenode();
          }
          ctx.endTreenode();
        }
        if (ctx.beginTreenode("Test 2")) {
          ctx.layoutRow([54, 54], 0);
          if (ctx.button("Button 3")) writeLog("Pressed button 3");
          if (ctx.button("Button 4")) writeLog("Pressed button 4");
          if (ctx.button("Button 5")) writeLog("Pressed button 5");
          if (ctx.button("Button 6")) writeLog("Pressed button 6");
          ctx.endTreenode();
        }
        if (ctx.beginTreenode("Test 3")) {
          checks[0] = ctx.checkbox("Checkbox 1", checks[0]);
          checks[1] = ctx.checkbox("Checkbox 2", checks[1]);
          checks[2] = ctx.checkbox("Checkbox 3", checks[2]);
          ctx.endTreenode();
        }
        ctx.layoutEndColumn();

        ctx.layoutBeginColumn();
        ctx.layoutRow([-1], 0);
        ctx.text(
          "Lorem ipsum dolor sit amet, consectetur adipiscing " +
            "elit. Maecenas lacinia, sem eu lacinia molestie, mi risus faucibus " +
            "ipsum, eu varius magna felis a nulla.",
        );
        ctx.layoutEndColumn();
      }

      if (ctx.header("Background Color", Option.Expanded)) {
        ctx.layoutRow([-78, -1], 74);
        // sliders
        ctx.layoutBeginColumn();
        ctx.layoutRow([46, -1], 0);
        ctx.label("Red:");
        bgColor[0] = Math.floor(ctx.slider("bgColor[0]", bgColor[0], 0, 255));
        ctx.label("Green:");
        bgColor[1] = Math.floor(ctx.slider("bgColor[1]", bgColor[1], 0, 255));
        ctx.label("Blue:");
        bgColor[2] = Math.floor(ctx.slider("bgColor[2]", bgColor[2], 0, 255));
        ctx.layoutEndColumn();
        // color preview
        const r = ctx.layoutNext();
        ctx.drawRect(r, {
          r: bgColor[0],
          g: bgColor[1],
          b: bgColor[2],
          a: 255,
        });
        ctx.drawControlText(
          string.format("#%02X%02X%02X", bgColor[0], bgColor[1], bgColor[2]),
          r,
          ColorId.Text,
          Option.AlignCenter,
        );
      }

      ctx.endWindow();
    }
  }

  function uint8Slider(
    ctx: Context,
    name: string,
    value: number,
    low: number,
    high: number,
  ): number {
    const res = ctx.slider(
      name,
      value,
      low,
      high,
      0,
      "%.0f",
      Option.AlignCenter,
    );
    return Math.floor(res);
  }

  const styleWindowFields: [string, ColorId][] = [
    ["text:", ColorId.Text],
    ["border:", ColorId.Border],
    ["windowbg:", ColorId.WindowBG],
    ["titlebg:", ColorId.TitleBG],
    ["titletext:", ColorId.TitleText],
    ["panelbg:", ColorId.PanelBG],
    ["button:", ColorId.Button],
    ["buttonhover:", ColorId.ButtonHover],
    ["buttonfocus:", ColorId.ButtonFocus],
    ["base:", ColorId.Base],
    ["basehover:", ColorId.BaseHover],
    ["basefocus:", ColorId.BaseFocus],
    ["scrollbase:", ColorId.ScrollBase],
    ["scrollthumb:", ColorId.ScrollThumb],
  ];

  function styleWindow(ctx: Context) {
    if (ctx.beginWindow("Style Editor", { x: 350, y: 250, w: 300, h: 240 })) {
      const sw = ctx.getCurrentContainer().body.w * 0.14;
      ctx.layoutRow([80, sw, sw, sw, sw, -1], 0);
      // prettier-ignore
      for (let i = 0; i < styleWindowFields.length; i++) {
        const [label, colorId] = styleWindowFields[i];
        ctx.label(label);
        ctx.style.colors[colorId].r = uint8Slider(ctx, `${label}!r`, ctx.style.colors[colorId].r, 0, 255);
        ctx.style.colors[colorId].g = uint8Slider(ctx, `${label}!g`, ctx.style.colors[colorId].g, 0, 255);
        ctx.style.colors[colorId].b = uint8Slider(ctx, `${label}!b`, ctx.style.colors[colorId].b, 0, 255);
        ctx.style.colors[colorId].a = uint8Slider(ctx, `${label}!a`, ctx.style.colors[colorId].a, 0, 255);
        ctx.drawRect(ctx.layoutNext(), ctx.style.colors[colorId]);
      }
      ctx.endWindow();
    }
  }

  const downKeys = {
    // mouse
    left: false,
    middle: false,
    right: false,

    // keyboard
    shift: false,
    ctrl: false,
    alt: false,
    backspace: false,
    return: false,
  };
  const downChars: string[] = [];

  deferLoop((stop) => {
    // handle char input
    {
      downKeys.backspace = false;
      downKeys.return = false;
      downChars.length = 0;
      while (true) {
        const char = gfx.getchar();
        if (char === -1) return stop();
        if (char === 0) break;

        if (char === 8) {
          // 8 is backspace / ctrl+h
          downKeys.backspace = true;
          continue;
        } else if (char === 13) {
          // 13 is enter / ctrl+?
          downKeys.return = true;
          continue;
        }

        const isUnicode = char >>> 24 === 117; // 'u'
        if (isUnicode) {
          const unicodeChar = char & 0xffffff;
          downChars.push(utf8.char(unicodeChar));
          continue;
        }

        // not unicode, only allow normal ASCII characters
        if (0x20 <= char && char <= 0x7e) {
          downChars.push(utf8.char(char));
          continue;
        }

        log.info(char, isUnicode);
      }

      ctx.inputScroll(gfx.mouse_wheel, gfx.mouse_hwheel);
      gfx.mouse_wheel = 0;
      gfx.mouse_hwheel = 0;

      ctx.inputMouseMove(gfx.mouse_x, gfx.mouse_y);

      downKeys.left = (gfx.mouse_cap & MouseCap.LeftMouse) !== 0;
      downKeys.middle = (gfx.mouse_cap & MouseCap.MiddleMouse) !== 0;
      downKeys.right = (gfx.mouse_cap & MouseCap.RightMouse) !== 0;
      downKeys.ctrl = (gfx.mouse_cap & MouseCap.CommandKey) !== 0;
      downKeys.alt = (gfx.mouse_cap & MouseCap.OptionKey) !== 0;
      downKeys.shift = (gfx.mouse_cap & MouseCap.ShiftKey) !== 0;
      ctx.inputMouseContinuous(
        (downKeys.left ? MouseButton.Left : 0) |
          (downKeys.middle ? MouseButton.Middle : 0) |
          (downKeys.right ? MouseButton.Right : 0),
      );
      ctx.inputKeyContinuous(
        (downKeys.alt ? Key.Alt : 0) |
          (downKeys.backspace ? Key.Backspace : 0) |
          (downKeys.ctrl ? Key.Ctrl : 0) |
          (downKeys.return ? Key.Return : 0) |
          (downKeys.shift ? Key.Shift : 0),
      );

      ctx.inputText(downChars.join(""));
    }

    ctx.begin();
    styleWindow(ctx);
    logWindow(ctx);
    testWindow(ctx);
    ctx.end();

    gfx.clear = bgColor[0] + bgColor[1] * 256 + bgColor[2] * 65536;

    for (const cmd of ctx.iterCommands()) {
      switch (cmd.type) {
        case CommandType.Clip: {
          log.debug("TODO: Clip");
          break;
        }
        case CommandType.Rect: {
          // set color
          gfx.r = cmd.color.r / 255;
          gfx.g = cmd.color.g / 255;
          gfx.b = cmd.color.b / 255;
          gfx.a = cmd.color.a / 255;

          gfx.rect(cmd.rect.x, cmd.rect.y, cmd.rect.w, cmd.rect.h);
          break;
        }
        case CommandType.Text: {
          // set color
          gfx.r = cmd.color.r / 255;
          gfx.g = cmd.color.g / 255;
          gfx.b = cmd.color.b / 255;
          gfx.a = cmd.color.a / 255;

          gfx.x = cmd.pos.x;
          gfx.y = cmd.pos.y;
          // TODO: Handle:
          // cmd.font
          // Clipping rect
          gfx.drawstr(cmd.str);
          break;
        }
        case CommandType.Icon: {
          // set color
          gfx.r = cmd.color.r / 255;
          gfx.g = cmd.color.g / 255;
          gfx.b = cmd.color.b / 255;
          gfx.a = cmd.color.a / 255;

          gfx.x = cmd.rect.x;
          gfx.y = cmd.rect.y;
          // TODO: Handle:
          // cmd.font
          // Clipping rect
          switch (cmd.id) {
            case IconId.Close: {
              gfx.drawstr(
                "X",
                DrawStrFlags.CenterHorizontally | DrawStrFlags.CenterVertically,
                cmd.rect.x + cmd.rect.w,
                cmd.rect.y + cmd.rect.h,
              );
              break;
            }
            case IconId.Check: {
              gfx.drawstr(
                "V",
                DrawStrFlags.CenterHorizontally | DrawStrFlags.CenterVertically,
                cmd.rect.x + cmd.rect.w,
                cmd.rect.y + cmd.rect.h,
              );
              break;
            }
            case IconId.Collapsed: {
              gfx.drawstr(
                ">",
                DrawStrFlags.CenterHorizontally | DrawStrFlags.CenterVertically,
                cmd.rect.x + cmd.rect.w,
                cmd.rect.y + cmd.rect.h,
              );
              break;
            }
            case IconId.Expanded: {
              gfx.drawstr(
                "v",
                DrawStrFlags.CenterHorizontally | DrawStrFlags.CenterVertically,
                cmd.rect.x + cmd.rect.w,
                cmd.rect.y + cmd.rect.h,
              );
              break;
            }
            default:
              error(`unhandled icon type: ${cmd}`);
          }
          break;
        }
        default:
          error(`unhandled command type: ${cmd}`);
      }
    }

    gfx.update();
  });
}

main();
