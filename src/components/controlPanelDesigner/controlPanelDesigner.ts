import './controlPanelDesigner.less';
import cpDesignerTemplate              from './controlPanelDesigner.html';
import cpDesignerButtonClusterTemplate from './controlPanelDesignerButtonCluster.html';
import cpDesignerControlSetTemplate    from './controlPanelDesignerControlSet.html';
import ControlTypeSelector             from '../controlTypeSelector/controlTypeSelector';
import * as stateUtil                  from '../../stateUtil';
import * as controlDefUtil             from '../../controlDefUtil';
import createUUID                      from 'lib/get_uuid.js';
import {
  serializeState,
  deserializeState
} from './controlPanelDesignerSerializer';
import {
  htmlToBlock,
  selectR,
  firstChildR,
  replaceChildren
} from '../../helpers/htmlUtil';
import {
  ICPConfiguration,
  ICPButtonCluster,
  ICPControlSet
} from '../../types/controlPanel';
import {
  IControlDef,
  controlTypeEnum
} from '../../types/controlDef';

export interface ICPDesignerState {
  readonly cpConfig: ICPConfiguration;
}

export interface IButtonClusterRowDef {
  readonly buttonClusterId: string;
  readonly rowElem        : HTMLTableRowElement;
  readonly nameInputElem  : HTMLInputElement;
  readonly countInputElem : HTMLInputElement;
}

export interface IControlSetRowDef {
  readonly controlId                   : string;
  readonly controlDef                  : IControlDef;
  readonly rowElem                     : HTMLTableRowElement;
  readonly controlNameInputElem        : HTMLInputElement;
  readonly controlButtonsCountInputElem: HTMLInputElement;
  readonly buttonClusterSelectElem     : HTMLSelectElement;
}


export default class ControlPanelDesigner {
  public readonly id  : string;
  public readonly elem: HTMLElement;
  public name?: string;
  
  private readonly buttonClusterTableBodyElem   : HTMLElement;
  private readonly addButtonClusterTableBodyElem: HTMLElement;
  private readonly controlSetTableBodyElem      : HTMLElement;
  private readonly addControlSetButtonElem      : HTMLElement;
  
  private readonly controlTypeSelector: ControlTypeSelector;
  
  private readonly buttonClusterRowDefs: IButtonClusterRowDef[];
  private readonly controlSetRowDefs   : IControlSetRowDef[];
  
  
  public constructor(id: string, name?: string) {
    this.id = id;
    this.name = name;
    
    this.elem = firstChildR(htmlToBlock(cpDesignerTemplate));
    this.buttonClusterTableBodyElem    = selectR(this.elem, '.control-panel-designer__button-cluster-table__body');
    this.addButtonClusterTableBodyElem = selectR(this.elem, '.control-panel-designer__add-button-cluster-button');
    
    this.controlSetTableBodyElem = selectR(this.elem, '.control-panel-designer__control-set-table__body');
    this.addControlSetButtonElem = selectR(this.elem, '.control-panel-designer__add-control-set-button');
    
    this.controlTypeSelector = new ControlTypeSelector(
      selectR(this.elem, '.control-panel-designer__control-type-select', 'select'),
      selectR(this.elem, '.control-panel-designer__control-description')
    );
    
    this.buttonClusterRowDefs = [];
    this.controlSetRowDefs = [];
    
    this.addButtonClusterTableBodyElem.addEventListener('click', () => {
      this.addButtonClusterRow();
      this.updateAllButtonClusterSelectElems();
    });
    
    this.addControlSetButtonElem.addEventListener('click', () => {
      const controlDef = this.controlTypeSelector.getControlDef();
      if (!controlDef) return;
      
      this.addControlSetRow(controlDef);
    });
  }
  
  public async init() {
    await controlDefUtil.init();
    
    this.controlTypeSelector.populateSelect();
    
    const state = this.loadState();
    
    if (state) {
      const {cpConfig} = state;
      
      for (const buttonCluster of cpConfig.buttonClusters) {
        this.addButtonClusterRow({
          buttonClusterId: buttonCluster.id,
          name           : buttonCluster.name,
          numButtons     : buttonCluster.numButtons
        });
      }
      
      for (const controlSet of cpConfig.controlSets) {
        this.addControlSetRow(
          controlSet.controls[0].controlDef,
          {
            controlId        : controlSet.controls[0].id,
            controlName      : controlSet.controls[0].name,
            numControlButtons: controlSet.controls[0].numButtons,
            buttonClusterId  : controlSet.buttonCluster? controlSet.buttonCluster.id : undefined
          }
        );
      }
    }
    
    if (this.buttonClusterRowDefs.length === 0) {
      this.addButtonClusterRow({numButtons: 3});
    }
    
    this.updateAllButtonClusterSelectElems();
    
    if (this.controlSetRowDefs.length === 0) {
      this.addControlSetRow(
        controlDefUtil.getByType(controlTypeEnum.JOY_8WAY),
        {buttonClusterId: this.buttonClusterRowDefs[0].buttonClusterId}
      );
    }
  }
  
