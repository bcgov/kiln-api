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

interface ICMDataResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
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

  async generatePortalForm(
    data: { username?: string; originalServer?: string;[k: string]: any },
    token?: string
  ): Promise<{ success: boolean; data?: any; error?: string; status?: number }> {
    try {
      const { username, originalServer, ...params } = data || {};

      const payload: Record<string, any> = {
        ...params,
      };

      if (token) {
        payload.token = token;
      } else if (username?.trim()) {
        payload.username = username;
      } else {
        return {
          success: false,
          error:
            'Authentication required: either token or username must be provided',
          status: 401,
        };
      }

      const response = await this.icmClient.generatePortalForm(
        payload,
        originalServer
      );

      return this.handleResponse(
        response,
        'Error generating portal form. Please try again.'
      );
    } catch (error) {
      return this.handleError(error, 'Failed to generate portal form');
    }
  }
}

export default new ICMService();
