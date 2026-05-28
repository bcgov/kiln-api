import z from 'zod';
import axios from 'axios';
import {
  SaveFieldData,
  FormDefinition,
  FormExceptions,
  formExceptionSchema,
} from '../../schema/form';
import {
  ContainerElement,
  ElementType,
  FieldValue,
  FormElement,
  GroupValue,
} from '../../schema/formElements';
import { create } from 'xmlbuilder2';
import L from '../../common/logger';

// truncate ids
// remove elements if in omitFields
// wrap repeater children with new `${containerid}-List`
// if element id found in leaf of wrapperTags, replace with copy nested with parents or merge if parents already exist
// add fields in addFields including wrapping tags, create new or merge with existing tags
// override values with matched ids in overrideFields

/**
 * Prepares save data for ICM, first applying any form exceptions, then converting to XML.
 */
export default async function buildForICM(
  formDefinition: FormDefinition,
  saveData: SaveFieldData,
  prettyPrint = false
): Promise<string> {
  // fetch form exceptions from endpoint
  const exceptionsDictionaryResult = await getExceptionsDictionary(
    formDefinition.form_id
  );

  if (exceptionsDictionaryResult && exceptionsDictionaryResult.error) {
    throw new Error(
      'Invalid exeption schema: ' +
        z.prettifyError(exceptionsDictionaryResult.error)
    );
  }

  const exceptionsDictionary: FormExceptions = exceptionsDictionaryResult
    ? exceptionsDictionaryResult.data
    : {
        rootName: '',
        subRoots: [],
        wrapperTags: [],
        addFields: {},
        omitFields: [],
        overrideFields: [],
      };

  const outerWrappers = [
    exceptionsDictionary.rootName || 'root',
    ...exceptionsDictionary.subRoots,
  ];

  const elementRecord = flattenElements(formDefinition.elements);

  const flatSaveData = flattenSaveData(saveData, outerWrappers, elementRecord);

  const flatAddFields = flattenSaveData(exceptionsDictionary.addFields);
  const flatWrapperTags = exceptionsDictionary.wrapperTags.flatMap((tag) =>
    flattenSaveData(tag)
  );

  const exceptedSaveData = pipeSaveData(
    flatSaveData,
    (saveData) => saveData.filter((item) => item.type !== 'text-info'),
    applyWrapperTags(flatWrapperTags),
    applyOmitFields(exceptionsDictionary.omitFields),
    applyOverrideFields(exceptionsDictionary.overrideFields),
    applyAddFields(flatAddFields, outerWrappers),
    applyTruncateTags()
  );

  const xml = create(
    { version: '1.0', keepNullNodes: true },
    unflattenSaveData(exceptedSaveData)
  );
  return xml.end({ prettyPrint });
}

async function getExceptionsDictionary(formId: string) {
  const formExceptionsEndpoint =
    process.env.FORM_EXCEPTION_DICTIONARY_ENDPOINT_URL;
  if (!formExceptionsEndpoint) {
    L.warn('FORM_EXCEPTION_DICTIONARY_ENDPOINT_URL is not defined');
    return false;
  }
  try {
    const response = await axios.get(
      `${formExceptionsEndpoint}/${formId}.json`
    );
    return formExceptionSchema.safeParse(response.data);
  } catch (error) {
    L.warn(
      { levels: ['debug'] },
      `Exception dictionary for form ${formId} not found: ${error.code}`
    );
    return false;
  }
}

type ElementRecord = Record<string, Exclude<FormElement, ContainerElement>>;
function flattenElements(elements: FormDefinition['elements']): ElementRecord {
  let records: ElementRecord = {};
  elements.forEach((e) => {
    if (e.type === 'container' && e.children) {
      records = { ...records, ...flattenElements(e.children) };
    } else if (e.type !== 'container') {
      records[e.uuid] = e;
    }
  });
  return records;
}

function isNestedSaveData(
  fieldValue: FieldValue | GroupValue | SaveFieldData
): fieldValue is SaveFieldData {
  return (
    typeof fieldValue === 'object' &&
    fieldValue !== null &&
    !Array.isArray(fieldValue)
  );
}

function isGroupValue(
  fieldValue: FieldValue | GroupValue
): fieldValue is GroupValue {
  return (
    Array.isArray(fieldValue) &&
    fieldValue.length > 0 &&
    typeof fieldValue[0] === 'object' &&
    fieldValue[0] !== null
  );
}

type FlatSaveData = {
  uuid: string;
  parents: string[];
  type?: ElementType;
  value: FieldValue;
}[];
function flattenSaveData(
  saveData: SaveFieldData,
  parents: string[] = [],
  elementRecord?: ElementRecord
): FlatSaveData {
  return Object.entries(saveData).reduce<FlatSaveData>((acc, [key, value]) => {
    if (isNestedSaveData(value)) {
      return [
        ...acc,
        ...flattenSaveData(value, [...parents, key], elementRecord),
      ];
    }
    if (isGroupValue(value)) {
      const groupItems = value.flatMap((v, i) =>
        flattenSaveData(
          v,
          [...parents, `${key}-List`, `${key}@${i}`],
          elementRecord
        )
      );
      return [...acc, ...groupItems];
    }
    if (elementRecord && elementRecord[key]?.type === 'checkbox-group') {
      const values = Array.isArray(value) ? value : [value?.toString()];
      // create single checkbox input for each option in the field, whether or not its checked
      const items = elementRecord[key].options.map((o) => ({
        uuid: `${key}-${o.value}`,
        parents,
        value: values.includes(o.value),
        type: 'checkbox-input' as ElementType,
      }));
      return [...acc, ...items];
    }
    // technically savedata can still be an array and not be a checkbox group in the element map
    // in those cases xml builder will create sibling tags with the same name
    const item = {
      uuid: key,
      parents,
      value,
      type: elementRecord ? elementRecord[key]?.type : undefined,
    };
    return [...acc, item];
  }, []);
}