  private addButtonClusterRow({
    buttonClusterId = createUUID(),
    name            = this.getAutoButtonClusterName(),
    numButtons      = 1
  } = {}): IButtonClusterRowDef {
    const rowElem = firstChildR(htmlToBlock(cpDesignerButtonClusterTemplate), 'tr');
    const nameInputElem    = selectR(rowElem, '.control-panel-designer__button-cluster__name-input', 'input');
    const countInputElem   = selectR(rowElem, '.control-panel-designer__button-cluster__count-input', 'input');
    const removeButtonElem = selectR(rowElem, '.control-panel-designer__button-cluster__remove-button');
    
    rowElem.setAttribute('data-button-cluster-id', buttonClusterId);
    nameInputElem.value = name;
    countInputElem.value = numButtons.toString();
    
    nameInputElem.addEventListener('change', () => {
      this.updateAllButtonClusterSelectElems();
    });
    removeButtonElem.addEventListener('click', () => {
      this.removeButtonClusterRow(buttonClusterId);
      this.updateAllButtonClusterSelectElems();
    });
    
    this.buttonClusterTableBodyElem.appendChild(rowElem);
    
    const buttonClusterRowDef: IButtonClusterRowDef = {
      buttonClusterId,
      rowElem,
      nameInputElem,
      countInputElem
    };
    this.buttonClusterRowDefs.push(buttonClusterRowDef);
    
    return buttonClusterRowDef;
  }
  
  private removeButtonClusterRow(buttonClusterId: string): void {
    const index = this.buttonClusterRowDefs.findIndex(x => x.buttonClusterId === buttonClusterId);
    if (index === -1) return;
    
    const buttonClusterRowDef = this.buttonClusterRowDefs[index];
    buttonClusterRowDef.rowElem.remove();
    
    this.buttonClusterRowDefs.splice(index, 1);
  }
  
  private getAutoButtonClusterName():string {
    const autoNameBase = 'Buttons';
    const regexp = new RegExp(`^\\s*${autoNameBase}\\s+(\\d+)\\s*$`);
    let maxAutoNameNumSuffix = 0;
    
    for (const buttonClusterRowRef of this.buttonClusterRowDefs) {
      const result = regexp.exec(buttonClusterRowRef.nameInputElem.value);
      if (!result) continue;
      
      const autoNameNumSuffix = parseInt(result[1], 10);
      if (autoNameNumSuffix > maxAutoNameNumSuffix) {
        maxAutoNameNumSuffix = autoNameNumSuffix;
      }
    }
    
    return `${autoNameBase} ${maxAutoNameNumSuffix + 1}`;
  }
  
