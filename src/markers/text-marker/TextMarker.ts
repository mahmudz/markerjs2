import { IPoint } from '../../core/IPoint';
import { SvgHelper } from '../../core/SvgHelper';
import { RectangularBoxMarkerBase } from '../RectangularBoxMarkerBase';
import { Settings } from '../../core/Settings';
import Icon from './text-marker-icon.svg';
import { ColorPickerPanel } from '../../ui/toolbox-panels/ColorPickerPanel';
import { ToolboxPanel } from '../../ui/ToolboxPanel';
import { FontFamilyPanel } from '../../ui/toolbox-panels/FontFamilyPanel';
import { TextMarkerState } from './TextMarkerState';
import { MarkerBaseState } from '../../core/MarkerBaseState';

export class TextMarker extends RectangularBoxMarkerBase {
  public static typeName = 'TextMarker';

  public static title = 'Text marker';
  public static icon = Icon;

  protected color = 'transparent';
  protected fontFamily: string;
  protected padding = 5;

  protected colorPanel: ColorPickerPanel;
  protected fontFamilyPanel: FontFamilyPanel;

  private readonly DEFAULT_TEXT = "your text here";
  private text: string = this.DEFAULT_TEXT;
  protected textElement: SVGTextElement;
  protected bgRectangle: SVGRectElement;

  protected textEditDiv: HTMLDivElement;
  protected textEditor: HTMLDivElement;

  constructor(container: SVGGElement, overlayContainer: HTMLDivElement, settings: Settings) {
    super(container, overlayContainer, settings);

    this.color = settings.defaultColor;
    this.fontFamily = settings.defaultFontFamily;

    this.defaultSize = {x: 100, y: 30};

    this.setColor = this.setColor.bind(this);
    this.setFont = this.setFont.bind(this);
    this.renderText = this.renderText.bind(this);
    this.sizeText = this.sizeText.bind(this);
    this.textEditDivClicked = this.textEditDivClicked.bind(this);
    this.showTextEditor = this.showTextEditor.bind(this);
    this.setSize = this.setSize.bind(this);

    this.colorPanel = new ColorPickerPanel(
      'Color',
      settings.defaultColorSet,
      settings.defaultColor
    );
    this.colorPanel.onColorChanged = this.setColor;

    this.fontFamilyPanel = new FontFamilyPanel(
      'Font',
      settings.defaultFontFamilies,
      settings.defaultFontFamily
    );
    this.fontFamilyPanel.onFontChanged = this.setFont;
  }

  public ownsTarget(el: EventTarget): boolean {
    if (super.ownsTarget(el) || el === this.visual || el === this.textElement || el === this.bgRectangle) {
      return true;
    } else {
      let found = false;
      this.textElement.childNodes.forEach(span => {
        if (span === el) {
          found = true;
        }
      })
      return found;
    }
  }

  protected createVisual(): void {
    this.visual = SvgHelper.createGroup();

    this.bgRectangle = SvgHelper.createRect(1, 1, [
      ['fill', 'transparent']
    ]);
    this.visual.appendChild(this.bgRectangle);

    this.textElement = SvgHelper.createText([
      ['fill', this.color],
      ['font-family', this.fontFamily],
      ['x', '0'],
      ['y', '0']
    ]);
    this.textElement.transform.baseVal.appendItem(SvgHelper.createTransform()); // translate transorm
    this.textElement.transform.baseVal.appendItem(SvgHelper.createTransform()); // scale transorm

    this.visual.appendChild(this.textElement);

    const translate = SvgHelper.createTransform();
    this.visual.transform.baseVal.appendItem(translate);

    this.addMarkerVisualToContainer(this.visual);
    this.renderText();
  }

  public pointerDown(point: IPoint, target?: EventTarget): void {
    super.pointerDown(point, target);
    if (this.state === 'new') {
      this.createVisual();
      this.moveVisual(point);
      this._state = 'creating';
    }
  }

  private renderText() {
    const LINE_SIZE = "1.2em";

    while (this.textElement.lastChild) {
        this.textElement.removeChild(this.textElement.lastChild);
    }

    const lines = this.text.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
    lines.forEach(line => {
        if (line.trim() === "") {
            line = " "; // workaround for swallowed empty lines
        }
        this.textElement.appendChild(SvgHelper.createTSpan(line, [["x", "0"], ["dy", LINE_SIZE]]));
    });

    setTimeout(this.sizeText, 10);
  }

  private getTextScale(): number {
    const textSize = this.textElement.getBBox();
    let scale = 1.0;
    if (textSize.width > 0 && textSize.height > 0) {
        const xScale = (this.width * 1.0 - this.width * this.padding * 2 / 100) / textSize.width;
        const yScale = (this.height * 1.0 - this.height * this.padding * 2 / 100) / textSize.height;
        scale = Math.min(xScale, yScale);
    }
    return scale;
  }

  private getTextPosition(scale: number): IPoint {
    const textSize = this.textElement.getBBox();
    let x = 0;
    let y = 0;
    if (textSize.width > 0 && textSize.height > 0) {
      x = (this.width - textSize.width * scale) / 2;
      y = this.height / 2 - textSize.height * scale / 2;
    }
    return {x: x, y: y};
  }

