import 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { ICMService } from '../server/api/services/icm.service';
import { ICMClient } from '../server/api/services/icm.client';

describe('ICMService', () => {
  let icmService: ICMService;
  let icmClientStub: sinon.SinonStubbedInstance<ICMClient>;

  beforeEach(() => {
    icmService = new ICMService();
    icmClientStub = sinon.createStubInstance(ICMClient);
    (icmService as any).icmClient = icmClientStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('saveICMData', () => {
    it('should successfully save ICM data with all required fields', async () => {
      const testData = {
        attachmentId: 'test-123',
        OfficeName: 'Test Office',
        username: 'testuser',
        savedForm: { field1: 'value1', field2: 'value2' },
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ id: 'saved-123', status: 'success' }),
      };

      icmClientStub.saveICMData.resolves(mockResponse as any);

      const result = await icmService.saveICMData(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ id: 'saved-123', status: 'success' });
      expect(icmClientStub.saveICMData.calledOnce).to.be.true;

      const calledPayload = icmClientStub.saveICMData.getCall(0).args[0];
      expect(calledPayload).to.deep.equal({
        attachmentId: 'test-123',
        OfficeName: 'Test Office',
        savedForm: { field1: 'value1', field2: 'value2' },
        token: 'test-token',
      });
    });
  });

  describe('loadICMData', () => {
    it('should successfully load ICM data with token', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        originalServer: 'https://original.example.com',
      };

      const mockResponse = {
        ok: true,
        json: sinon
          .stub()
          .resolves({ formData: { field1: 'value1' }, status: 'loaded' }),
      };

      icmClientStub.loadICMData.resolves(mockResponse as any);

      const result = await icmService.loadICMData(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        formData: { field1: 'value1' },
        status: 'loaded',
      });
      expect(icmClientStub.loadICMData.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.loadICMData.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formId: 'form-123',
        token: 'test-token',
      });
      expect(originalServer).to.equal('https://original.example.com');
    });

    it('should successfully load ICM data with username when no token provided', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ formData: { field1: 'value1' } }),
      };

      icmClientStub.loadICMData.resolves(mockResponse as any);

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.true;
      expect(icmClientStub.loadICMData.calledOnce).to.be.true;

      const [calledPayload] = icmClientStub.loadICMData.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formId: 'form-123',
        username: 'testuser',
      });
    });

    it('should return error when neither token nor username is provided', async () => {
      const testData = {
        formId: 'form-123',
      };

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
      expect(icmClientStub.loadICMData.called).to.be.false;
    });

    it('should return error when username is empty string', async () => {
      const testData = {
        username: '   ',
        formId: 'form-123',
      };

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
    });

    it('should handle ICM client API error responses', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      const mockResponse = {
        ok: false,
        status: 404,
        json: sinon.stub().resolves({ error: 'Form not found' }),
      };

      icmClientStub.loadICMData.resolves(mockResponse as any);

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Form not found');
      expect(result.status).to.equal(404);
    });

    it('should handle ICM client API error responses with default error message', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.loadICMData.resolves(mockResponse as any);

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Error loading form. Please try again.');
      expect(result.status).to.equal(500);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      const error = new Error('Network connection failed');
      icmClientStub.loadICMData.rejects(error);

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to load ICM data: Network connection failed'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle unknown errors', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      icmClientStub.loadICMData.rejects(new Error('Unknown error'));

      const result = await icmService.loadICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Failed to load ICM data: Unknown error');
      expect(result.status).to.equal(500);
    });
  });

  describe('unlockICMData', () => {
    it('should successfully unlock ICM data with token', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const mockResponse = {
        ok: true,
        json: sinon
          .stub()
          .resolves({ unlocked: true, formId: 'form-123', status: 'success' }),
      };

      icmClientStub.unlockICMData.resolves(mockResponse as any);

      const result = await icmService.unlockICMData(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        unlocked: true,
        formId: 'form-123',
        status: 'success',
      });
      expect(icmClientStub.unlockICMData.calledOnce).to.be.true;

      const calledPayload = icmClientStub.unlockICMData.getCall(0).args[0];
      expect(calledPayload).to.deep.equal({
        formId: 'form-123',
        lockId: 'lock-456',
        token: 'test-token',
      });
    });

    it('should successfully unlock ICM data with username when no token provided', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ unlocked: true, formId: 'form-123' }),
      };

      icmClientStub.unlockICMData.resolves(mockResponse as any);

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.true;
      expect(icmClientStub.unlockICMData.calledOnce).to.be.true;

      const calledPayload = icmClientStub.unlockICMData.getCall(0).args[0];
      expect(calledPayload).to.deep.equal({
        formId: 'form-123',
        lockId: 'lock-456',
        username: 'testuser',
      });
    });

    it('should return error when neither token nor username is provided', async () => {
      const testData = {
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
      expect(icmClientStub.unlockICMData.called).to.be.false;
    });

    it('should return error when username is empty string', async () => {
      const testData = {
        username: '   ',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
    });

    it('should handle ICM client API error responses', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const mockResponse = {
        ok: false,
        status: 403,
        json: sinon.stub().resolves({ error: 'Insufficient permissions' }),
      };

      icmClientStub.unlockICMData.resolves(mockResponse as any);

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Insufficient permissions');
      expect(result.status).to.equal(403);
    });

    it('should handle ICM client API error responses with default error message', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.unlockICMData.resolves(mockResponse as any);

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Error unlocking ICM form. Please try again.'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      const error = new Error('Network timeout');
      icmClientStub.unlockICMData.rejects(error);

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to unlock ICM data: Network timeout'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle unknown errors', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      icmClientStub.unlockICMData.rejects(new Error('Connection failed'));

      const result = await icmService.unlockICMData(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to unlock ICM data: Connection failed'
      );
      expect(result.status).to.equal(500);
    });
  });

  describe('loadSavedJson', () => {
    it('should successfully load saved JSON data', async () => {
      const testData = {
        formId: 'form-123',
        version: '1.0',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          success: true,
          data: {
            savedJson: { field1: 'value1', field2: 'value2' },
            version: '1.0',
            formId: 'form-123',
          },
        }),
      };

      icmClientStub.loadSavedJson.resolves(mockResponse as any);

      const result = await icmService.loadSavedJson(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        success: true,
        data: {
          savedJson: { field1: 'value1', field2: 'value2' },
          version: '1.0',
          formId: 'form-123',
        },
      });
      expect(icmClientStub.loadSavedJson.calledOnce).to.be.true;

      const calledPayload = icmClientStub.loadSavedJson.getCall(0).args[0];
      expect(calledPayload).to.deep.equal({
        formId: 'form-123',
        version: '1.0',
      });
    });

    it('should handle ICM client API error responses', async () => {
      const testData = {
        formId: 'form-123',
      };

      const mockResponse = {
        ok: false,
        status: 404,
        json: sinon.stub().resolves({ error: 'Saved JSON not found' }),
      };

      icmClientStub.loadSavedJson.resolves(mockResponse as any);

      const result = await icmService.loadSavedJson(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Saved JSON not found');
      expect(result.status).to.equal(404);
    });

    it('should handle ICM client API error responses with default error message', async () => {
      const testData = {
        formId: 'form-123',
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.loadSavedJson.resolves(mockResponse as any);

      const result = await icmService.loadSavedJson(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Error loading saved JSON. Please try again.'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        formId: 'form-123',
      };

      const error = new Error('Network connection failed');
      icmClientStub.loadSavedJson.rejects(error);

      const result = await icmService.loadSavedJson(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to load saved JSON: Network connection failed'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle unknown errors', async () => {
      const testData = {
        formId: 'form-123',
      };

      icmClientStub.loadSavedJson.rejects(new Error('Connection timeout'));

      const result = await icmService.loadSavedJson(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to load saved JSON: Connection timeout'
      );
      expect(result.status).to.equal(500);
    });
  });

  describe('generateForm', () => {
    it('should successfully generate form with token', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
        originalServer: 'https://original.example.com',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          formId: 'generated-123',
          success: true,
          status: 'created',
        }),
      };

      icmClientStub.generateForm.resolves(mockResponse as any);

      const result = await icmService.generateForm(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        formId: 'generated-123',
        success: true,
        status: 'created',
      });
      expect(icmClientStub.generateForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.generateForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formType: 'registration',
        templateId: 'template-123',
        token: 'test-token',
      });
      expect(originalServer).to.equal('https://original.example.com');
    });

    it('should successfully generate form with username when no token provided', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ formId: 'generated-456', success: true }),
      };

      icmClientStub.generateForm.resolves(mockResponse as any);

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        formId: 'generated-456',
        success: true,
      });
      expect(icmClientStub.generateForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.generateForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formType: 'registration',
        templateId: 'template-123',
        username: 'testuser',
      });
      expect(originalServer).to.be.undefined;
    });

    it('should return error when neither token nor username is provided', async () => {
      const testData = {
        formType: 'registration',
        templateId: 'template-123',
      };

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
      expect(icmClientStub.generateForm.called).to.be.false;
    });

    it('should return error when username is empty string', async () => {
      const testData = {
        username: '   ',
        formType: 'registration',
        templateId: 'template-123',
      };

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
      expect(icmClientStub.generateForm.called).to.be.false;
    });

    it('should handle ICM client API error responses', async () => {
      const testData = {
        username: 'testuser',
        formType: 'invalid-type',
        templateId: 'template-123',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: sinon.stub().resolves({ error: 'Invalid form type provided' }),
      };

      icmClientStub.generateForm.resolves(mockResponse as any);

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Invalid form type provided');
      expect(result.status).to.equal(400);
    });

    it('should handle ICM client API error responses with default error message', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.generateForm.resolves(mockResponse as any);

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Error generating form. Please try again.');
      expect(result.status).to.equal(500);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      const error = new Error('Network connection failed');
      icmClientStub.generateForm.rejects(error);

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to generate form: Network connection failed'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle unknown errors', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      icmClientStub.generateForm.rejects(new Error('Template not found'));

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to generate form: Template not found'
      );
      expect(result.status).to.equal(500);
    });

    it('should pass through additional parameters to ICM client', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
        customField1: 'value1',
        customField2: 'value2',
        originalServer: 'https://server.example.com',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ formId: 'generated-789', success: true }),
      };

      icmClientStub.generateForm.resolves(mockResponse as any);

      const result = await icmService.generateForm(testData);

      expect(result.success).to.be.true;
      expect(icmClientStub.generateForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.generateForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formType: 'registration',
        templateId: 'template-123',
        customField1: 'value1',
        customField2: 'value2',
        username: 'testuser',
      });
      expect(originalServer).to.equal('https://server.example.com');
    });
  });

  describe('pdfRender', () => {
    it('should successfully generate PDF with valid template ID', async () => {
      const testData = {
        pdfTemplateId: 'template-123',
        formData: { name: 'John Doe', email: 'john@example.com' },
        metadata: { version: '1.0' },
      };

      const mockPdfBuffer = Buffer.from('PDF binary content here');
      const mockResponse = {
        ok: true,
        blob: sinon.stub().resolves(mockPdfBuffer),
      };

      icmClientStub.pdfRender.resolves(mockResponse as any);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockPdfBuffer);
      expect(icmClientStub.pdfRender.calledOnce).to.be.true;

      const [calledPayload, templateId] =
        icmClientStub.pdfRender.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formData: { name: 'John Doe', email: 'john@example.com' },
        metadata: { version: '1.0' },
      });
      expect(templateId).to.equal('template-123');
    });

    it('should return error when pdfTemplateId is missing', async () => {
      const testData = {
        formData: { name: 'John Doe' },
      };

      const result = await icmService.pdfRender(testData as any);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Missing required field: pdfTemplateId');
      expect(result.status).to.equal(400);
      expect(icmClientStub.pdfRender.called).to.be.false;
    });

    it('should return error when pdfTemplateId is empty string', async () => {
      const testData = {
        pdfTemplateId: '',
        formData: { name: 'John Doe' },
      };

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Missing required field: pdfTemplateId');
      expect(result.status).to.equal(400);
      expect(icmClientStub.pdfRender.called).to.be.false;
    });

    it('should handle ICM client API error responses', async () => {
      const testData = {
        pdfTemplateId: 'invalid-template',
        formData: { data: 'test' },
      };

      const mockResponse = {
        ok: false,
        status: 404,
        blob: sinon.stub().resolves(Buffer.from([])),
      };

      icmClientStub.pdfRender.resolves(mockResponse as any);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Error generating PDF. Please try again.');
      expect(result.status).to.equal(404);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        pdfTemplateId: 'template-123',
        formData: { data: 'test' },
      };

      const error = new Error('Network connection failed');
      icmClientStub.pdfRender.rejects(error);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to generate PDF: Network connection failed'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle unknown errors', async () => {
      const testData = {
        pdfTemplateId: 'template-123',
        formData: { data: 'test' },
      };

      icmClientStub.pdfRender.rejects(
        new Error('Template service unavailable')
      );

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to generate PDF: Template service unavailable'
      );
      expect(result.status).to.equal(500);
    });

    it('should pass through all form data parameters to ICM client', async () => {
      const testData = {
        pdfTemplateId: 'invoice-template',
        customerName: 'Jane Smith',
        invoiceNumber: 'INV-001',
        items: [
          { name: 'Product A', price: 100 },
          { name: 'Product B', price: 200 },
        ],
        totalAmount: 300,
        dueDate: '2024-01-15',
      };

      const mockPdfBuffer = Buffer.from('Generated invoice PDF');
      const mockResponse = {
        ok: true,
        blob: sinon.stub().resolves(mockPdfBuffer),
      };

      icmClientStub.pdfRender.resolves(mockResponse as any);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.true;
      expect(icmClientStub.pdfRender.calledOnce).to.be.true;

      const [calledPayload, templateId] =
        icmClientStub.pdfRender.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        customerName: 'Jane Smith',
        invoiceNumber: 'INV-001',
        items: [
          { name: 'Product A', price: 100 },
          { name: 'Product B', price: 200 },
        ],
        totalAmount: 300,
        dueDate: '2024-01-15',
      });
      expect(templateId).to.equal('invoice-template');
    });

    it('should handle large PDF responses correctly', async () => {
      const testData = {
        pdfTemplateId: 'large-report-template',
        reportData: { records: new Array(1000).fill({ id: 1, data: 'test' }) },
      };

      const largePdfBuffer = Buffer.alloc(5 * 1024 * 1024, 'P'); // 5MB PDF
      const mockResponse = {
        ok: true,
        blob: sinon.stub().resolves(largePdfBuffer),
      };

      icmClientStub.pdfRender.resolves(mockResponse as any);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Buffer);
      expect(result.data?.length).to.equal(5 * 1024 * 1024);
      expect(result.data).to.deep.equal(largePdfBuffer);
    });

    it('should handle empty form data correctly', async () => {
      const testData = {
        pdfTemplateId: 'blank-template',
      };

      const mockPdfBuffer = Buffer.from('Empty PDF template');
      const mockResponse = {
        ok: true,
        blob: sinon.stub().resolves(mockPdfBuffer),
      };

      icmClientStub.pdfRender.resolves(mockResponse as any);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockPdfBuffer);
      expect(icmClientStub.pdfRender.calledOnce).to.be.true;

      const [calledPayload, templateId] =
        icmClientStub.pdfRender.getCall(0).args;
      expect(calledPayload).to.deep.equal({});
      expect(templateId).to.equal('blank-template');
    });

    it('should handle special characters in template ID', async () => {
      const testData = {
        pdfTemplateId: 'template_with-special.chars@123',
        formData: { field: 'value' },
      };

      const mockPdfBuffer = Buffer.from('PDF with special template');
      const mockResponse = {
        ok: true,
        blob: sinon.stub().resolves(mockPdfBuffer),
      };

      icmClientStub.pdfRender.resolves(mockResponse as any);

      const result = await icmService.pdfRender(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockPdfBuffer);

      const [, templateId] = icmClientStub.pdfRender.getCall(0).args;
      expect(templateId).to.equal('template_with-special.chars@123');
    });
  });

  describe('generatePortalForm', () => {
    it('should successfully generate portal form with token', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-123',
        originalServer: 'https://original.example.com',
        extra: 'value',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          save_data: { built: true, id: 'pf-123' },
          status: 'created',
        }),
      };

      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(
        testData,
        'test-token'
      );

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        save_data: { built: true, id: 'pf-123' },
        status: 'created',
      });
      expect(icmClientStub.generatePortalForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.generatePortalForm.getCall(0).args;

      expect(calledPayload).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-123',
        extra: 'value',
        token: 'test-token',
      });
      expect(originalServer).to.equal('https://original.example.com');
    });

    it('should successfully generate portal form with username when no token provided', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-456',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ save_data: { ok: true } }),
      };

      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ save_data: { ok: true } });

      const [calledPayload, originalServer] =
        icmClientStub.generatePortalForm.getCall(0).args;

      expect(calledPayload).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-456',
        username: 'testuser',
      });
      expect(originalServer).to.be.undefined;
    });

    it('should return 401 when neither token nor username is provided', async () => {
      const testData = {
        formType: 'portal',
        templateId: 'tpl-789',
      };

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
      expect(icmClientStub.generatePortalForm.called).to.be.false;
    });

    it('should return 401 when username is empty string', async () => {
      const testData = {
        username: '   ',
        formType: 'portal',
        templateId: 'tpl-000',
      };

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Authentication required: either token or username must be provided'
      );
      expect(result.status).to.equal(401);
      expect(icmClientStub.generatePortalForm.called).to.be.false;
    });

    it('should handle ICM client API error responses (JSON)', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'bad-template',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: sinon.stub().resolves({ error: 'Invalid template' }),
      };

      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Invalid template');
      expect(result.status).to.equal(400);
    });

    it('should handle ICM client API error responses with default message', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-err',
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Error generating portal form. Please try again.'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-ex',
      };

      const error = new Error('Network connection failed');
      icmClientStub.generatePortalForm.rejects(error);

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to generate portal form: Network connection failed'
      );
      expect(result.status).to.equal(500);
    });

    it('should pass through additional parameters and originalServer', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-123',
        custom1: 'A',
        custom2: 42,
        originalServer: 'https://icm-dev.internal',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ save_data: { custom: true } }),
      };

      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ save_data: { custom: true } });
      expect(icmClientStub.generatePortalForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.generatePortalForm.getCall(0).args;

      expect(calledPayload).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-123',
        custom1: 'A',
        custom2: 42,
        username: 'testuser',
      });
      expect(originalServer).to.equal('https://icm-dev.internal');
    });
  });

  describe('loadPortalForm', () => {
    it('should successfully load portal form with token', async () => {
      const testData = {
        portalFormId: 'portal-123',
        userId: 'user-456',
      };

      const mockResponseData = {
        success: true,
        formData: {
          id: 'portal-123',
          fields: { field1: 'value1', field2: 'value2' },
          version: '2.0',
        },
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponseData),
      };

      icmClientStub.loadPortalForm.resolves(mockResponse as any);

      const result = await icmService.loadPortalForm(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockResponseData);
      expect(icmClientStub.loadPortalForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.loadPortalForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        portalFormId: 'portal-123',
        userId: 'user-456',
        token: 'test-token',
      });
      expect(originalServer).to.be.undefined;
    });

    it('should successfully load portal form with originalServer', async () => {
      const testData = {
        portalFormId: 'portal-789',
      };

      const mockResponseData = {
        success: true,
        formData: { id: 'portal-789' },
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponseData),
      };

      icmClientStub.loadPortalForm.resolves(mockResponse as any);

      const result = await icmService.loadPortalForm(
        testData,
        'test-token',
        'portal.example.com'
      );

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockResponseData);
      expect(icmClientStub.loadPortalForm.calledOnce).to.be.true;

      const [calledPayload, originalServer] =
        icmClientStub.loadPortalForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        portalFormId: 'portal-789',
        token: 'test-token',
      });
      expect(originalServer).to.equal('portal.example.com');
    });

    it('should return error when request data is null', async () => {
      const result = await icmService.loadPortalForm(null as any);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Request data is required');
      expect(result.status).to.equal(400);
      expect(icmClientStub.loadPortalForm.called).to.be.false;
    });

    it('should return error when request data is empty object', async () => {
      const result = await icmService.loadPortalForm({});

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Request data is required');
      expect(result.status).to.equal(400);
      expect(icmClientStub.loadPortalForm.called).to.be.false;
    });

    it('should handle ICM client API error responses', async () => {
      const testData = { portalFormId: 'invalid-form' };

      const mockErrorResponse = {
        error: 'Not Found',
        message: 'Portal form not found',
      };

      const mockResponse = {
        ok: false,
        status: 404,
        json: sinon.stub().resolves(mockErrorResponse),
      };

      icmClientStub.loadPortalForm.resolves(mockResponse as any);

      const result = await icmService.loadPortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Not Found');
      expect(result.status).to.equal(404);
    });

    it('should handle ICM client API error responses with default error message', async () => {
      const testData = { portalFormId: 'error-form' };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.loadPortalForm.resolves(mockResponse as any);

      const result = await icmService.loadPortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Error loading portal form. Please try again.'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle ICM client exceptions', async () => {
      const testData = { portalFormId: 'exception-form' };

      const clientError = new Error('Connection failed');
      icmClientStub.loadPortalForm.rejects(clientError);

      const result = await icmService.loadPortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to load portal form: Connection failed'
      );
      expect(result.status).to.equal(500);
    });

    it('should handle unknown errors', async () => {
      const testData = { portalFormId: 'unknown-error-form' };

      icmClientStub.loadPortalForm.rejects(new Error('Unknown error occurred'));

      const result = await icmService.loadPortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal(
        'Failed to load portal form: Unknown error occurred'
      );
      expect(result.status).to.equal(500);
    });

    it('should pass through additional parameters to ICM client', async () => {
      const testData = {
        portalFormId: 'complex-form',
        options: {
          includeHistory: true,
          version: 'latest',
          metadata: { source: 'portal', timestamp: '2023-01-01T00:00:00Z' },
        },
        filters: ['field1', 'field2'],
      };

      const mockResponseData = {
        success: true,
        formData: {
          id: 'complex-form',
          history: [{ version: '1.0' }, { version: '2.0' }],
          fields: { field1: 'value1', field2: 'value2' },
        },
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponseData),
      };

      icmClientStub.loadPortalForm.resolves(mockResponse as any);

      const result = await icmService.loadPortalForm(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockResponseData);
      expect(icmClientStub.loadPortalForm.calledOnce).to.be.true;

      const [calledPayload] = icmClientStub.loadPortalForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        portalFormId: 'complex-form',
        options: {
          includeHistory: true,
          version: 'latest',
          metadata: { source: 'portal', timestamp: '2023-01-01T00:00:00Z' },
        },
        filters: ['field1', 'field2'],
        token: 'test-token',
      });
    });

    it('should work without token parameter', async () => {
      const testData = {
        portalFormId: 'no-token-form',
        apiKey: 'api-key-123',
      };

      const mockResponseData = {
        success: true,
        formData: { id: 'no-token-form' },
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponseData),
      };

      icmClientStub.loadPortalForm.resolves(mockResponse as any);

      const result = await icmService.loadPortalForm(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockResponseData);
      expect(icmClientStub.loadPortalForm.calledOnce).to.be.true;

      const [calledPayload] = icmClientStub.loadPortalForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        portalFormId: 'no-token-form',
        apiKey: 'api-key-123',
      });
      expect(calledPayload.token).to.be.undefined;
    });
  });

  describe('submitForPortalAction', () => {
    it('should successfully submit portal action with all required fields', async () => {
      const testData = {
        tokenId: 'token-123',
        savedForm: 'form-data-json',
        config: { action: 'submit', workflow: 'approval' },
      };

      const mockResponseData = {
        success: true,
        actionId: 'action-456',
        status: 'submitted',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponseData),
      };

      icmClientStub.submitForPortalAction.resolves(mockResponse as any);

      const result = await icmService.submitForPortalAction(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockResponseData);
      expect(icmClientStub.submitForPortalAction.calledOnce).to.be.true;

      const calledPayload = icmClientStub.submitForPortalAction.getCall(0).args[0];
      expect(calledPayload).to.deep.equal({
        tokenId: 'token-123',
        savedForm: 'form-data-json',
        config: { action: 'submit', workflow: 'approval' },
      });
    });

    it('should return error when tokenId is missing', async () => {
      const testData = {
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      const result = await icmService.submitForPortalAction(testData as any);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Missing required fields: tokenId, savedForm, or config');
      expect(result.status).to.equal(400);
      expect(icmClientStub.submitForPortalAction.called).to.be.false;
    });

    it('should return error when savedForm is missing', async () => {
      const testData = {
        tokenId: 'token-123',
        config: { action: 'submit' },
      };

      const result = await icmService.submitForPortalAction(testData as any);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Missing required fields: tokenId, savedForm, or config');
      expect(result.status).to.equal(400);
      expect(icmClientStub.submitForPortalAction.called).to.be.false;
    });

    it('should return error when config is missing', async () => {
      const testData = {
        tokenId: 'token-123',
        savedForm: 'form-data-json',
      };

      const result = await icmService.submitForPortalAction(testData as any);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Missing required fields: tokenId, savedForm, or config');
      expect(result.status).to.equal(400);
      expect(icmClientStub.submitForPortalAction.called).to.be.false;
    });

    it('should handle ICM client API error responses', async () => {
      const testData = {
        tokenId: 'invalid-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      const mockErrorResponse = {
        error: 'Unauthorized',
        message: 'Invalid token provided',
      };

      const mockResponse = {
        ok: false,
        status: 401,
        json: sinon.stub().resolves(mockErrorResponse),
      };

      icmClientStub.submitForPortalAction.resolves(mockResponse as any);

      const result = await icmService.submitForPortalAction(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Unauthorized');
      expect(result.status).to.equal(401);
      expect(icmClientStub.submitForPortalAction.calledOnce).to.be.true;
    });

    it('should handle ICM client API error responses with default error message', async () => {
      const testData = {
        tokenId: 'error-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.submitForPortalAction.resolves(mockResponse as any);

      const result = await icmService.submitForPortalAction(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Error submitting button action. Please try again.');
      expect(result.status).to.equal(500);
      expect(icmClientStub.submitForPortalAction.calledOnce).to.be.true;
    });

    it('should handle ICM client exceptions', async () => {
      const testData = {
        tokenId: 'exception-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      const error = new Error('Network connection failed');
      icmClientStub.submitForPortalAction.rejects(error);

      const result = await icmService.submitForPortalAction(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Failed to submit button action: Network connection failed');
      expect(result.status).to.equal(500);
      expect(icmClientStub.submitForPortalAction.calledOnce).to.be.true;
    });

    it('should handle unknown errors', async () => {
      const testData = {
        tokenId: 'unknown-error-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      icmClientStub.submitForPortalAction.rejects(new Error('Unknown error occurred'));

      const result = await icmService.submitForPortalAction(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Failed to submit button action: Unknown error occurred');
      expect(result.status).to.equal(500);
      expect(icmClientStub.submitForPortalAction.calledOnce).to.be.true;
    });

    it('should pass through complex config structures', async () => {
      const testData = {
        tokenId: 'complex-token',
        savedForm: JSON.stringify({
          formData: { field1: 'value1', field2: 'value2' },
          metadata: { version: '2.0', lastModified: '2023-01-01' }
        }),
        config: {
          action: 'submit',
          options: {
            validate: true,
            notify: ['admin@example.com'],
            workflow: 'approval',
            priority: 'high'
          },
          routing: {
            successUrl: '/success',
            errorUrl: '/error'
          }
        },
      };

      const mockResponseData = {
        success: true,
        actionId: 'complex-action-789',
        workflowId: 'workflow-123',
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponseData),
      };

      icmClientStub.submitForPortalAction.resolves(mockResponse as any);

      const result = await icmService.submitForPortalAction(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(mockResponseData);
      expect(icmClientStub.submitForPortalAction.calledOnce).to.be.true;

      const calledPayload = icmClientStub.submitForPortalAction.getCall(0).args[0];
      expect(calledPayload).to.deep.equal(testData);
    });
  });

  describe('generateNewTemplate', () => {
    it('should successfully call Comm Layer and return success payload', async () => {
      const req = {
        attachmentId: '1-4ZYB80E',
        area: 'Service Request',
        formId: 'CF8787',
        CaseId: '1-4ZYB34V',
        username: 'DOKULSKI',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: sinon.stub().resolves({ errorCode: 0, message: 'Successfully generated the form' }),
      };

      icmClientStub.generateNewTemplate.resolves(mockResponse as any);

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ errorCode: 0, message: 'Successfully generated the form' });

      expect(icmClientStub.generateNewTemplate.calledOnce).to.be.true;
      const [calledPayload, originalServerArg] = icmClientStub.generateNewTemplate.getCall(0).args;
      expect(calledPayload).to.deep.equal(req);
      expect(originalServerArg).to.be.undefined;
    });

    it('should forward originalServer inside payload when originalServer is provided', async () => {
      const req = {
        attachmentId: '1-4ZYB80E',
        area: 'Service Request',
        formId: 'CF8787',
        originalServer: 'icm-dev.internal',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: sinon.stub().resolves({ errorCode: 0, message: 'ok' }),
      };

      icmClientStub.generateNewTemplate.resolves(mockResponse as any);

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.true;

      // Verify call shape
      expect(icmClientStub.generateNewTemplate.calledOnce).to.be.true;
      const [calledPayload, originalServerArg] =
        icmClientStub.generateNewTemplate.getCall(0).args;

      // Service currently forwards originalServer in the body (not as 2nd arg)
      expect(calledPayload).to.deep.equal({
        attachmentId: '1-4ZYB80E',
        area: 'Service Request',
        formId: 'CF8787',
        originalServer: 'icm-dev.internal',
      });
      expect(originalServerArg).to.be.undefined;
    });

    it('should return 400 when attachmentId is missing', async () => {
      const req = { area: 'Service Request', formId: 'CF8787' } as any;

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.false;
      expect(result.status).to.equal(400);
      expect(result.error).to.match(/attachmentId/i);
      expect(icmClientStub.generateNewTemplate.called).to.be.false;
    });

    it('should return 400 when area is missing', async () => {
      const req = { attachmentId: '1-4ZYB80E', formId: 'CF8787' } as any;

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.false;
      expect(result.status).to.equal(400);
      expect(result.error).to.match(/Area/i);
      expect(icmClientStub.generateNewTemplate.called).to.be.false;
    });

    it('should return 400 when formId is missing', async () => {
      const req = { attachmentId: '1-4ZYB80E', area: 'Service Request' } as any;

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.false;
      expect(result.status).to.equal(400);
      expect(result.error).to.match(/FormId/i);
      expect(icmClientStub.generateNewTemplate.called).to.be.false;
    });

    it('should surface CL error (400) message to caller', async () => {
      const req = {
        attachmentId: 'bad',
        area: 'Service Request',
        formId: 'CF8787',
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: sinon.stub().resolves({ error: 'The form cannot be generated.' }),
      };

      icmClientStub.generateNewTemplate.resolves(mockResponse as any);

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.false;
      expect(result.status).to.equal(400);
      expect(result.error).to.equal('The form cannot be generated.');
    });

    it('should use default error message when CL returns no error body', async () => {
      const req = {
        attachmentId: '1-4ZYB80E',
        area: 'Service Request',
        formId: 'CF8787',
      };

      const mockResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({}),
      };

      icmClientStub.generateNewTemplate.resolves(mockResponse as any);

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.false;
      expect(result.status).to.equal(500);
      expect(result.error).to.equal('The form cannot be generated.');
    });

    it('should map client exceptions to 500 with helpful message', async () => {
      const req = {
        attachmentId: '1-4ZYB80E',
        area: 'Service Request',
        formId: 'CF8787',
      };

      icmClientStub.generateNewTemplate.rejects(new Error('Network connection failed'));

      const result = await icmService.generateNewTemplate(req);

      expect(result.success).to.be.false;
      expect(result.status).to.equal(500);
      expect(result.error).to.equal('Failed to generate new template: Network connection failed');
    });
  });

  describe('saveFormData', () => {
    it('should successfully save form data with save action and return structured response', async () => {
      const testData = {
        action: 'save' as const,
        formState: {
          field1: 'test value',
          field2: 'another value'
        },
        groupState: {},
        formDefinition: {
          id: 'test-form',
          version: '1.0',
          elements: [
            {
              uuid: 'field1',
              type: 'text',
              visible_web: true
            },
            {
              uuid: 'field2',
              type: 'text',
              visible_web: true
            }
          ]
        },
        metadata: {
          created_date: new Date().toISOString()
        },
        items: [
          {
            uuid: 'field1',
            type: 'text',
            visible_web: true
          },
          {
            uuid: 'field2',
            type: 'text',
            visible_web: true
          }
        ],
        sessionParams: {
          attachmentId: 'test-attachment',
          OfficeName: 'test-office',
          username: 'testuser'
        }
      };

      const mockSaveResponse = {
        ok: true,
        json: sinon.stub().resolves({ status: 'success', id: 'saved-123' }),
      };

      icmClientStub.saveICMData.resolves(mockSaveResponse as any);

      const result = await icmService.saveFormData(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        saved: true,
        action: 'save'
      });
      expect(icmClientStub.saveICMData.calledOnce).to.be.true;

      // Verify the saveICMData was called with the correct transformed payload
      const calledPayload = icmClientStub.saveICMData.getCall(0).args[0];
      expect(calledPayload).to.have.property('attachmentId', 'test-attachment');
      expect(calledPayload).to.have.property('OfficeName', 'test-office');
      expect(calledPayload).to.have.property('savedForm');

      // Verify savedForm is stringified saved data structure
      const savedForm = JSON.parse(calledPayload.savedForm);
      expect(savedForm).to.have.property('data');
      expect(savedForm).to.have.property('form_definition');
      expect(savedForm).to.have.property('metadata');
      expect(savedForm.data).to.deep.equal({
        field1: 'test value',
        field2: 'another value'
      });
    });

    it('should successfully handle save_and_close action with unlock orchestration', async () => {
      const testData = {
        action: 'save_and_close' as const,
        formState: { field1: 'test value' },
        groupState: {},
        formDefinition: { id: 'test-form', elements: [] },
        metadata: {},
        items: [],
        sessionParams: {
          attachmentId: 'test-attachment',
          OfficeName: 'test-office',
          username: 'testuser'
        }
      };

      const mockSaveResponse = {
        ok: true,
        json: sinon.stub().resolves({ status: 'success' }),
      };

      const mockUnlockResponse = {
        ok: true,
        json: sinon.stub().resolves({ unlocked: true }),
      };

      icmClientStub.saveICMData.resolves(mockSaveResponse as any);
      icmClientStub.unlockICMData.resolves(mockUnlockResponse as any);

      const result = await icmService.saveFormData(testData, 'test-token');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({
        saved: true,
        unlocked: true,
        action: 'save_and_close'
      });
      expect(icmClientStub.saveICMData.calledOnce).to.be.true;
      expect(icmClientStub.unlockICMData.calledOnce).to.be.true;
    });

    it('should return error when missing required fields', async () => {
      const testData = {
        // Missing required 'action' field
        formState: {},
        formDefinition: {},
        items: [],
        sessionParams: {}
      };

      const result = await icmService.saveFormData(testData as any);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Missing required fields: action, formState, formDefinition, or items');
      expect(result.status).to.equal(400);
      expect(icmClientStub.saveICMData.called).to.be.false;
      expect(icmClientStub.unlockICMData.called).to.be.false;
    });
  });
});
