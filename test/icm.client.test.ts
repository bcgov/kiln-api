import 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import { ICMClient } from '../server/api/services/icm.client';

describe('ICMClient', () => {
  let icmClient: ICMClient;
  let originalEnv: any;
  let axiosPostStub: sinon.SinonStub;

  beforeEach(() => {
    icmClient = new ICMClient();
    originalEnv = { ...process.env };
    axiosPostStub = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    process.env = originalEnv;
    axiosPostStub.restore();
  });

  describe('saveICMData', () => {
    it('should throw error when COMM_API_SAVEDATA_ICM_ENDPOINT_URL is not set', async () => {
      delete process.env.COMM_API_SAVEDATA_ICM_ENDPOINT_URL;

      try {
        await icmClient.saveICMData({ test: 'data' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(
          'COMM_API_SAVEDATA_ICM_ENDPOINT_URL environment variable is required'
        );
      }
    });

    it('should make successful API call and return proper response', async () => {
      // Arrange
      process.env.COMM_API_SAVEDATA_ICM_ENDPOINT_URL =
        'https://api.example.com/icm';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { test: 'data', id: 123 };
      const mockResponseData = { success: true, id: 456 };

      axiosPostStub.resolves({
        status: 201,
        data: mockResponseData,
      });

      // Act
      const result = await icmClient.saveICMData(mockPayload);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(201);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockResponseData);

      // Verify axios was called with correct parameters
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith('https://api.example.com/icm', mockPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        })
      ).to.be.true;
    });

    it('should handle axios error responses properly', async () => {
      // Arrange
      process.env.COMM_API_SAVEDATA_ICM_ENDPOINT_URL =
        'https://api.example.com/icm';

      const mockPayload = { test: 'data' };
      const mockErrorResponse = {
        error: 'Bad Request',
        message: 'Invalid data',
      };

      const axiosError = {
        response: {
          status: 400,
          data: mockErrorResponse,
        },
      };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.saveICMData(mockPayload);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(400);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockErrorResponse);
    });
  });

  describe('unlockICMData', () => {
    it('should throw error when COMM_API_UNLOCK_ICM_ENDPOINT_URL is not set', async () => {
      delete process.env.COMM_API_UNLOCK_ICM_ENDPOINT_URL;

      try {
        await icmClient.unlockICMData({ test: 'data' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(
          'COMM_API_UNLOCK_ICM_ENDPOINT_URL environment variable is required'
        );
      }
    });

    it('should make successful API call and return proper response', async () => {
      // Arrange
      process.env.COMM_API_UNLOCK_ICM_ENDPOINT_URL =
        'https://api.example.com/icm/unlock';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formId: 'form-123', userId: 'user-456' };
      const mockResponseData = { success: true, unlocked: true };

      axiosPostStub.resolves({
        status: 200,
        data: mockResponseData,
      });

      // Act
      const result = await icmClient.unlockICMData(mockPayload);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockResponseData);

      // Verify axios was called with correct parameters
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith(
          'https://api.example.com/icm/unlock',
          mockPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          }
        )
      ).to.be.true;
    });

    it('should handle axios error responses properly', async () => {
      // Arrange
      process.env.COMM_API_UNLOCK_ICM_ENDPOINT_URL =
        'https://api.example.com/icm/unlock';

      const mockPayload = { formId: 'form-123' };
      const mockErrorResponse = {
        error: 'Forbidden',
        message: 'Insufficient permissions to unlock',
      };

      const axiosError = {
        response: {
          status: 403,
          data: mockErrorResponse,
        },
      };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.unlockICMData(mockPayload);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(403);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockErrorResponse);
    });
  });

  describe('loadSavedJson', () => {
    it('should throw error when COMM_API_LOADSAVEDJSON_ENDPOINT_URL is not set', async () => {
      delete process.env.COMM_API_LOADSAVEDJSON_ENDPOINT_URL;

      try {
        await icmClient.loadSavedJson({ formId: 'test-form' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(
          'COMM_API_LOADSAVEDJSON_ENDPOINT_URL environment variable is required'
        );
      }
    });

    it('should make successful API call and return proper response', async () => {
      // Arrange
      process.env.COMM_API_LOADSAVEDJSON_ENDPOINT_URL =
        'https://api.example.com/icm/loadsaved';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formId: 'form-123', version: '1.0' };
      const mockResponseData = {
        success: true,
        data: {
          savedJson: { field1: 'value1', field2: 'value2' },
          version: '1.0'
        }
      };

      axiosPostStub.resolves({
        status: 200,
        data: mockResponseData,
      });

      // Act
      const result = await icmClient.loadSavedJson(mockPayload);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockResponseData);

      // Verify axios was called with correct parameters
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith('https://api.example.com/icm/loadsaved', mockPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        })
      ).to.be.true;
    });

    it('should handle axios error responses properly', async () => {
      // Arrange
      process.env.COMM_API_LOADSAVEDJSON_ENDPOINT_URL =
        'https://api.example.com/icm/loadsaved';

      const mockPayload = { formId: 'form-123' };
      const mockErrorResponse = {
        error: 'Not Found',
        message: 'Saved JSON not found for the specified form',
      };

      const axiosError = {
        response: {
          status: 404,
          data: mockErrorResponse,
        },
      };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.loadSavedJson(mockPayload);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(404);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockErrorResponse);
    });
  });

  describe('generateForm', () => {
    it('should throw error when COMM_API_GENERATE_ENDPOINT_URL is not set', async () => {
      delete process.env.COMM_API_GENERATE_ENDPOINT_URL;

      try {
        await icmClient.generateForm({ test: 'data' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(
          'COMM_API_GENERATE_ENDPOINT_URL environment variable is required'
        );
      }
    });

    it('should make successful API call and return proper response', async () => {
      // Arrange
      process.env.COMM_API_GENERATE_ENDPOINT_URL =
        'https://api.example.com/icm/generate';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formType: 'registration', data: { name: 'test' } };
      const mockResponseData = { success: true, formId: 'generated-123' };

      axiosPostStub.resolves({
        status: 200,
        data: mockResponseData,
      });

      // Act
      const result = await icmClient.generateForm(mockPayload);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockResponseData);

      // Verify axios was called with correct parameters
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith('https://api.example.com/icm/generate', mockPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        })
      ).to.be.true;
    });

    it('should include X-Original-Server header when originalServer is provided', async () => {
      // Arrange
      process.env.COMM_API_GENERATE_ENDPOINT_URL =
        'https://api.example.com/icm/generate';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formType: 'registration' };
      const originalServer = 'server1.example.com';
      const mockResponseData = { success: true, formId: 'generated-456' };

      axiosPostStub.resolves({
        status: 200,
        data: mockResponseData,
      });

      // Act
      const result = await icmClient.generateForm(mockPayload, originalServer);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      // Verify axios was called with correct parameters including X-Original-Server header
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith('https://api.example.com/icm/generate', mockPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Original-Server': originalServer
          },
          timeout: 5000,
        })
      ).to.be.true;
    });

    it('should handle axios error responses properly', async () => {
      // Arrange
      process.env.COMM_API_GENERATE_ENDPOINT_URL =
        'https://api.example.com/icm/generate';

      const mockPayload = { formType: 'invalid' };
      const mockErrorResponse = {
        error: 'Bad Request',
        message: 'Invalid form type provided',
      };

      const axiosError = {
        response: {
          status: 400,
          data: mockErrorResponse,
        },
      };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.generateForm(mockPayload);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(400);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockErrorResponse);
    });
  });

  describe('generatePortalForm', () => {
    it('should throw error when COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL is not set', async () => {
      delete process.env.COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL;

      try {
        await icmClient.generatePortalForm({ test: 'data' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal(
          'COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL environment variable is required'
        );
      }
    });

    it('should make successful API call and return proper response', async () => {
      // Arrange
      process.env.COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL =
        'https://api.example.com/icm/generatePortalForm';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formType: 'portal', data: { name: 'test' } };
      const mockResponseData = { success: true, portalFormId: 'generated-portal-123' };

      axiosPostStub.resolves({
        status: 200,
        data: mockResponseData,
      });

      // Act
      const result = await icmClient.generatePortalForm(mockPayload);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockResponseData);

      // Verify axios was called with correct parameters
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith(
          'https://api.example.com/icm/generatePortalForm',
          mockPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          }
        )
      ).to.be.true;
    });

    it('should include X-Original-Server header when provided', async () => {
      // Arrange
      process.env.COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL =
        'https://api.example.com/icm/generatePortalForm';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formType: 'portal', data: { name: 'x' } };
      const originalServer = 'https://icm-dev.internal';
      axiosPostStub.resolves({ status: 200, data: { ok: true } });

      // Act
      await icmClient.generatePortalForm(mockPayload, originalServer);

      // Assert
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith(
          'https://api.example.com/icm/generatePortalForm',
          mockPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Original-Server': originalServer,
            },
            timeout: 5000,
          }
        )
      ).to.be.true;
    });

    it('should handle axios error responses properly', async () => {
      // Arrange
      process.env.COMM_API_GENERATE_PORTAL_FORM_ENDPOINT_URL =
        'https://api.example.com/icm/generatePortalForm';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formType: 'portal', data: { name: 'bad' } };
      const mockErrorResponse = { error: 'Bad Request' };

      const axiosError: any = new Error('Request failed');
      axiosError.response = { status: 400, data: mockErrorResponse };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.generatePortalForm(mockPayload);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(400);
      const jsonData = await result.json();
      expect(jsonData).to.deep.equal(mockErrorResponse);
    });
  });

});
