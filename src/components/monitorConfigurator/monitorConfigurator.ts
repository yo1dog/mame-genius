import './monitorConfigurator.less';
import monitorConfiguratorTemplate from './monitorConfigurator.html';
import * as stateUtil              from '../../stateUtil';
import {IMonitorConfiguration}     from '../../types/monitor';
import {IModelineConfiguration}    from '../../types/modeline';
import {orientationEnum}           from '../../types/common';
import {
  serializeState,
  deserializeState
} from './monitorConfiguratorSerializer';
import {
  htmlToBlock,
  selectR,
  firstChildR
} from '../../helpers/htmlUtil';

export interface IMonitorConfiguratorState {
  readonly modelineConfig: IModelineConfiguration;
}


export default class MonitorConfigurator {
  public readonly id  : string;
  public readonly elem: HTMLElement;
  public name?: string;
  
  private readonly presetInputElem            : HTMLSelectElement;
  private readonly orientationInputElem       : HTMLSelectElement;
  private readonly rangesRowElem              : HTMLElement;
  private readonly rangesInputElem            : HTMLTextAreaElement;
  private readonly allowInterlacedCheckboxElem: HTMLInputElement;
  private readonly allowDoublescanCheckboxElem: HTMLInputElement;
  
  
  public constructor(id: string, name?: string) {
    this.id = id;
    this.name = name;
    
    this.elem = firstChildR(htmlToBlock(monitorConfiguratorTemplate));
    this.presetInputElem             = selectR(this.elem, '.monitor-configurator__preset-input', 'select');
    this.orientationInputElem        = selectR(this.elem, '.monitor-configurator__orientation-input', 'select');
    this.rangesRowElem               = selectR(this.elem, '.monitor-configurator__ranges-row');
    this.rangesInputElem             = selectR(this.elem, '.monitor-configurator__ranges-input', 'textarea');
    this.allowInterlacedCheckboxElem = selectR(this.elem, '.monitor-configurator__allow-interlaced-checkbox', 'input');
    this.allowDoublescanCheckboxElem = selectR(this.elem, '.monitor-configurator__allow-doublescan-checkbox', 'input');
    
    this.presetInputElem.addEventListener('change', () => {
      this.updateRangesVisibility();
    });
  }
  
  public async init(): Promise<void> {
    const state = this.loadState();
    if (state) {
      const {modelineConfig} = state;
      
      this.presetInputElem            .value   = modelineConfig.preset;
      this.orientationInputElem       .value   = modelineConfig.orientation.val;
      this.rangesInputElem            .value   = modelineConfig.ranges.join('\n');
      this.allowInterlacedCheckboxElem.checked = modelineConfig.allowInterlaced;
      this.allowDoublescanCheckboxElem.checked = modelineConfig.allowDoublescan;
    }
    this.updateRangesVisibility();
  }
  
  public getMonitorConfig(): IMonitorConfiguration {
    const presetInput = this.presetInputElem.value;
    const preset = presetInput;
    
    const orientationInput = this.orientationInputElem.value;
    const orientation = orientationEnum.get(orientationInput);
    if (!orientation) throw new Error(`Invalid orientation: '${orientationInput}'`);
    
    const ranges = presetInput !== 'custom'? [] : (
      this.rangesInputElem.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    );
    const allowInterlaced = this.allowInterlacedCheckboxElem.checked;
    const allowDoublescan = this.allowDoublescanCheckboxElem.checked;
    
    const modelineConfig: IModelineConfiguration = {
      preset,
      orientation,
      ranges,
      allowInterlaced,
      allowDoublescan
    };
    
    const monitorConfig: IMonitorConfiguration = {
      name: this.name,
      modelineConfig
    };
    return monitorConfig;
  }
  
  private updateRangesVisibility(): void {
    this.rangesRowElem.classList.toggle('hidden', this.presetInputElem.value !== 'custom');
  }
  
  private getStateKey(): string {
    return `monitorConfiguratorModelineConfig-${this.id}`;
  }
  
  public saveState(): void {
    const state:IMonitorConfiguratorState = {
      modelineConfig: this.getMonitorConfig().modelineConfig
    };
    
    const sState = serializeState(state);
    stateUtil.set(this.getStateKey(), sState);
  }
  
  private loadState(): IMonitorConfiguratorState | undefined {
    const sState = stateUtil.get(this.getStateKey());
    if (!sState) return;
    
    try {
      return deserializeState(sState, 'sMonitorConfiguratorState');
    }
    catch (err) {
      console.error(`Error deserializing Monitor Configurator '${this.id}' state:`);
      console.error(err);
    }
  }
  
  public clearState(): void {
    stateUtil.remove(this.getStateKey());
  }
}