  private addControlSetRow(
    controlDef: IControlDef,
    options: {
      controlId?        : string;
      controlName?      : string;
      numControlButtons?: number;
      buttonClusterId?  : string;
    } = {}
  ): IControlSetRowDef {
    const {
      defaultNumControlButtons,
      canEditNumControlButtons
    } = this.getControlButtonsDescOptions(controlDef);
    
    const {
      controlId         = createUUID(),
      controlName       = this.getAutoControlName(controlDef),
      numControlButtons = defaultNumControlButtons,
      buttonClusterId
    } = options;
    
    const rowElem = firstChildR(htmlToBlock(cpDesignerControlSetTemplate), 'tr');
    const controlNameInputElem         = selectR(rowElem, '.control-panel-designer__control-set__control-name-input', 'input');
    const controlDefNameElem           = selectR(rowElem, '.control-panel-designer__control-set__control-def-name');
    const controlButtonsDescElem       = selectR(rowElem, '.control-panel-designer__control-set__control-buttons-desc');
    const controlButtonsCountElem      = selectR(rowElem, '.control-panel-designer__control-set__control-buttons-desc__count');
    const controlButtonsCountInputElem = selectR(rowElem, '.control-panel-designer__control-set__control-buttons-desc__count-input', 'input');
    const buttonClusterSelectElem      = selectR(rowElem, '.control-panel-designer__control-set__button-cluster-select', 'select');
    const removeButtonElem             = selectR(rowElem, '.control-panel-designer__control-set__remove-button');
    
    rowElem.setAttribute('data-control-id', controlId);
    controlNameInputElem.value = controlName;
    controlDefNameElem.innerText = controlDef.name;
    
    controlButtonsCountElem.innerText = numControlButtons.toString();
    controlButtonsCountInputElem.value = numControlButtons.toString();
    
    if (numControlButtons > 0 || canEditNumControlButtons) {
      controlButtonsDescElem.classList.remove('hidden');
      
      if (canEditNumControlButtons) {
        controlButtonsCountInputElem.classList.remove('hidden');
        controlButtonsCountInputElem.addEventListener('change', () => {
          this.updateControlButtonsDescription(
            controlButtonsDescElem,
            parseInt(controlButtonsCountInputElem.value, 10) || 0
          );
        });
      }
      else {
        controlButtonsCountElem.classList.remove('hidden');
      }
    }
    
    this.updateControlButtonsDescription(controlButtonsDescElem, numControlButtons);
    
    this.updateButtonClusterSelectElem(buttonClusterSelectElem);
    if (buttonClusterId) {
      // ensure button cluster ID exists
      if (this.buttonClusterRowDefs.findIndex(x => x.buttonClusterId === buttonClusterId) !== -1) {
        buttonClusterSelectElem.value = buttonClusterId;
      }
    }
    
    removeButtonElem.addEventListener('click', () => {
      this.removeControlSetRow(controlId);
    });
    
    this.controlSetTableBodyElem.appendChild(rowElem);
    
    const controlSetRowDef:IControlSetRowDef = {
      controlId,
      controlDef,
      rowElem,
      controlNameInputElem,
      controlButtonsCountInputElem,
      buttonClusterSelectElem
    };
    this.controlSetRowDefs.push(controlSetRowDef);
    
    return controlSetRowDef;
  }
  
  public getControlPanelConfig():ICPConfiguration {
    const buttonClusters = this.buttonClusterRowDefs.map(buttonClusterRowDef => {
      const buttonCluster:ICPButtonCluster = {
        id  : buttonClusterRowDef.buttonClusterId,
        name: buttonClusterRowDef.nameInputElem.value.trim(),
        numButtons: parseInt(buttonClusterRowDef.countInputElem.value, 10) || 0,
        isOnOppositeScreenSide: false
      };
      return buttonCluster;
    });
    
    const controlSets = this.controlSetRowDefs.map(controlSetRowDef => {
      const controlSet: ICPControlSet = {
        controls: [{
          id        : controlSetRowDef.controlId,
          name      : controlSetRowDef.controlNameInputElem.value.trim(),
          controlDef: controlSetRowDef.controlDef,
          numButtons: parseInt(controlSetRowDef.controlButtonsCountInputElem.value, 10) || 0,
          isOnOppositeScreenSide: false
        }],
        buttonCluster: buttonClusters.find(x => x.id === controlSetRowDef.buttonClusterSelectElem.value)
      };
      return controlSet;
    });
    
    // assume each control set row defines a physical control
    // 
    // this may seem backwards as you would assume you define the physical
    // controls first and then create control sets based on those. However,
    // we do it this way for now to keep the UI simple
    
    const controls = controlSets.flatMap(x => x.controls);
    
    const controlPanelConfig: ICPConfiguration = {
      name: this.name,
      controls,
      buttonClusters,
      controlSets
    };
    return controlPanelConfig;
  }
  
  private removeControlSetRow(controlId: string): IControlSetRowDef | undefined {
    const index = this.controlSetRowDefs.findIndex(x => x.controlId === controlId);
    if (index === -1) return;
    
    const controlSetRowDef = this.controlSetRowDefs[index];
    controlSetRowDef.rowElem.remove();
    
    return this.controlSetRowDefs.splice(index, 1)[0];
  }
  
  private getAutoControlName(controlDef:IControlDef): string {
    const autoNameBase = controlDef.name;
    const regexp = new RegExp(`^\\s*${autoNameBase}(\\s+(\\d+))?\\s*$`);
    let maxAutoNameNumSuffix = 0;
    
    for (const controlSetRowRef of this.controlSetRowDefs) {
      const result = regexp.exec(controlSetRowRef.controlNameInputElem.value);
      if (!result) continue;
      
      const autoNameNumSuffix = result[2]? parseInt(result[2], 10) : 1;
      if (autoNameNumSuffix > maxAutoNameNumSuffix) {
        maxAutoNameNumSuffix = autoNameNumSuffix;
      }
    }
    
    return `${autoNameBase} ${maxAutoNameNumSuffix + 1}`;
  }
  
