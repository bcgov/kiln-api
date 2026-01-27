import z from 'zod';
import axios from 'axios';
import {
  SaveData,
  FormDefinition,
  FormExceptions,
  formExceptionSchema,
} from '../../schema/form';
import { FieldValue, GroupValue } from '../../schema/formElements';
import { create } from 'xmlbuilder2';

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
  saveData: SaveData
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
  const flatSaveData = flattenSaveData(saveData, outerWrappers);

  const flatAddFields = flattenSaveData(exceptionsDictionary.addFields);
  const flatWrapperTags = exceptionsDictionary.wrapperTags.flatMap((tag) =>
    flattenSaveData(tag)
  );

  const exceptedSaveData = pipeSaveData(
    flatSaveData,
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
  return xml.end({ prettyPrint: true });
}

async function getExceptionsDictionary(formId: string) {
  const formExceptionsEndpoint =
    process.env.FORM_EXCEPTION_DICTIONARY_ENDPOINT_URL;
  if (!formExceptionsEndpoint) {
    throw new Error('FORM_EXCEPTION_DICTIONARY_ENDPOINT_URL is not defined');
  }
  try {
    const response = await axios.get(
      `${formExceptionsEndpoint}/${formId}.json`
    );
    return formExceptionSchema.safeParse(response.data);
  } catch (error) {
    console.log(error);
    return false;
  }
}

function isNestedSaveData(
  fieldValue: FieldValue | GroupValue | SaveData
): fieldValue is SaveData {
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

// type FlatSaveItemType = 'container' | 'repeater' | 'field';
type FlatSaveData = {
  uuid: string;
  parents: string[];
  // type: FlatSaveItemType;
  value: FieldValue;
  // children?: string[];
}[];
function flattenSaveData(
  saveData: SaveData,
  parents: string[] = []
): FlatSaveData {
  return Object.entries(saveData).reduce<FlatSaveData>((acc, [key, value]) => {
    if (isNestedSaveData(value)) {
      return [...acc, ...flattenSaveData(value, [...parents, key])];
    }
    if (isGroupValue(value)) {
      const groupItems = value.flatMap((v, i) =>
        flattenSaveData(v, [...parents, `${key}-List`, `${key}@${i}`])
      );
      return [...acc, ...groupItems];
    }
    const item = {
      uuid: key,
      parents,
      value,
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

// TODO: check if wrappers targetting a repeater should go outside the -List or the items (currently latter)
function applyWrapperTags(wrapperTags: FlatSaveData) {
  return (saveData: FlatSaveData) => {
    let draftSaveData = saveData;
    for (const wItem of wrapperTags) {
      draftSaveData = draftSaveData.map((dItem) => {
        // if item is directly found in wrapperTags, update parents
        if (dItem.uuid === wItem.uuid) {
          return {
            ...dItem,
            parents: [...dItem.parents, ...wItem.parents],
          };
        }
        // if item has wItem as a parent, splice the wrapperTags before it
        const pId = dItem.parents.findIndex(
          (pId) => pId.split('@')[0] === wItem.uuid
        );
        if (pId !== -1) {
          // parents: ['a', __, 'pId', 'b', 'c']
          return {
            ...dItem,
            parents: [
              ...dItem.parents.slice(0, pId),
              ...wItem.parents,
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
        return item;
      }
      const oValue = oItem.values.find((v) => v.value === item.value)?.override;
      return {
        ...item,
        value: oValue ?? item.value,
      };
    });
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

function unflattenSaveData(flatData: FlatSaveData): SaveData {
  const result: Record<string, FieldValue | GroupValue | SaveData> = {};

  for (const { uuid, parents, value } of flatData) {
    let current: Record<string, FieldValue | GroupValue | SaveData> = result;

    for (const parent of parents) {
      // Check if this parent has an @index pattern (e.g., "container-1-...@0")
      // const atIndexMatch = parent.match(/^(.+)@(\d+)$/);
      const [parentId, parentIndex] = parent.split('@');

      if (parentIndex) {
        // This is a repeater, which should be constructed like {uuid: containerFields[]}
        // this results in xml builder creating sibling tags with the same name

        const index = parseInt(parentIndex, 10);

        if (!Array.isArray(current[parentId])) {
          current[parentId] = [];
        }

        if (!current[parentId][index]) {
          (current[parentId] as SaveData[])[index] = {};
        }

        current = (current[parentId] as SaveData[])[index] as Record<
          string,
          FieldValue | GroupValue | SaveData
        >;
      } else {
        // Regular parent key without @index pattern
        if (!current[parent]) {
          current[parent] = {};
        }
        current = current[parent] as Record<
          string,
          FieldValue | GroupValue | SaveData
        >;
      }
    }

    // Set the final value at the uuid key
    current[uuid] = value;
  }

  return result;
}
