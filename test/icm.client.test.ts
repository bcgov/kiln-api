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

  describe('pdfRender', () => {
    it('should throw error when COMM_API_PDFTEMPLATE_ENDPOINT_URL is not set', async () => {
      delete process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL;

      try {
        await icmClient.pdfRender({ test: 'data' }, 'template-123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(
          'COMM_API_PDFTEMPLATE_ENDPOINT_URL environment variable is required'
        );
      }
    });

    it('should make successful API call and return proper response', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';
      process.env.COMM_API_TIMEOUT = '5000';

      const mockPayload = { formData: { field1: 'value1', field2: 'value2' } };
      const pdfTemplateId = 'template-123';
      const mockPdfBuffer = Buffer.from('PDF content here');

      axiosPostStub.resolves({
        status: 200,
        data: mockPdfBuffer,
      });

      // Act
      const result = await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      const blobData = await result.blob();
      expect(blobData).to.deep.equal(mockPdfBuffer);

      // Verify axios was called with correct parameters
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(
        axiosPostStub.calledWith('https://api.example.com/pdf/template-123', mockPayload, {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
          timeout: 5000,
        })
      ).to.be.true;
    });

    it('should construct URL correctly with pdfTemplateId', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf-service';
      
      const mockPayload = { data: 'test' };
      const pdfTemplateId = 'my-template-456';

      axiosPostStub.resolves({
        status: 200,
        data: Buffer.from('PDF data'),
      });

      // Act
      await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(axiosPostStub.calledOnce).to.be.true;
      const [url] = axiosPostStub.getCall(0).args;
      expect(url).to.equal('https://api.example.com/pdf-service/my-template-456');
    });

    it('should use default timeout when COMM_API_TIMEOUT is not set', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';
      delete process.env.COMM_API_TIMEOUT;

      const mockPayload = { data: 'test' };
      const pdfTemplateId = 'template-789';

      axiosPostStub.resolves({
        status: 200,
        data: Buffer.from('PDF content'),
      });

      // Act
      await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(axiosPostStub.calledOnce).to.be.true;
      const [, , config] = axiosPostStub.getCall(0).args;
      expect(config.timeout).to.equal(30000);
    });

    it('should handle axios error responses properly', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';

      const mockPayload = { data: 'test' };
      const pdfTemplateId = 'invalid-template';
      const mockErrorResponse = {
        error: 'Template not found',
        message: 'PDF template does not exist',
      };

      const axiosError = {
        response: {
          status: 404,
          data: mockErrorResponse,
        },
      };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(404);

      // For blob response, error should return empty buffer
      const blobData = await result.blob();
      expect(blobData).to.be.instanceOf(Buffer);
      expect(blobData.length).to.equal(0);
    });

    it('should handle axios error responses with default status 500', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';

      const mockPayload = { data: 'test' };
      const pdfTemplateId = 'template-error';

      const axiosError = {
        response: {
          // Missing status, should default to 500
          data: { error: 'Internal server error' },
        },
      };

      axiosPostStub.rejects(axiosError);

      // Act
      const result = await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(result.ok).to.be.false;
      expect(result.status).to.equal(500);

      const blobData = await result.blob();
      expect(blobData).to.be.instanceOf(Buffer);
      expect(blobData.length).to.equal(0);
    });

    it('should handle non-axios errors by rethrowing', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';

      const mockPayload = { data: 'test' };
      const pdfTemplateId = 'template-123';
      const networkError = new Error('Network connection failed');

      axiosPostStub.rejects(networkError);

      // Act & Assert
      try {
        await icmClient.pdfRender(mockPayload, pdfTemplateId);
        expect.fail('Should have thrown the network error');
      } catch (error) {
        expect(error.message).to.equal('Network connection failed');
      }
    });

    it('should set correct headers and response type for PDF generation', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';

      const mockPayload = { formData: { name: 'John Doe' } };
      const pdfTemplateId = 'invoice-template';

      axiosPostStub.resolves({
        status: 201,
        data: Buffer.from('Generated PDF content'),
      });

      // Act
      const result = await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(201);

      // Verify correct headers and responseType were set
      expect(axiosPostStub.calledOnce).to.be.true;
      const [, , config] = axiosPostStub.getCall(0).args;
      expect(config.headers).to.deep.equal({
        'Content-Type': 'application/json',
      });
      expect(config.responseType).to.equal('arraybuffer');
    });

    it('should handle large PDF responses correctly', async () => {
      // Arrange
      process.env.COMM_API_PDFTEMPLATE_ENDPOINT_URL =
        'https://api.example.com/pdf';

      const mockPayload = { data: 'large document data' };
      const pdfTemplateId = 'large-template';
      const largePdfBuffer = Buffer.alloc(1024 * 1024, 'A'); // 1MB buffer

      axiosPostStub.resolves({
        status: 200,
        data: largePdfBuffer,
      });

      // Act
      const result = await icmClient.pdfRender(mockPayload, pdfTemplateId);

      // Assert
      expect(result.ok).to.be.true;
      expect(result.status).to.equal(200);

      const blobData = await result.blob();
      expect(blobData).to.be.instanceOf(Buffer);
      expect(blobData.length).to.equal(1024 * 1024);
      expect(blobData.equals(largePdfBuffer)).to.be.true;
    });
  });
});
