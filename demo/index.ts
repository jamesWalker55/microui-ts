import {
  ColorId,
  CommandType,
  Context,
  IconId,
  Key,
  MouseButton,
  Option,
  Response,
} from "../src/index";

function hex2(val: number): string {
  val = Math.floor(val);
  const str = val.toString(16);
  if (str.length > 2)
    throw new Error("attempted to format hex number with over 2 digits");
  return str.padStart(2, "0");
}

function deferLoop(func: (stop: () => void) => void) {
  let shouldStop = false;
  function stop() {
    shouldStop = true;
  }

  function inner(this: void) {
    func(stop);

    if (shouldStop) return;

    window.requestAnimationFrame(inner);
  }
  inner();
}

function main() {
  const canvas = document.getElementById("demo-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("cannot find canvas");

  // make canvas update rendering resolution on resize
  let canvasWidth = canvas.clientWidth;
  let canvasHeight = canvas.clientHeight;
  {
    const observer = new ResizeObserver(() => {
      canvasWidth = canvas.clientWidth;
      canvasHeight = canvas.clientHeight;
    });
    observer.observe(canvas);
  }

  const c = canvas.getContext("2d");
  if (!c) throw new Error("failed to initialise 2d context");

  const fontHeight = (() => {
    const metrics = c.measureText("Aj");
    return metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
  })();

  const ctx = new Context(
    (font, str, len) => {
      if (len !== undefined) str = str.slice(0, len);
      const metrics = c.measureText(str);
      return metrics.width;
    },
    (font) => {
      return fontHeight;
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

  function logWindow() {
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

  function testWindow() {
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
          `#${hex2(bgColor[0])}${hex2(bgColor[1])}${hex2(bgColor[2])}`,
          r,
          ColorId.Text,
          Option.AlignCenter,
        );
      }

      ctx.endWindow();
    }
  }

  function uint8Slider(
    name: string,
    value: number,
    low: number,
    high: number,
  ): number {
    const res = ctx.slider(name, value, low, high, 0, 0, Option.AlignCenter);
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

  function styleWindow() {
    if (ctx.beginWindow("Style Editor", { x: 350, y: 250, w: 300, h: 240 })) {
      const sw = ctx.getCurrentContainer().body.w * 0.14;
      ctx.layoutRow([80, sw, sw, sw, sw, -1], 0);
      // prettier-ignore
      for (let i = 0; i < styleWindowFields.length; i++) {
        const [label, colorId] = styleWindowFields[i];
        ctx.label(label);
        ctx.style.colors[colorId].r = uint8Slider(`${label}!r`, ctx.style.colors[colorId].r, 0, 255);
        ctx.style.colors[colorId].g = uint8Slider(`${label}!g`, ctx.style.colors[colorId].g, 0, 255);
        ctx.style.colors[colorId].b = uint8Slider(`${label}!b`, ctx.style.colors[colorId].b, 0, 255);
        ctx.style.colors[colorId].a = uint8Slider(`${label}!a`, ctx.style.colors[colorId].a, 0, 255);
        ctx.drawRect(ctx.layoutNext(), ctx.style.colors[colorId]);
      }
      ctx.endWindow();
    }
  }

  const inputState = {
    // mouse
    mouseX: 0,
    mouseY: 0,
    left: false,
    middle: false,
    right: false,

    // scroll
    scrollX: 0,
    scrollY: 0,

    // keyboard
    shift: false,
    ctrl: false,
    alt: false,
    backspace: false,
    return: false,

    // typing
    chars: [] as string[],
  };

  function updateMouseState(e: MouseEvent) {
    inputState.mouseX = e.clientX;
    inputState.mouseY = e.clientY;
    inputState.left = (e.buttons & 1) !== 0;
    inputState.right = (e.buttons & 2) !== 0;
    inputState.middle = (e.buttons & 4) !== 0;

    inputState.alt = e.altKey;
    inputState.ctrl = e.ctrlKey || e.metaKey;
    inputState.shift = e.shiftKey;
  }
  canvas.addEventListener("mousemove", updateMouseState);
  canvas.addEventListener("mousedown", updateMouseState);
  canvas.addEventListener("mouseup", updateMouseState);

  function updateKeyboardState(e: KeyboardEvent, isDown: boolean) {
    if (e.key === "Enter") {
      inputState.return = isDown;
    } else if (e.key === "Backspace") {
      inputState.backspace = isDown;
    } else if (e.key === "Shift") {
      inputState.shift = isDown;
    } else if (e.key === "Alt") {
      inputState.alt = isDown;
    } else if (e.key === "Control" || e.key === "Meta") {
      inputState.ctrl = isDown;
    } else if (e.key.length === 1) {
      // HACK: Only detect character inputs, assume all inputs must have length 1
      inputState.chars.push(e.key);
    }
  }
  window.addEventListener("keydown", (e) => updateKeyboardState(e, true));
  window.addEventListener("keyup", (e) => updateKeyboardState(e, false));

  window.addEventListener("wheel", (e) => {
    inputState.scrollX += e.deltaX;
    inputState.scrollY += e.deltaY;
  });

  deferLoop((stop) => {
    // handle input
    {
      ctx.inputScroll(inputState.scrollX, inputState.scrollY);
      inputState.scrollX = 0;
      inputState.scrollY = 0;

      ctx.inputMouseMove(inputState.mouseX, inputState.mouseY);

      ctx.inputMouseContinuous(
        (inputState.left ? MouseButton.Left : 0) |
          (inputState.middle ? MouseButton.Middle : 0) |
          (inputState.right ? MouseButton.Right : 0),
      );
      ctx.inputKeyContinuous(
        (inputState.alt ? Key.Alt : 0) |
          (inputState.backspace ? Key.Backspace : 0) |
          (inputState.ctrl ? Key.Ctrl : 0) |
          (inputState.return ? Key.Return : 0) |
          (inputState.shift ? Key.Shift : 0),
      );

      ctx.inputText(inputState.chars.join(""));
    }

    ctx.begin();
    styleWindow();
    logWindow();
    testWindow();
    ctx.end();

    // start drawing
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // clear canvas to BG color
    {
      c.fillStyle = `rgb(${bgColor.join(",")})`;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (const cmd of ctx.iterCommands()) {
      switch (cmd.type) {
        case CommandType.Clip: {
          console.debug("TODO: Clip");
          break;
        }
        case CommandType.Rect: {
          c.fillStyle = `rgba(${cmd.color.r}, ${cmd.color.g}, ${cmd.color.b}, ${cmd.color.a})`;
          c.fillRect(cmd.rect.x, cmd.rect.y, cmd.rect.w, cmd.rect.h);
          break;
        }
        case CommandType.Text: {
          c.textAlign = "left";
          c.textBaseline = "top";
          c.fillStyle = `rgba(${cmd.color.r}, ${cmd.color.g}, ${cmd.color.b}, ${cmd.color.a})`;
          c.fillText(cmd.str, cmd.pos.x, cmd.pos.y);
          break;
        }
        case CommandType.Icon: {
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = `rgba(${cmd.color.r}, ${cmd.color.g}, ${cmd.color.b}, ${cmd.color.a})`;

          const x = cmd.rect.x + cmd.rect.w / 2;
          const y = cmd.rect.y + cmd.rect.h / 2;
          switch (cmd.id) {
            case IconId.Close: {
              c.fillText("X", x, y);
              break;
            }
            case IconId.Check: {
              c.fillText("V", x, y);
              break;
            }
            case IconId.Collapsed: {
              c.fillText(">", x, y);
              break;
            }
            case IconId.Expanded: {
              c.fillText("v", x, y);
              break;
            }
            default:
              throw new Error(`unhandled icon type: ${cmd}`);
          }
          break;
        }
        default:
          throw new Error(`unhandled command type: ${cmd}`);
      }
    }
  });
}

main();
