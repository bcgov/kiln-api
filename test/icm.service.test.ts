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
      expect(result.error).to.equal('Error unlocking ICM form. Please try again.');
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
      expect(result.error).to.equal('Failed to unlock ICM data: Network timeout');
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
      expect(result.error).to.equal('Error loading saved JSON. Please try again.');
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
        json: sinon
          .stub()
          .resolves({ formId: 'generated-123', success: true, status: 'created' }),
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
      expect(result.data).to.deep.equal({ formId: 'generated-456', success: true });
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
      expect(result.error).to.equal('Failed to generate form: Template not found');
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

  describe('generatePortalForm (service)', () => {
    it('should use token when provided (over username)', async () => {
      const testData = {
        username: 'user1',
        formType: 'portal',
        templateId: 't-1',
        originalServer: 'https://server.example.com',
        extra: 'ok',
      };

      const mockResponse = { ok: true, json: sinon.stub().resolves({ id: 'p-123' }) };
      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(testData, 'TOKEN-123');

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ id: 'p-123' });

      const [calledPayload, originalServer] =
        icmClientStub.generatePortalForm.getCall(0).args;

      expect(calledPayload).to.deep.equal({
        formType: 'portal',
        templateId: 't-1',
        extra: 'ok',
        token: 'TOKEN-123',
      });
      expect(originalServer).to.equal('https://server.example.com');
    });

    it('should use username when token not provided', async () => {
      const testData = {
        username: 'jane',
        formVersionRefId: 'FV-1',
      };

      const mockResponse = { ok: true, json: sinon.stub().resolves({ ok: true }) };
      icmClientStub.generatePortalForm.resolves(mockResponse as any);

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal({ ok: true });

      const [calledPayload] = icmClientStub.generatePortalForm.getCall(0).args;
      expect(calledPayload).to.deep.equal({
        formVersionRefId: 'FV-1',
        username: 'jane',
      });
    });

    it('should return 401 when neither token nor username present', async () => {
      const result = await icmService.generatePortalForm({ formType: 'portal' } as any);
      expect(result.success).to.be.false;
      expect(result.status).to.equal(401);
      expect(result.error).to.match(/Authentication required/i);
    });

    it('should handle client error cleanly', async () => {
      const testData = { username: 'x', formType: 'portal' };
      icmClientStub.generatePortalForm.rejects(new Error('Boom'));

      const result = await icmService.generatePortalForm(testData);

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Failed to generate portal form: Boom');
      expect(result.status).to.equal(500);
    });
  });

});
