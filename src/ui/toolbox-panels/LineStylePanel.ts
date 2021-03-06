import { Style } from '../../core/Style';
import { ToolboxPanel } from '../ToolboxPanel';
import Icon from './line-style-panel-icon.svg';

export type StyleChangeHandler = (newStyle: string) => void;

export class LineStylePanel extends ToolboxPanel {
  private styles: string[] = [];
  private currentStyle?: string;

  private styleBoxes: HTMLDivElement[] = [];

  public onStyleChanged?: StyleChangeHandler;

  constructor(title: string, styles: string[], currentStyle?: string, icon?: string) {
    super(title, icon ? icon : Icon);
    this.styles = styles;
    this.currentStyle = currentStyle;

    this.setCurrentStyle = this.setCurrentStyle.bind(this);
  }

  public getUi(): HTMLDivElement {
    const panelDiv = document.createElement('div');
    panelDiv.style.display = 'flex';
    panelDiv.style.overflow = 'hidden';
    panelDiv.style.flexGrow = '2';
    this.styles.forEach((lineStyle) => {
      const styleBoxContainer = document.createElement('div');
      styleBoxContainer.style.display = 'flex'; //'inline-block';
      styleBoxContainer.style.alignItems = 'center';
      styleBoxContainer.style.justifyContent = 'space-between';
      styleBoxContainer.style.padding = '5px';
      styleBoxContainer.style.borderWidth = '2px';
      styleBoxContainer.style.borderStyle = 'solid';
      styleBoxContainer.style.overflow = 'hidden';
      styleBoxContainer.style.maxWidth = `${100 / this.styles.length - 5}%`;
      styleBoxContainer.style.borderColor =
        lineStyle === this.currentStyle ? Style.settings.toolboxAccentColor : 'transparent';

      styleBoxContainer.addEventListener('click', () => {
        this.setCurrentStyle(lineStyle, styleBoxContainer);
      })
      panelDiv.appendChild(styleBoxContainer);

      const styleBox = document.createElement('div');
      styleBox.style.minHeight = '20px';
      styleBox.style.flexGrow = '2';
      styleBox.style.overflow = 'hidden';

      const styleSample = `<svg width="100" height="20">
      <line x1="0" y1="10" x2="100" y2="10" stroke="${
        Style.settings.toolboxColor}" stroke-width="3" ${
          lineStyle !== '' ? 'stroke-dasharray="' + lineStyle + '"' : ''} />
  </svg>`;

      styleBox.innerHTML = styleSample;

      styleBoxContainer.appendChild(styleBox);

      this.styleBoxes.push(styleBoxContainer);
    });
    return panelDiv;
  }

  private setCurrentStyle(newStyle: string, target: HTMLDivElement) {
    this.currentStyle = newStyle;

    this.styleBoxes.forEach(box => {
      box.style.borderColor = box === target ? Style.settings.toolboxAccentColor : 'transparent';
    });

    if (this.onStyleChanged) {
      this.onStyleChanged(this.currentStyle);
    }
  }
}