const pipeSaveData = (
  saveData: FlatSaveData,
  ...fns: ((saveData: FlatSaveData) => FlatSaveData)[]
) => fns.reduce((acc, fn) => fn(acc), saveData);

function applyOmitFields(omitFields: FormExceptions['omitFields']) {
  return (saveData: FlatSaveData) =>
    saveData.filter((item) =>
      omitFields.findIndex((omitted) => omitted === item.uuid) === -1
        ? true
        : false
    );
}

function applyWrapperTags(wrapperTags: FlatSaveData) {
  return (saveData: FlatSaveData) => {
    let draftSaveData = saveData;
    for (const wItem of wrapperTags) {
      // field value of wrapperTags is a depth override
      // if set, use only the first value+1 wrapping elements
      const wrappers =
        typeof wItem.value === 'number'
          ? wItem.parents.slice(0, wItem.value + 1)
          : wItem.parents;
      draftSaveData = draftSaveData.map((dItem) => {
        // if item is directly found in wrapperTags, update parents
        if (dItem.uuid === wItem.uuid) {
          return {
            ...dItem,
            parents: [...dItem.parents, ...wrappers],
          };
        }
        // if item has wItem as a parent, splice the wrapperTags before it
        const pId = dItem.parents.findIndex(
          (pId) => pId.split('-List')[0] === wItem.uuid
        );
        if (pId !== -1) {
          // parents: ['a', ...wrappers, 'pId', 'b', 'c']
          return {
            ...dItem,
            parents: [
              ...dItem.parents.slice(0, pId),
              ...wrappers,
              ...dItem.parents.slice(pId),
            ],
          };
        }

        return dItem;
      });
    }
    return draftSaveData;
  };
}

// Currently will only work with primitive values as arrays/objects will fail equality check
function applyOverrideFields(overrideFields: FormExceptions['overrideFields']) {
  return (saveData: FlatSaveData) =>
    saveData.map((item) => {
      const oItem = overrideFields?.find((i) => i.uuid === item.uuid);
      if (!oItem) {
        return defaultOverrides(item);
      }
      const oValue = oItem.values.find((v) => v.value === item.value)?.override;
      return {
        ...item,
        value: oValue ?? item.value,
      };
    });
}

function defaultOverrides(item: FlatSaveData[number]) {
  // replace checkbox true/false values with Yes/No
  if (item.type === 'checkbox-input') {
    return {
      ...item,
      value: !!item.value ? 'Yes' : 'No',
    };
  }
  // output dates as MM/DD/YYYY
  // DOES NOT work properly with all possible formats in klamm. ex: d/m/y
  if (item.type === 'date-select-input' && typeof item.value === 'string') {
    const date = new Date(item.value);
    if (Number.isNaN(date.valueOf())) {
      return item;
    }
    return {
      ...item,
      value: new Intl.DateTimeFormat('en-US',{
      timeZone: 'UTC',
    }).format(date),
    };
  }
  return item;
}

function applyAddFields(addFields: FlatSaveData, wrappers: string[]) {
  // nest at same level as topmost element
  return (saveData: FlatSaveData) =>
    saveData.concat(
      addFields.map((item) => ({
        ...item,
        parents: [...wrappers, ...item.parents],
      }))
    );
}

function truncateUUID(id: string, uuidTruncatedLength = 8) {
  const uuidPattern =
    /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g;
  return id.replace(uuidPattern, (match) =>
    match.substring(0, uuidTruncatedLength)
  );
}
function applyTruncateTags() {
  return (saveData: FlatSaveData) =>
    saveData.map((item) => ({
      ...item,
      uuid: truncateUUID(item.uuid),
      parents: item.parents.map((pId) => truncateUUID(pId)),
    }));
}

function unflattenSaveData(flatData: FlatSaveData): SaveFieldData {
  const result: Record<string, FieldValue | GroupValue | SaveFieldData> = {};

  for (const { uuid, parents, value } of flatData) {
    let current: Record<string, FieldValue | GroupValue | SaveFieldData> =
      result;

    for (const parent of parents) {
      // Check if this parent has an @index pattern (e.g., "container-1-...@0")
      const [parentId, parentIndex] = parent.split('@');

      if (parentIndex) {
        // This is a repeater, which should be constructed like {uuid: containerFields[]}
        // this results in xml builder creating sibling tags with the same name

        const index = parseInt(parentIndex, 10);

        if (!Array.isArray(current[parentId])) {
          current[parentId] = [];
        }

        if (!current[parentId][index]) {
          (current[parentId] as SaveFieldData[])[index] = {};
        }

        current = (current[parentId] as SaveFieldData[])[index] as Record<
          string,
          FieldValue | GroupValue | SaveFieldData
        >;
      } else {
        // Regular parent key without @index pattern
        if (!current[parent]) {
          current[parent] = {};
        }
        current = current[parent] as Record<
          string,
          FieldValue | GroupValue | SaveFieldData
        >;
      }
    }

    // Set the final value at the uuid key
    current[uuid] = value;
  }

  return result;
}
