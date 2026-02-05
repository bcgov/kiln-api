import * as z from 'zod';

const ElementTypeMap = {
  TextInput: 'text-input',
  TextAreaInput: 'textarea-input',
  NumberInput: 'number-input',
  DateSelectInput: 'date-select-input',
  SelectInput: 'select-input',
  RadioInput: 'radio-input',
  CheckboxInput: 'checkbox-input',
  ButtonInput: 'button-input',
  TextInfo: 'text-info',
  Html: 'html',
  Container: 'container',
} as const;

export type ElementType = (typeof ElementTypeMap)[keyof typeof ElementTypeMap];

export const fieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()), // probably what checkbox list will be
]);
export type FieldValue = z.infer<typeof fieldValueSchema>;
export type GroupValue = Array<Record<string, FieldValue | GroupValue>>;

export const groupValueSchema: z.ZodType<GroupValue> = z.lazy(() =>
  z.array(z.record(z.string(), fieldValueSchema.or(groupValueSchema)))
);

const dataBindingSchema = z.object({
  source: z.string(),
  path: z.string(),
  order: z.number().optional(),
  condition: z.string().nullable().optional(),
});

const fieldOptionSchema = z.object({
  id: z.number(),
  optionable_type: z.string(),
  optionable_id: z.number(),
  label: z.string(),
  order: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  value: z.string(),
  deleted_at: z.string().nullable().optional(),
});

/**
 * Base schema for all form elements
 * Matches the output of FormVersionJsonService.transformElement()
 */
const formElementBaseSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  help_text: z.string().nullable(),
  is_required: z.boolean(),
  visible_web: z.boolean(),
  visible_pdf: z.boolean(),
  custom_visibility: z.string().nullable(),
  is_read_only: z.boolean().or(z.string()).optional(),
  save_on_submit: z.boolean(),
  order: z.number(),
  tags: z.record(z.string(), z.null()).or(z.tuple([])).optional(),
  options: z.array(fieldOptionSchema).or(z.tuple([])).optional(),
  parent_id: z.number().nullable(),
  databindings: z.array(dataBindingSchema).optional(),
});

export const textInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.TextInput),
  attributes: z.object({
    placeholder: z.string().optional(),
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    maskType: z.enum(['custom', 'phone', 'email', 'postal']).optional(),
    mask: z.string().optional(),
    maxCount: z.number().optional(),
    value: z.string().optional(),
  }),
});

export const textareaInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.TextAreaInput),
  attributes: z.object({
    placeholder: z.string().optional(),
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    rows: z.number().optional(),
    cols: z.number().optional(),
    maxCount: z.number().optional(),
    value: z.string().optional(),
  }),
});

export const numberInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.NumberInput),
  attributes: z.object({
    placeholder: z.string().optional(),
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    value: z.number().or(z.string()).optional(), // decimal values are strings (eg "0.00")
    maskType: z.enum(['integer', 'decimal']).optional(),
  }),
});

export const dateSelectInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.DateSelectInput),
  attributes: z.object({
    placeholder: z.string().optional(),
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    minDate: z.string().optional(),
    maxDate: z.string().optional(),
    dateFormat: z.string().optional(),
  }),
});

export const selectInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.SelectInput),
  attributes: z.object({
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    defaultSelected: z.string().nullable().optional(),
    options: z.array(fieldOptionSchema).or(z.tuple([])).optional(), // duplicate of element.option
  }),
});

export const radioInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.RadioInput),
  attributes: z.object({
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    defaultSelected: z.string().nullable().optional(),
    labelPosition: z.enum(['left', 'right']).optional(),
    orientation: z.enum(['horizontal', 'vertical']).optional(),
    options: z.array(fieldOptionSchema).or(z.tuple([])).optional(),
  }),
});

export const checkboxInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.CheckboxInput),
  attributes: z.object({
    labelText: z.string().optional(),
    hideLabel: z.boolean().optional(),
    enableVarSub: z.boolean().optional(),
    defaultChecked: z.boolean().optional(),
  }),
});

export const buttonInputElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.ButtonInput),
  attributes: z.object({
    text: z.string().optional(),
    kind: z
      .enum(['primary', 'secondary', 'tertiary', 'danger', 'ghost'])
      .optional(),
    enableVarSub: z.boolean().optional(),
  }),
});

export const textInfoElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.TextInfo),
  attributes: z.object({
    content: z.string().optional(),
  }),
});

export const htmlElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.Html),
  attributes: z.object({
    htmlContent: z.string().optional(),
  }),
});

export const containerElementSchema = formElementBaseSchema.extend({
  type: z.literal(ElementTypeMap.Container),
  attributes: z.object({
    containerType: z
      .enum(['section', 'fieldset', 'tab', 'repeating'])
      .optional(),
    isRepeatable: z.boolean().optional(),
    repeaterItemLabel: z.string().optional(),
    legend: z.string().optional(),
    enableVarSub: z.boolean().optional(),
    level: z.number().optional(),
  }),
  get children(): z.ZodOptional<
    z.ZodArray<
      z.ZodDiscriminatedUnion<
        [
          typeof textInputElementSchema,
          typeof textareaInputElementSchema,
          typeof numberInputElementSchema,
          typeof dateSelectInputElementSchema,
          typeof selectInputElementSchema,
          typeof radioInputElementSchema,
          typeof checkboxInputElementSchema,
          typeof buttonInputElementSchema,
          typeof textInfoElementSchema,
          typeof htmlElementSchema,
          typeof containerElementSchema
        ]
      >
    >
  > {
    return z.array(formElementUnionSchema).optional();
  },
});

export const formElementUnionSchema = z.discriminatedUnion('type', [
  textInputElementSchema,
  textareaInputElementSchema,
  numberInputElementSchema,
  dateSelectInputElementSchema,
  selectInputElementSchema,
  radioInputElementSchema,
  checkboxInputElementSchema,
  buttonInputElementSchema,
  textInfoElementSchema,
  htmlElementSchema,
  containerElementSchema,
]);

export type FormElement = z.infer<typeof formElementUnionSchema>;
export type TextInputElement = z.infer<typeof textInputElementSchema>;
export type TextareaInputElement = z.infer<typeof textareaInputElementSchema>;
export type NumberInputElement = z.infer<typeof numberInputElementSchema>;
export type DateSelectInputElement = z.infer<
  typeof dateSelectInputElementSchema
>;
export type SelectInputElement = z.infer<typeof selectInputElementSchema>;
export type RadioInputElement = z.infer<typeof radioInputElementSchema>;
export type CheckboxInputElement = z.infer<typeof checkboxInputElementSchema>;
export type ButtonInputElement = z.infer<typeof buttonInputElementSchema>;
export type TextInfoElement = z.infer<typeof textInfoElementSchema>;
export type HTMLElement = z.infer<typeof htmlElementSchema>;
export type ContainerElement = z.infer<typeof containerElementSchema>;
