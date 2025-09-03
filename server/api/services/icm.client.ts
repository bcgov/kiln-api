import axios from 'axios';
import L from '../../common/logger';
import * as process from 'node:process';

interface ICMJsonResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
}

interface ICMBlobResponse {
  ok: boolean;
  status: number;
  blob(): Promise<Buffer>;
}

export class ICMClient {
  private handleJsonError(error: any, operationName: string): ICMJsonResponse {
    L.error(`ICMClient ${operationName} request failed:`, error);

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      const status = axiosError.response?.status || 500;
      return {
        ok: false,
        status,
        json: async () => axiosError.response?.data || {},
      };
    }

    throw error;
  }

  private handleBlobError(error: any, operationName: string): ICMBlobResponse {
    L.error(`ICMClient ${operationName} request failed:`, error);

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      const status = axiosError.response?.status || 500;
      return {
        ok: false,
        status,
        blob: async () => Buffer.from([]), // Empty buffer for error
      };
    }

    throw error;
  }

  private createJsonResponse(response: any): ICMJsonResponse {
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
    };
  }

  private createBlobResponse(response: any): ICMBlobResponse {
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      blob: async () => response.data,
    };
  }

  async saveICMData(payload: any): Promise<ICMJsonResponse> {
    try {
      const url = process.env.COMM_API_SAVEDATA_ICM_ENDPOINT_URL;

      if (!url) {
        throw new Error(
          'COMM_API_SAVEDATA_ICM_ENDPOINT_URL environment variable is required'
        );
      }

      const timeout = process.env.COMM_API_TIMEOUT
        ? parseInt(process.env.COMM_API_TIMEOUT, 10)
        : 30000;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await axios.post(url, payload, {
        headers,
        timeout,
      });

      return this.createJsonResponse(response);
    } catch (error) {
      return this.handleJsonError(error, 'saveICMData');
    }
  }

  async loadICMData(
    payload: any,
    originalServer?: string
  ): Promise<ICMJsonResponse> {
    try {
      const url = process.env.COMM_API_LOADDATA_ICM_ENDPOINT_URL;

      if (!url) {
        throw new Error(
          'COMM_API_LOADDATA_ICM_ENDPOINT_URL environment variable is required'
        );
      }

      const timeout = process.env.COMM_API_TIMEOUT
        ? parseInt(process.env.COMM_API_TIMEOUT, 10)
        : 30000;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (originalServer) {
        headers['X-Original-Server'] = originalServer;
      }

      const response = await axios.post(url, payload, {
        headers,
        timeout,
      });

      return this.createJsonResponse(response);
    } catch (error) {
      return this.handleJsonError(error, 'loadICMData');
    }
  }

  async unlockICMData(payload: any): Promise<ICMJsonResponse> {
    try {
      const url = process.env.COMM_API_UNLOCK_ICM_ENDPOINT_URL;

      if (!url) {
        throw new Error(
          'COMM_API_UNLOCK_ICM_ENDPOINT_URL environment variable is required'
        );
      }

      const timeout = process.env.COMM_API_TIMEOUT
        ? parseInt(process.env.COMM_API_TIMEOUT, 10)
        : 30000;

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      });

      return this.createJsonResponse(response);
    } catch (error) {
      return this.handleJsonError(error, 'unlockICMData');
    }
  }

  async loadSavedJson(payload: any): Promise<ICMJsonResponse> {
    try {
      const url = process.env.COMM_API_LOADSAVEDJSON_ENDPOINT_URL;

      if (!url) {
        throw new Error(
          'COMM_API_LOADSAVEDJSON_ENDPOINT_URL environment variable is required'
        );
      }

      const timeout = process.env.COMM_API_TIMEOUT
        ? parseInt(process.env.COMM_API_TIMEOUT, 10)
        : 30000;

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      });

      return this.createJsonResponse(response);
    } catch (error) {
      return this.handleJsonError(error, 'loadSavedJson');
    }
  }

  async generateForm(
    payload: any,
    originalServer?: string
  ): Promise<ICMJsonResponse> {
    try {
      const url = process.env.COMM_API_GENERATE_ENDPOINT_URL;

      if (!url) {
        throw new Error(
          'COMM_API_GENERATE_ENDPOINT_URL environment variable is required'
        );
      }

      const timeout = process.env.COMM_API_TIMEOUT
        ? parseInt(process.env.COMM_API_TIMEOUT, 10)
        : 30000;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (originalServer) {
        headers['X-Original-Server'] = originalServer;
      }

      const response = await axios.post(url, payload, {
        headers,
        timeout,
      });

      return this.createJsonResponse(response);
    } catch (error) {
      return this.handleJsonError(error, 'generateForm');
    }
  }

  async pdfRender(
    payload: any,
    pdfTemplateId: string
  ): Promise<ICMBlobResponse> {
    try {
      const baseUrl = process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL;

      if (!baseUrl) {
        throw new Error(
          'COMM_API_PDFTEMPLATE_ENDPOINT_URL environment variable is required'
        );
      }

      // Construct URL with PDF template ID as path parameter
      const url = `${baseUrl}/${pdfTemplateId}`;

      const timeout = process.env.COMM_API_TIMEOUT
        ? parseInt(process.env.COMM_API_TIMEOUT, 10)
        : 30000;

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer', // Important: Handle binary PDF data
        timeout,
      });

      return this.createBlobResponse(response);
    } catch (error) {
      return this.handleBlobError(error, 'pdfRender');
    }
  }
}
