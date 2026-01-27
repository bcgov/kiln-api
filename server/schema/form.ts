import * as z from 'zod';
import {
  FieldValue,
  fieldValueSchema,
  formElementUnionSchema,
  GroupValue,
  groupValueSchema,
} from './formElements';

const dataSourceSchema = z.object({
  name: z.string(),
  type: z.string(),
  endpoint: z.string(),
  description: z.string().nullable().optional(),
  params: z.record(z.string(), z.any()).optional(),
  body: z.string().nullable().optional(),
  headers: z.record(z.string(), z.any()).optional(),
  host: z.string().nullable().optional(),
  order: z.number().optional(),
});

const interfaceActionSchema = z.object({
  label: z.string(),
  type: z.string(),
  description: z.string().optional(),
  style: z.string().optional(),
  condition: z.string().optional(),
  order: z.number().optional(),
  actions: z
    .array(
      z.object({
        label: z.string(),
        action_type: z.string(),
        type: z.string(),
        host: z.string().optional(),
        path: z.string().optional(),
        authentication: z.string().optional(),
        headers: z.record(z.string(), z.any()).optional(),
        body: z.record(z.string(), z.any()).optional(),
        params: z.record(z.string(), z.any()).optional(),
        order: z.number().optional(),
      })
    )
    .optional(),
});

const formInterfaceSchema = z.object({
  label: z.string(),
  type: z.string(),
  description: z.string().optional(),
  style: z.string().optional(),
  condition: z.string().optional(),
  actions: z.array(interfaceActionSchema).optional(),
  order: z.number().optional(),
});

const styleAssetSchema = z.object({
  type: z.string(),
  filename: z.string(),
  content: z.string(),
});

const scriptAssetSchema = z.object({
  type: z.string(),
  filename: z.string(),
  content: z.string(),
});

const formVersionDataSchema = z.object({
  form_id: z.number(),
  form_developer: z.any().optional(), // seems to be broken in klaam (outputs {})
  comments: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const pdfTemplateSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  parameters: z.any().optional(),
});

/**
 * Form Definition Schema - matches the output of FormVersionJsonService.generateJson()
 */
export const formDefinitionSchema = z.object({
  name: z.string().optional(),
  form_id: z.string(),
  id: z.string().or(z.number()),
  version: z.string().or(z.number()),
  version_date: z.string().optional(),
  version_date_format: z.string().optional(),
  status: z.string(),
  data: formVersionDataSchema.or(z.tuple([])),
  form_data: formVersionDataSchema.optional(),
  ministry_id: z.string().or(z.number()).nullable().optional(),
  dataSources: z.array(dataSourceSchema),
  interface: z.array(formInterfaceSchema),
  styles: z.array(styleAssetSchema),
  scripts: z.array(scriptAssetSchema),
  elements: z.array(formElementUnionSchema),
  pdfTemplate: pdfTemplateSchema.optional(),
});
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

export interface SaveData {
  [x: string]: SaveData | FieldValue | GroupValue;
}

const addFieldSchema: z.ZodType<SaveData> = z.lazy(() =>
  z.record(z.string(), fieldValueSchema.or(groupValueSchema).or(addFieldSchema))
);

interface WrapperTags {
  [key: string]: number | WrapperTags;
}

const wrapperTagsSchema: z.ZodType<WrapperTags> = z.lazy(() =>
  z.record(z.string(), z.number().or(wrapperTagsSchema))
);

const overrideFieldsSchema = z.array(
  z.object({
    uuid: z.string(),
    values: z.array(
      z.object({
        value: fieldValueSchema,
        override: fieldValueSchema,
      })
    ),
  })
);

export const formExceptionSchema = z.object({
  rootName: z.string(),
  subRoots: z.array(z.string()),
  wrapperTags: z.array(wrapperTagsSchema),
  // allowCheckboxWithNoChange: z.array(z.string()),
  omitFields: z.array(z.string()),
  addFields: addFieldSchema,
  overrideFields: overrideFieldsSchema.optional(),
});
export type FormExceptions = z.infer<typeof formExceptionSchema>;
