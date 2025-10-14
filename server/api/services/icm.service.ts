import L from '../../common/logger';
import { ICMClient } from './icm.client';

interface SaveICMDataPayload {
  attachmentId: string;
  OfficeName: string;
  savedForm: any;
  token?: string;
  username?: string;
}

interface SaveICMDataRequest {
  attachmentId: string;
  OfficeName: string;
  username?: string;
  savedForm: any;
}

interface SaveICMDataResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

interface LoadICMDataPayload {
  token?: string;
  username?: string;
  originalServer?: string;
  [key: string]: any;
}

interface LoadICMDataRequest {
  username?: string;
  originalServer?: string;
  [key: string]: any;
}

interface UnlockICMDataPayload {
  token?: string;
  username?: string;
  [key: string]: any;
}

interface UnlockICMDataRequest {
  username?: string;
  [key: string]: any;
}

interface LoadSavedJsonPayload {
  [key: string]: any;
}

interface LoadSavedJsonRequest {
  [key: string]: any;
}

interface GenerateFormPayload {
  token?: string;
  username?: string;
  originalServer?: string;
  [key: string]: any;
}

interface GenerateFormRequest {
  username?: string;
  originalServer?: string;
  [key: string]: any;
}

interface PdfRenderPayload {
  [key: string]: any;
}

interface PdfRenderRequest {
  pdfTemplateId: string;
  [key: string]: any;
}

interface ICMDataResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

interface PdfRenderResult {
  success: boolean;
  data?: Buffer; // PDF binary data
  error?: string;
  status?: number;
}

interface LoadPortalFormRequest {
  id: string; // portal token required by Comm Layer
}

interface LoadPortalFormResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

interface SubmitButtonActionPayload {
  tokenId: string;
  savedForm: string;
  config: any;
}

interface SubmitButtonActionRequest {
  tokenId: string;
  savedForm: string;
  config: any;
}

interface SaveICMDataResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

interface SubmitButtonActionResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

interface SaveFormDataRequest {
  action: 'save' | 'save_and_close';
  formState: Record<string, any>;
  groupState?: Record<string, any[]>;
  formDefinition: any;
  metadata?: Record<string, any>;
  items: any[];
  sessionParams: Record<string, any>;
}

interface SaveFormDataResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

interface Item {
  uuid: string;
  type: string;
  children?: Item[];
  attributes?: { [key: string]: any };
  visible_web?: boolean;
  visible_pdf?: boolean;
  custom_visibility?: string;
  save_on_submit?: boolean;
}

interface SavedData {
  data: Record<string, any>;
  form_definition: any;
  metadata: Record<string, any>;
}

interface SaveForPortalActionRequest {
  tokenId: string;
  savedForm: string;
}
interface SubmitPortalActionRequest {
  tokenId: string;
}
interface CancelPortalActionRequest {
  tokenId: string;
}

export class ICMService {
  private icmClient: ICMClient;

  constructor() {
    this.icmClient = new ICMClient();
  }

  private handleError(
    error: unknown,
    errorMessage: string
  ): SaveICMDataResult | ICMDataResult {
    const errorDetail =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error occurred';

    L.error(errorMessage, error);

    return {
      success: false,
      error: `${errorMessage}: ${errorDetail}`,
      status: 500,
    };
  }