  private sizeText() {
    const textBBox = this.textElement.getBBox();
    const scale = this.getTextScale();
    const position = this.getTextPosition(scale);
    position.y -= textBBox.y * scale; // workaround adjustment for text not being placed at y=0

    this.textElement.transform.baseVal.getItem(0).setTranslate(position.x, position.y);
    this.textElement.transform.baseVal.getItem(1).setScale(scale, scale);
  }


  public manipulate(point: IPoint): void {
    super.manipulate(point);
  }

  protected resize(point: IPoint): void {
    super.resize(point);
    this.setSize();
    this.sizeText();
  }

  protected setSize(): void {
    super.setSize();
    SvgHelper.setAttributes(this.visual, [
      ['width', this.width.toString()],
      ['height', this.height.toString()],
    ]);
    SvgHelper.setAttributes(this.bgRectangle, [
      ['width', this.width.toString()],
      ['height', this.height.toString()],
    ]);
  }

  public pointerUp(point: IPoint): void {
    const inState = this.state;
    super.pointerUp(point);
    this.setSize();
    if (inState === 'creating') {
      this.showTextEditor();
    }
  }

  private showTextEditor() {
    this.overlayContainer.innerHTML = '';

    this.textEditDiv = document.createElement('div');
    // textEditDiv.style.display = 'flex';
    this.textEditDiv.style.flexGrow = '2';
    //textEditDiv.style.backgroundColor = 'rgb(0,0,0,0.7)';
    this.textEditDiv.style.alignItems = 'center';
    this.textEditDiv.style.justifyContent = 'center';
    this.textEditDiv.style.pointerEvents = 'auto';
    this.textEditDiv.style.overflow = 'hidden';

    const textScale = this.getTextScale();
    const textPosition = this.getTextPosition(textScale);

    this.textEditor = document.createElement('div');
    this.textEditor.style.position = 'absolute';
    this.textEditor.style.top = `${this.top + textPosition.y}px`;
    this.textEditor.style.left = `${this.left + textPosition.x}px`;
    this.textEditor.style.maxWidth = `${this.overlayContainer.offsetWidth - this.left - textPosition.x}px`;
    this.textEditor.style.fontSize = `${Math.max(textScale, 0.9)}em`;
    this.textEditor.style.fontFamily = this.fontFamily;
    this.textEditor.style.lineHeight = '1em';
    this.textEditor.innerText = this.text;
    this.textEditor.contentEditable = 'true';
    this.textEditor.style.color = this.color;
    this.textEditor.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
    });
    this.textEditor.addEventListener('input', () => {
      let fontSize = Number.parseFloat(this.textEditor.style.fontSize);
      while(this.textEditor.clientWidth >= Number.parseInt(this.textEditor.style.maxWidth) && fontSize > 0.9) {
        fontSize -= 0.1;
        this.textEditor.style.fontSize = `${Math.max(fontSize, 0.9)}em`;
      }
    })

    this.textEditDiv.addEventListener('pointerup', () => {
      this.textEditDivClicked(this.textEditor.innerText);
    })
    this.textEditDiv.appendChild(this.textEditor);
    this.overlayContainer.appendChild(this.textEditDiv);

    this.textEditor.focus();
    document.execCommand('selectAll');

    this.hideVisual();
  }

  private textEditDivClicked(text: string) {
    this.text = text;
    this.overlayContainer.innerHTML = '';
    this.renderText();
    this.showVisual();
  }

  public dblClick(point: IPoint, target?: EventTarget):void {
    super.dblClick(point, target);

    this.showTextEditor();
  }


  protected setColor(color: string): void {
    SvgHelper.setAttributes(this.textElement, [['fill', color]]);
    this.color = color;
    if (this.textEditor) {
      this.textEditor.style.color = this.color;
    }
  }

  protected setFont(font: string): void {
    SvgHelper.setAttributes(this.textElement, [['font-family', font]]);
    this.fontFamily = font;
    if (this.textEditor) {
      this.textEditor.style.fontFamily = this.fontFamily;
    }
    this.renderText();
  }

  protected hideVisual(): void {
    this.textElement.style.display = 'none';
    this.hideControlBox();
  }
  protected showVisual(): void {
    this.textElement.style.display = '';
    this.showControlBox();
  }

  public get toolboxPanels(): ToolboxPanel[] {
    return [this.colorPanel, this.fontFamilyPanel];
  }

  public getState(): TextMarkerState {
    const result: TextMarkerState = Object.assign({
      color: this.color,
      fontFamily: this.fontFamily,
      padding: this.padding,
      text: this.text
    }, super.getState());
    result.typeName = TextMarker.typeName;

    return result;
  }

  public restoreState(state: MarkerBaseState): void {
    const textState = state as TextMarkerState;
    this.color = textState.color;
    this.fontFamily = textState.fontFamily;
    this.padding = textState.padding;
    this.text = textState.text;

    this.createVisual();
    super.restoreState(state);
    this.setSize();
  }

}
