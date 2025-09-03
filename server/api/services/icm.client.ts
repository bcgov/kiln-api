import axios from 'axios';
import L from '../../common/logger';
import * as process from 'node:process';

interface ICMApiResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
}

export class ICMClient {
  private handleError(error: any, operationName: string): ICMApiResponse {
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

  private createSuccessResponse(response: any): ICMApiResponse {
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
    };
  }

  async saveICMData(payload: any): Promise<ICMApiResponse> {
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

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.handleError(error, 'saveICMData');
    }
  }

  async loadICMData(
    payload: any,
    originalServer?: string
  ): Promise<ICMApiResponse> {
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

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.handleError(error, 'loadICMData');
    }
  }

  async unlockICMData(payload: any): Promise<ICMApiResponse> {
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

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.handleError(error, 'unlockICMData');
    }
  }

  async loadSavedJson(payload: any): Promise<ICMApiResponse> {
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

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.handleError(error, 'loadSavedJson');
    }
  }

  async generateForm(
    payload: any,
    originalServer?: string
  ): Promise<ICMApiResponse> {
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

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.handleError(error, 'generateForm');
    }
  }

  async generatePortalForm(
    payload: Record<string, any>,
    originalServer?: string
  ): Promise<ICMApiResponse> {
    try {
      const url = process.env.COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL;

      if (!url) {
        throw new Error(
          'COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL environment variable is required'
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

      return this.createSuccessResponse(response);
    } catch (error) {
      return this.handleError(error, 'generatePortalForm');
    }
  }
}
