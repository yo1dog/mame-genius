import {TJSONValue} from '../types/json';
import {
  IMAMEList,
  IMachine,
  IMachineDisplay,
  IMachineDriver,
  machineDriverStatusEnum,
  machineDriverSaveStateStatusEnum
} from '../types/mame';
import {
  displayTypeEnum,
  displayRotationEnum
} from '../types/common';
import {
  deserializeOptional,
  deserializeString,
  deserializeStringOptional,
  deserializeNumber,
  deserializeNumberOptional,
  deserializeBoolean,
  deserializeObject,
  deserializeArray
} from '../types/jsonSerializer';


let mameList: IMAMEList | null = null;
let machineMap: Map<string, IMachine> | null = null;

async function _init(): Promise<void> {
  const sMAMEList: TJSONValue = (await import(
    /* webpackChunkName: "mameList" */
    'data/mameList.filtered.partial.min.json'
  )).default;
  
  mameList = deserialize(sMAMEList);
  
  machineMap = new Map<string, IMachine>();
  for (const machine of mameList.machines) {
    machineMap.set(machine.name, machine);
  }
}

let initPromise: Promise<void> | null = null;
export async function init(): Promise<void> {
  return (initPromise = initPromise || _init());
}

export function getList(): IMAMEList {
  if (!mameList) throw new Error(`Attempting to access before initialized.`);
  
  return mameList;
}

export function getMachineMap(): Map<string, IMachine> {
  if (!machineMap) throw new Error(`Attempting to access before initialized.`);
  
  return machineMap;
}

export function getMachineByName(name: string): IMachine | undefined {
  if (!machineMap) {
    throw new Error(`Attempting to access before initialized.`);
  }
  
  return machineMap.get(name);
}






function deserialize(sMAMEList: TJSONValue): IMAMEList {
  return deserializeMAMEList(sMAMEList, 'sMameList');
}

function deserializeMAMEList(sMAMEList: TJSONValue, propLabel: string): IMAMEList {
  const mameListJ = deserializeObject(sMAMEList, propLabel);
  return {
    build   : deserializeString (mameListJ.build,    `${propLabel}.build`   ),
    debug   : deserializeBoolean(mameListJ.debug,    `${propLabel}.debug`   ),
    machines: deserializeArray  (mameListJ.machines, `${propLabel}.machines`, deserializeMachine),
  };
}

function deserializeMachine(sMachine: TJSONValue, propLabel: string): IMachine {
  const machineJ = deserializeObject(sMachine, propLabel);
  return {
    name        : deserializeString        (machineJ.name,         `${propLabel}.name`        ),
    description : deserializeString        (machineJ.description,  `${propLabel}.description` ),
    year        : deserializeStringOptional(machineJ.year,         `${propLabel}.year`        ),
    manufacturer: deserializeStringOptional(machineJ.manufacturer, `${propLabel}.manufacturer`),
    cloneof     : deserializeStringOptional(machineJ.cloneof,      `${propLabel}.cloneof`     ),
    displays    : deserializeArray         (machineJ.displays,     `${propLabel}.displays`,     deserializeMachineDisplay),
    driver      : deserializeMachineDriver (machineJ.driver,       `${propLabel}.driver`      ),
  };
}

function deserializeMachineDisplay(sDisplay: TJSONValue, propLabel: string): IMachineDisplay {
  const displayJ = deserializeObject(sDisplay, propLabel);
  return {
    tag     : deserializeStringOptional      (displayJ.tag,      `${propLabel}.tag`     ),
    type    : displayTypeEnum.deserialize    (displayJ.type,     `${propLabel}.type`    ),
    rotate  : displayRotationEnum.deserialize(displayJ.rotate,   `${propLabel}.rotate`  ),
    flipx   : deserializeBoolean             (displayJ.flipx,    `${propLabel}.flipx`   ),
    width   : deserializeNumberOptional      (displayJ.width,    `${propLabel}.width`   ),
    height  : deserializeNumberOptional      (displayJ.height,   `${propLabel}.height`  ),
    refresh : deserializeNumber              (displayJ.refresh,  `${propLabel}.refresh` ),
    pixclock: deserializeNumberOptional      (displayJ.pixclock, `${propLabel}.pixclock`),
    htotal  : deserializeNumberOptional      (displayJ.htotal,   `${propLabel}.htotal`  ),
    hbend   : deserializeNumberOptional      (displayJ.hbend,    `${propLabel}.hbend`   ),
    hbstart : deserializeNumberOptional      (displayJ.hbstart,  `${propLabel}.hbstart` ),
    vtotal  : deserializeNumberOptional      (displayJ.vtotal,   `${propLabel}.vtotal`  ),
    vbend   : deserializeNumberOptional      (displayJ.vbend,    `${propLabel}.vbend`   ),
    vbstart : deserializeNumberOptional      (displayJ.vbstart,  `${propLabel}.vbstart` ),
  };
}

function deserializeMachineDriver(sDriver: TJSONValue, propLabel: string): IMachineDriver {
  const driverJ = deserializeObject(sDriver, propLabel);
  return {
    status          : machineDriverStatusEnum.deserialize         (driverJ.status,           `${propLabel}.status`          ),
    emulation       : machineDriverStatusEnum.deserialize         (driverJ.emulation,        `${propLabel}.emulation`       ),
    color           : machineDriverStatusEnum.deserialize         (driverJ.color,            `${propLabel}.color`           ),
    sound           : machineDriverStatusEnum.deserialize         (driverJ.sound,            `${propLabel}.sound`           ),
    graphic         : machineDriverStatusEnum.deserialize         (driverJ.graphic,          `${propLabel}.graphic`         ),
    drivercocktail  : deserializeOptional                         (driverJ.drivercocktail,   `${propLabel}.drivercocktail`,   machineDriverStatusEnum.deserialize),
    driverprotection: deserializeOptional                         (driverJ.driverprotection, `${propLabel}.driverprotection`, machineDriverStatusEnum.deserialize),
    savestate       : machineDriverSaveStateStatusEnum.deserialize(driverJ.savestate,        `${propLabel}.savestate`       ),
  };
}