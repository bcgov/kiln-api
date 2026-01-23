import z from 'zod';
import axios from 'axios';
import {
  FormDefinition,
  formExceptions,
  formExceptionSchema,
} from '../../schema/form';
import { FieldValue, GroupValue } from '../../schema/formElements';
import { create } from 'xmlbuilder2';

type SaveData = Record<string, FieldValue | GroupValue>;
interface WrappedSaveData {
  [x: string]: WrappedSaveData | SaveData;
}

/**
 * Prepares save data for ICM, first applying any form exceptions, then converting to XML.
 */
export default async function buildForICM(
  formDefinition: FormDefinition,
  saveData: SaveData
): Promise<string> {
  // fetch form exceptions from endpoint
  const exceptionsDictionary = await getExceptionsDictionary(
    formDefinition.form_id
  );

  const exceptedSaveData = truncateKeys(
    exceptionsDictionary
      ? applyFormExceptions(saveData, exceptionsDictionary)
      : saveData
  );

  console.log(
    exceptionsDictionary
      ? exceptionsDictionary.rootName
      : 'No dictionary loaded'
  );

  const wrappedJson = exceptionsDictionary
    ? wrapJson(
        exceptionsDictionary.rootName,
        exceptionsDictionary.subRoots,
        exceptedSaveData
      )
    : {
        root: exceptedSaveData,
      };

  const xml = create(
    { version: '1.0' },
    {
      ...wrappedJson,
    }
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
    if (response.status !== 200) {
      return false;
    }
    const result = formExceptionSchema.safeParse(response.data);
    if (result.error) {
      throw new Error(
        'Invalid exeption schema: ' + z.prettifyError(result.error)
      );
    }
    return result.data;
  } catch (error) {
    return false;
  }
}

function applyFormExceptions(
  saveData: SaveData,
  formExceptions: formExceptions
) {
  return saveData;
}

function truncateKeys(saveData: SaveData) {
  return saveData;
}

function wrapJson(
  root: string,
  subRoots: string[],
  saveData: SaveData
): WrappedSaveData {
  const subWrapped = subRoots
    .reverse()
    .reduce<WrappedSaveData | SaveData>((prev, current) => {
      return {
        [current]: prev,
      };
    }, saveData);
  return {
    [root || 'root']: subWrapped,
  };
}