  private getControlButtonsDescOptions(controlDef:IControlDef): {
    defaultNumControlButtons: number;
    canEditNumControlButtons: boolean;
  } {
    switch (controlDef.type) {
      case controlTypeEnum.JOY_2WAY_VERTICAL_TRIGGER:
      case controlTypeEnum.JOY_4WAY_TRIGGER:
      case controlTypeEnum.JOY_8WAY_TRIGGER:
        return {
          defaultNumControlButtons: 1,
          canEditNumControlButtons: true
        };
      
      case controlTypeEnum.JOY_8WAY_TOPFIRE:
        return {
          defaultNumControlButtons: 1,
          canEditNumControlButtons: false
        };
      
      case controlTypeEnum.JOY_ANALOG_FLIGHTSTICK:
        return {
          defaultNumControlButtons: 3,
          canEditNumControlButtons: true
        };
      
      case controlTypeEnum.JOY_ANALOG_YOKE:
      case controlTypeEnum.THROTTLE:
        return {
          defaultNumControlButtons: 2,
          canEditNumControlButtons: true
        };
      
      case controlTypeEnum.STEERINGWHEEL_360:
      case controlTypeEnum.STEERINGWHEEL_270:
      case controlTypeEnum.SHIFTER_HIGHLOW:
      case controlTypeEnum.SHIFTER_UPDOWN:
      case controlTypeEnum.SHIFTER_4GEAR:
        return {
          defaultNumControlButtons: 0,
          canEditNumControlButtons: true
        };
      
      case controlTypeEnum.LIGHTGUN:
      case controlTypeEnum.LIGHTGUN_ANALOG:
        return {
          defaultNumControlButtons: 1,
          canEditNumControlButtons: true
        };
      
      default:
        return {
          defaultNumControlButtons: 0,
          canEditNumControlButtons: false
        };
    }
  }
  
  private updateControlButtonsDescription(
    controlButtonsDescElem: HTMLElement,
    numControlButtons     : number
  ): void {
    const isSingular = numControlButtons === 1;
    
    controlButtonsDescElem.classList.toggle('control-panel-designer__control-set__control-buttons-desc--singular', isSingular);
    controlButtonsDescElem.classList.toggle('control-panel-designer__control-set__control-buttons-desc--plural', !isSingular);
  }
  
  private updateAllButtonClusterSelectElems() {
    for (const controlSetRowDef of this.controlSetRowDefs) {
      this.updateButtonClusterSelectElem(controlSetRowDef.buttonClusterSelectElem);
    }
  }
  
  private updateButtonClusterSelectElem(selectElem: HTMLSelectElement): void {
    const prevValue = selectElem.value;
    let prevValueExists = false;
    
    replaceChildren(selectElem);
    
    const noneOptionElem = document.createElement('option');
    noneOptionElem.value = '';
    noneOptionElem.innerText = 'None';
    selectElem.appendChild(noneOptionElem);
    
    for (const buttonClusterRowDef of this.buttonClusterRowDefs) {
      const optionElem = document.createElement('option');
      optionElem.value = buttonClusterRowDef.buttonClusterId;
      optionElem.innerText = buttonClusterRowDef.nameInputElem.value.trim() || '<unnamed>';
      
      selectElem.appendChild(optionElem);
      
      if (optionElem.value === prevValue) {
        prevValueExists = true;
      }
    }
    
    selectElem.value = prevValueExists? prevValue : '';
  }
  
  private getStateKey():string {
    return `controlPanelDesigner-${this.id}`;
  }
  
  public saveState():void {
    const state:ICPDesignerState = {
      cpConfig: this.getControlPanelConfig()
    };
    
    const sState = serializeState(state);
    stateUtil.set(this.getStateKey(), sState);
  }
  
  private loadState(): ICPDesignerState | undefined {
    const sState = stateUtil.depricate(
      this.getStateKey(),
      `controlPanelConfigurator-${this.id}`
    );
    if (!sState) return;
    
    try {
      return deserializeState(sState, 'sCPDesignerState');
    }
    catch (err) {
      console.error(`Error deserializing Control Panel Designer '${this.id}' state:`);
      console.error(err);
    }
  }
  
  public clearState():void {
    stateUtil.remove(this.getStateKey());
  }
}