  private async handleResponse(
    response: any,
    defaultErrorMessage: string
  ): Promise<ICMDataResult | SaveICMDataResult> {
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        data: result,
      };
    } else {
      const errorData = (await response.json().catch(() => ({}))) as any;
      const errorMessage = errorData?.error || defaultErrorMessage;
      L.error('ICMClient API Error:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        status: response.status,
      };
    }
  }

  private async handleBlobResponse(
    response: any,
    defaultErrorMessage: string
  ): Promise<PdfRenderResult> {
    if (response.ok) {
      const blob = await response.blob();
      // Convert buffer to Buffer if needed
      const pdfData = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
      L.info('PDF generated successfully');
      return {
        success: true,
        data: pdfData,
      };
    } else {
      L.error('PDF generation failed:', defaultErrorMessage);
      return {
        success: false,
        error: defaultErrorMessage,
        status: response.status,
      };
    }
  }

  async saveICMData(
    data: SaveICMDataRequest,
    token?: string
  ): Promise<SaveICMDataResult> {
    try {
      const { attachmentId, OfficeName, username, savedForm } = data;

      if (!attachmentId || !OfficeName || !savedForm) {
        return {
          success: false,
          error:
            'Missing required fields: attachmentId, OfficeName, or savedForm',
          status: 400,
        };
      }

      const payload: SaveICMDataPayload = {
        attachmentId,
        OfficeName,
        savedForm,
      };

      if (token) {
        payload.token = token;
      } else if (username?.trim()) {
        payload.username = username;
      } else {
        L.warn('No authentication provided for ICM data save');
      }

      const response = await this.icmClient.saveICMData(payload);
      return this.handleResponse(
        response,
        'Error saving form. Please try again.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to save ICM data');
    }
  }

  async loadICMData(
    data: LoadICMDataRequest,
    token?: string
  ): Promise<ICMDataResult> {
    try {
      const { username, originalServer, ...params } = data;

      const payload: LoadICMDataPayload = {
        ...params,
      };

      if (token) {
        payload.token = token;
      } else if (username?.trim()) {
        payload.username = username;
      } else {
        L.warn('No authentication provided for ICM data load');
        return {
          success: false,
          error:
            'Authentication required: either token or username must be provided',
          status: 401,
        };
      }

      const response = await this.icmClient.loadICMData(
        payload,
        originalServer
      );
      return this.handleResponse(
        response,
        'Error loading form. Please try again.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to load ICM data');
    }
  }

  async unlockICMData(
    data: UnlockICMDataRequest,
    token?: string
  ): Promise<ICMDataResult> {
    try {
      const { username, ...params } = data;

      const payload: UnlockICMDataPayload = {
        ...params,
      };

      if (token) {
        payload.token = token;
      } else if (username?.trim()) {
        payload.username = username;
      } else {
        L.warn('No authentication provided for ICM unlock operation');
        return {
          success: false,
          error:
            'Authentication required: either token or username must be provided',
          status: 401,
        };
      }

      const response = await this.icmClient.unlockICMData(payload);
      return this.handleResponse(
        response,
        'Error unlocking ICM form. Please try again.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to unlock ICM data');
    }
  }

  async loadSavedJson(data: LoadSavedJsonRequest): Promise<ICMDataResult> {
    try {
      const payload: LoadSavedJsonPayload = {
        ...data,
      };

      const response = await this.icmClient.loadSavedJson(payload);
      return this.handleResponse(
        response,
        'Error loading saved JSON. Please try again.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to load saved JSON');
    }
  }

  async generateForm(
    data: GenerateFormRequest,
    token?: string
  ): Promise<ICMDataResult> {
    try {
      const { username, originalServer, ...params } = data;

      const payload: GenerateFormPayload = {
        ...params,
      };

      if (token) {
        payload.token = token;
      } else if (username?.trim()) {
        payload.username = username;
      } else {
        L.warn('No authentication provided for form generation');
        return {
          success: false,
          error:
            'Authentication required: either token or username must be provided',
          status: 401,
        };
      }

      const response = await this.icmClient.generateForm(
        payload,
        originalServer
      );
      return this.handleResponse(
        response,
        'Error generating form. Please try again.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to generate form');
    }
  }

  async pdfRender(data: PdfRenderRequest): Promise<PdfRenderResult> {
    try {
      const { pdfTemplateId, ...formData } = data;

      if (!pdfTemplateId) {
        return {
          success: false,
          error: 'Missing required field: pdfTemplateId',
          status: 400,
        };
      }

      const PDF_TEMPLATE_ID_REGEX = /^[A-Za-z0-9_\\.@-]+$/;
      if (!PDF_TEMPLATE_ID_REGEX.test(pdfTemplateId)) {
        return {
          success: false,
          error: 'Invalid PDF template ID format',
          status: 400,
        };
      }

      const payload: PdfRenderPayload = {
        ...formData,
      };

      const response = await this.icmClient.pdfRender(payload, pdfTemplateId);
      return this.handleBlobResponse(
        response,
        'Error generating PDF. Please try again.'
      );
    } catch (error) {
      return this.handleError(
        error,
        'Failed to generate PDF'
      ) as PdfRenderResult;
    }
  }

  async generatePortalForm(
    data: { username?: string; originalServer?: string;[k: string]: any },
    token?: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    status?: number;
  }> {
    try {
      const { username, originalServer, ...params } = data || {};
      const payload: Record<string, any> = { ...params };

      if (token && String(token).trim()) {
        payload.token = token;
      } else if (username && String(username).trim()) {
        payload.username = username;
      } else {
        return {
          success: false,
          status: 401,
          error:
            'Authentication required: either token or username must be provided',
        };
      }

      const resp = await this.icmClient.generatePortalForm(
        payload,
        originalServer
      );

      return this.handleResponse(
        resp,
        'Error generating portal form. Please try again.'
      );
    } catch (err) {
      return this.handleError(err, 'Failed to generate portal form');
    }
  }

  async generateNewTemplate(
    data: Record<string, unknown>,
    originalServer?: string
  ): Promise<ICMDataResult> {
    try {

      // check required fields
      const attachmentId = (data['attachmentId'] ?? data['AttachmentId']) as string | undefined;
      const area = (data['Area'] ?? data['area']) as string | undefined;
      const formId = (data['FormId'] ?? data['formId']) as string | undefined;

      if (!attachmentId?.trim()) return { success: false, status: 400, error: 'attachmentId is required' };
      if (!area?.trim()) return { success: false, status: 400, error: 'Area is required' };
      if (!formId?.trim()) return { success: false, status: 400, error: 'FormId (or formId) is required' };

      // call CommLayer
      const response = await this.icmClient.generateNewTemplate(data, originalServer);

      return this.handleResponse(
        response,
        'The form cannot be generated.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to generate new template');
    }
  }


  async bindFormData(rawFormData: any): Promise<any> {
    try {
      if (!rawFormData) {
        return {
          form_definition: null,
          data: null,
          metadata: null,
        };
      }

      const formDefinition = rawFormData.form_definition;
      const savedData = rawFormData.data;
      const metadata = rawFormData.metadata;

      if (!savedData || !formDefinition) {
        return {
          form_definition: formDefinition,
          data: savedData,
          metadata: metadata,
        };
      }

      const boundFormDefinition = this.applyDataBinding(
        formDefinition,
        savedData
      );

      return {
        form_definition: boundFormDefinition,
        data: savedData,
        metadata: metadata,
        bound: true,
      };
    } catch (error) {
      L.error('Error binding form data:', error);
      return this.handleError(error, 'Failed to bind form data');
    }
  }

  private applyDataBinding(formDefinition: any, data: any): any {
    if (!formDefinition || !data) return formDefinition;

    const boundForm = JSON.parse(JSON.stringify(formDefinition));
    const items = boundForm.data?.items || boundForm.elements || [];
    this.bindValuesToItems(items, data);

    return boundForm;
  }

  private bindValuesToItems(items: any[], dataMap: Record<string, any>): void {
    if (!Array.isArray(items)) return;

    for (const item of items) {
      const lookupKey = item.id || item.uuid;
      const dataValue = dataMap[lookupKey];

      if (item.attributes?.isRepeatable && Array.isArray(dataValue)) {
        item.repeaterData = dataValue;
      }

      if (item.children && Array.isArray(item.children)) {
        this.bindValuesToItems(item.children, dataMap);
      }

      if (dataValue !== undefined && !item.attributes?.isRepeatable) {
        this.setFieldValue(item, dataValue);
      }
    }
  }

  private setFieldValue(item: any, value: any): void {
    if (!item.attributes) {
      item.attributes = {};
    }

    const fieldType = item.type;

    switch (fieldType) {
      case 'checkbox-input':
        const boolVal = this.coerceBoolean(value);
        item.value = boolVal;
        item.attributes.checked = boolVal;
        break;

      case 'radio-input':
      case 'select-input':
        const strVal = value == null ? '' : String(value);
        item.value = strVal;
        item.attributes.selected = strVal;
        break;

      case 'number-input':
        const numVal = this.coerceNumber(value);
        item.value = numVal;
        item.attributes.value = numVal;
        break;

      case 'date-select-input':
        const dateVal = this.normalizeDate(value);
        item.value = dateVal || '';
        item.attributes.value = dateVal;
        break;

      default:
        const defaultVal = value == null ? '' : String(value);
        item.value = defaultVal;
        item.attributes.value = defaultVal;
    }
  }

  private coerceBoolean(v: any): boolean {
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    return ['true', '1', 'yes', 'on', 'y'].includes(s);
  }

  private coerceNumber(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  private normalizeDate(v: any): any {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return v.slice(0, 10);
    }
    return v;
  }

  private isFieldVisible(
    item: Item,
    mode: 'web' | 'pdf' = 'web',
    formState?: Record<string, any>
  ): boolean {
    let visible =
      mode === 'pdf' ? item.visible_pdf !== false : item.visible_web !== false;

    if (item.custom_visibility && typeof item.custom_visibility === 'string') {
      try {
        const fn = new Function(
          'formState',
          item.custom_visibility.replace(/^{|}$/g, '')
        );
        visible = !!fn(formState || {});
      } catch (e) {
        // fallback to previous visible value
      }
    }
    return visible;
  }

  private shouldFieldBeIncludedForSaving(
    item: Item,
    mode: 'web' | 'pdf' = 'web',
    formState?: Record<string, any>
  ): boolean {
    return this.isFieldVisible(item, mode, formState) || !!item.save_on_submit;
  }

  private createSavedData(ctx: {
    formState: Record<string, any>;
    groupState?: Record<string, any[]>;
    items: Item[];
    formDefinition: any;
    metadata?: Record<string, any>;
  }): SavedData {
    const {
      formState,
      groupState = {},
      items,
      formDefinition,
      metadata = {},
    } = ctx;
    const saveFieldData: Record<string, any> = {};

    const processItems = (list: Item[], state: Record<string, any>) => {
      for (const item of list) {
        if (item.type === 'container' && item.children) {
          const isRepeatable = item.attributes?.isRepeatable === true;

          if (isRepeatable) {
            const explicitRows = groupState[item.uuid];
            if (Array.isArray(explicitRows) && explicitRows.length > 0) {
              const rows = explicitRows
                .map((rowState) => {
                  const row: Record<string, any> = {};
                  for (const child of item.children || []) {
                    if (
                      rowState &&
                      typeof rowState === 'object' &&
                      !Array.isArray(rowState) &&
                      this.shouldFieldBeIncludedForSaving(
                        child,
                        'web',
                        rowState as Record<string, any>
                      ) &&
                      (rowState as Record<string, any>)[child.uuid] !==
                      undefined
                    ) {
                      row[child.uuid] = (rowState as Record<string, any>)[
                        child.uuid
                      ];
                    }
                  }
                  return Object.keys(row).length > 0 ? row : null;
                })
                .filter(Boolean) as Record<string, any>[];

              if (rows.length > 0) {
                saveFieldData[item.uuid] = rows;
              }
              continue;
            }

            const childUuids = new Set(
              (item.children || []).map((c) => c.uuid)
            );
            const prefix = `${item.uuid}-`;
            const byGroupId = new Map<string, Record<string, any>>();

            for (const key of Object.keys(state)) {
              if (!key.startsWith(prefix)) continue;

              const matchedChildUuid = [...childUuids].find((cu) =>
                key.endsWith(`-${cu}`)
              );
              if (!matchedChildUuid) continue;

              const rest = key.slice(prefix.length);
              const suffix = `-${matchedChildUuid}`;
              const groupId = rest.slice(0, rest.length - suffix.length);

              const groupObj = byGroupId.get(groupId) ?? {};
              groupObj[matchedChildUuid] = state[key];
              byGroupId.set(groupId, groupObj);
            }

            const inferredRows = [...byGroupId.values()].filter(
              (row) => Object.keys(row).length > 0
            );
            if (inferredRows.length > 0) {
              saveFieldData[item.uuid] = inferredRows;
            }
          } else {
            for (const child of item.children) {
              if (child.type === 'container' && child.children) {
                processItems([child], state);
              } else if (
                this.shouldFieldBeIncludedForSaving(child, 'web', state)
              ) {
                const val = state[child.uuid];
                if (val !== undefined) {
                  saveFieldData[child.uuid] = val;
                }
              }
            }
          }
        } else {
          if (this.shouldFieldBeIncludedForSaving(item, 'web', state)) {
            const val = state[item.uuid];
            if (val !== undefined) {
              saveFieldData[item.uuid] = val;
            }
          }
        }
      }
    };

    processItems(items, formState);

    const updatedMetadata = {
      ...metadata,
      updated_date: new Date().toISOString(),
    };

    const template: any = {
      ...formDefinition,
      id: formDefinition.id ?? '',
      version: formDefinition.version ?? '',
      status: formDefinition.status ?? '',
      data: formDefinition.data ?? {},
      created_by: formDefinition.created_by ?? '',
      created_date: formDefinition.created_date ?? '',
      updated_by: formDefinition.updated_by ?? '',
      updated_date: formDefinition.updated_date ?? '',
    };

    return {
      data: saveFieldData,
      form_definition: template,
      metadata: updatedMetadata,
    };
  }

  async saveFormData(
    data: SaveFormDataRequest,
    token?: string
  ): Promise<SaveFormDataResult> {
    try {
      const {
        action,
        formState,
        groupState,
        formDefinition,
        metadata,
        items,
        sessionParams,
      } = data;

      if (!action || !formState || !formDefinition || !items) {
        return {
          success: false,
          error:
            'Missing required fields: action, formState, formDefinition, or items',
          status: 400,
        };
      }

      const savedData = this.createSavedData({
        formState,
        groupState,
        items,
        formDefinition,
        metadata,
      });

      const saveResult = await this.saveICMData(
        {
          attachmentId: sessionParams.attachmentId,
          OfficeName: sessionParams.OfficeName,
          username: sessionParams.username,
          savedForm: JSON.stringify(savedData),
        },
        token
      );

      if (!saveResult.success) {
        return saveResult;
      }

      if (action === 'save_and_close') {
        const unlockResult = await this.unlockICMData(sessionParams, token);
        if (!unlockResult.success) {
          L.warn('Save succeeded but unlock failed:', unlockResult.error);
        }

        return {
          success: true,
          data: {
            saved: true,
            unlocked: unlockResult.success,
            action: 'save_and_close',
          },
        };
      }

      return {
        success: true,
        data: {
          saved: true,
          action: 'save',
        },
      };
    } catch (error) {
      return this.handleError(
        error,
        'Failed to save form data'
      ) as SaveFormDataResult;
    }
  }

  async generatePdfFromJson(
    data: { attachment: string },
    originalServer?: string
  ): Promise<ICMDataResult> {
    try {
      if (!data?.attachment || typeof data.attachment !== 'string') {
        return { success: false, status: 400, error: 'attachment (base64) is required' };
      }

      const response = await this.icmClient.generatePdfFromJson(data, originalServer);
      return this.handleResponse(response, 'Error generating PDF from JSON. Please try again.');
    } catch (error) {
      return this.handleError(error, 'Failed to generate PDF from JSON');
    }
  }

  async getInterface(originalServer?: string): Promise<ICMDataResult> {
    try {
      const resp = await this.icmClient.getInterface(originalServer);
      return this.handleResponse(resp, 'Error loading interface. Please try again.');
    } catch (error) {
      return this.handleError(error, 'Failed to load interface');
    }
  }

  async saveForPortalAction(
    data: SaveForPortalActionRequest,
    originalServer?: string
  ): Promise<ICMDataResult> {
    try {
      const { tokenId, savedForm } = data || ({} as SaveForPortalActionRequest);

      if (!tokenId || !savedForm) {
        return {
          success: false,
          status: 400,
          error: 'Missing required fields: tokenId or savedForm',
        };
      }

      const resp = await this.icmClient.saveForPortalAction(
        { tokenId, savedForm },
        originalServer
      );
      return this.handleResponse(resp, 'Error saving portal form. Please try again.');
    } catch (error) {
      return this.handleError(error, 'Failed to save portal form');
    }
  }

  async loadPortalForm(
    data: LoadPortalFormRequest,
    originalServer?: string
  ): Promise<LoadPortalFormResult> {
    try {
      if (!data || !data.id || typeof data.id !== 'string' || !data.id.trim()) {
        return { success: false, error: 'Request data is required', status: 400 };
      }

      const response = await this.icmClient.loadPortalForm(data, originalServer);
      return this.handleResponse(response, 'Error loading portal form. Please try again.');
    } catch (error) {
      return this.handleError(error, 'Failed to load portal form');
    }
  }

  async submitForPortalAction(
    data: SubmitPortalActionRequest,
    originalServer?: string
  ): Promise<ICMDataResult> {
    try {
      const { tokenId } = data || ({} as SubmitPortalActionRequest);

      if (!tokenId) {
        return { success: false, status: 400, error: 'Missing required field: tokenId' };
      }

      const resp = await this.icmClient.submitForPortalAction(
        { tokenId },
        originalServer
      );
      return this.handleResponse(resp, 'Error submitting portal action. Please try again.');
    } catch (error) {
      return this.handleError(error, 'Failed to submit portal action');
    }
  }

  async cancelForPortalAction(
    data: CancelPortalActionRequest,
    originalServer?: string
  ): Promise<ICMDataResult> {
    try {
      const { tokenId } = data || ({} as CancelPortalActionRequest);

      if (!tokenId) {
        return { success: false, status: 400, error: 'Missing required field: tokenId' };
      }

      const resp = await this.icmClient.cancelForPortalAction(
        { tokenId },
        originalServer
      );
      return this.handleResponse(resp, 'Error cancelling portal action. Please try again.');
    } catch (error) {
      return this.handleError(error, 'Failed to cancel portal action');
    }
  }

}

export default new ICMService();
