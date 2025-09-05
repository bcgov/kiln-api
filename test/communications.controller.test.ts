import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import Server from '../server';
import ICMService from '../server/api/services/icm.service';

describe('Communications Controller', () => {
  let loadICMDataStub: sinon.SinonStub;
  let unlockICMDataStub: sinon.SinonStub;
  let loadSavedJsonStub: sinon.SinonStub;
  let generateFormStub: sinon.SinonStub;
  let pdfRenderStub: sinon.SinonStub;
  let generatePortalFormStub: sinon.SinonStub;
  let loadPortalFormStub: sinon.SinonStub;
  let submitForPortalActionStub: sinon.SinonStub;

  beforeEach(() => {
    loadICMDataStub = sinon.stub(ICMService, 'loadICMData');
    unlockICMDataStub = sinon.stub(ICMService, 'unlockICMData');
    loadSavedJsonStub = sinon.stub(ICMService, 'loadSavedJson');
    generateFormStub = sinon.stub(ICMService, 'generateForm');
    pdfRenderStub = sinon.stub(ICMService, 'pdfRender');
    generatePortalFormStub = sinon.stub(ICMService, 'generatePortalForm');
    loadPortalFormStub = sinon.stub(ICMService, 'loadPortalForm');
    submitForPortalActionStub = sinon.stub(ICMService, 'submitForPortalAction');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('generateForm endpoint', () => {
    it('should successfully generate form with username', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      generateFormStub.resolves({
        success: true,
        data: { formId: 'generated-123', success: true, status: 'created' },
      });

      const response = await request(Server)
        .post('/api/generateForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        formId: 'generated-123',
        success: true,
        status: 'created',
      });

      expect(generateFormStub.calledOnce).to.be.true;
      const [data, token] = generateFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'registration',
        templateId: 'template-123',
        username: 'testuser',
        originalServer: undefined,
      });
      expect(token).to.be.undefined;
    });

    it('should successfully generate form with token in Authorization header', async () => {
      const testData = {
        formType: 'application',
        templateId: 'template-456',
      };

      generateFormStub.resolves({
        success: true,
        data: { formId: 'generated-456', success: true },
      });

      const response = await request(Server)
        .post('/api/generateForm')
        .set('Authorization', 'Bearer test-token-123')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        formId: 'generated-456',
        success: true,
      });

      const [data, token] = generateFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'application',
        templateId: 'template-456',
        username: undefined,
        originalServer: undefined,
      });
      expect(token).to.equal('test-token-123');
    });

    it('should successfully generate form with token in request body', async () => {
      const testData = {
        token: 'body-token-789',
        formType: 'survey',
        templateId: 'template-789',
      };

      generateFormStub.resolves({
        success: true,
        data: { formId: 'generated-789', success: true },
      });

      const response = await request(Server)
        .post('/api/generateForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        formId: 'generated-789',
        success: true,
      });

      const [data, token] = generateFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'survey',
        templateId: 'template-789',
        username: undefined,
        originalServer: undefined,
      });
      expect(token).to.equal('body-token-789');
    });

    it('should pass through originalServer from headers', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      generateFormStub.resolves({
        success: true,
        data: { formId: 'generated-original', success: true },
      });

      await request(Server)
        .post('/api/generateForm')
        .set('x-original-server', 'https://original.example.com')
        .send(testData)
        .expect(200);

      const [data] = generateFormStub.getCall(0).args;
      expect(data.originalServer).to.equal('https://original.example.com');
    });

    it('should handle ICM service error responses', async () => {
      const testData = {
        username: 'testuser',
        formType: 'invalid-type',
        templateId: 'template-123',
      };

      generateFormStub.resolves({
        success: false,
        error: 'Invalid form type provided',
        status: 400,
      });

      const response = await request(Server)
        .post('/api/generateForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).to.deep.equal({
        error: 'Invalid form type provided',
      });
    });

    it('should handle ICM service error with default status 500', async () => {
      const testData = {
        username: 'testuser',
        formType: 'registration',
        templateId: 'template-123',
      };

      generateFormStub.resolves({
        success: false,
        error: 'Internal form generation error',
      });

      const response = await request(Server)
        .post('/api/generateForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal form generation error',
      });
    });

    it('should pass through all request body parameters', async () => {
      const testData = {
        username: 'testuser',
        formType: 'complex',
        templateId: 'template-complex',
        customField1: 'value1',
        customField2: 'value2',
        metadata: { version: '2.0', source: 'api' },
      };

      generateFormStub.resolves({
        success: true,
        data: { formId: 'generated-complex', success: true },
      });

      await request(Server)
        .post('/api/generateForm')
        .send(testData)
        .expect(200);

      const [data] = generateFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'complex',
        templateId: 'template-complex',
        customField1: 'value1',
        customField2: 'value2',
        metadata: { version: '2.0', source: 'api' },
        username: 'testuser',
        originalServer: undefined,
      });
    });

    it('should prioritize token from request body over Authorization header', async () => {
      const testData = {
        token: 'body-token-priority',
        formType: 'priority-test',
        templateId: 'template-priority',
      };

      generateFormStub.resolves({
        success: true,
        data: { formId: 'generated-priority', success: true },
      });

      await request(Server)
        .post('/api/generateForm')
        .set('Authorization', 'Bearer header-token-ignored')
        .send(testData)
        .expect(200);

      const [data, token] = generateFormStub.getCall(0).args;
      expect(token).to.equal('body-token-priority');
      expect(data).to.deep.equal({
        formType: 'priority-test',
        templateId: 'template-priority',
        username: undefined,
        originalServer: undefined,
      });
    });
  });

  describe('loadICMData endpoint', () => {
    it('should successfully load ICM data with username', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      loadICMDataStub.resolves({
        success: true,
        data: { formData: { field1: 'value1' }, status: 'loaded' },
      });

      const response = await request(Server)
        .post('/api/loadICMData')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        formData: { field1: 'value1' },
        status: 'loaded',
      });

      expect(loadICMDataStub.calledOnce).to.be.true;
      const [data, token] = loadICMDataStub.getCall(0).args;
      expect(data).to.deep.equal({
        formId: 'form-123',
        username: 'testuser',
        originalServer: undefined,
      });
      expect(token).to.be.undefined;
    });

    it('should successfully load ICM data with token in Authorization header', async () => {
      const testData = {
        formId: 'form-123',
      };

      loadICMDataStub.resolves({
        success: true,
        data: { formData: { field1: 'value1' } },
      });

      const response = await request(Server)
        .post('/api/loadICMData')
        .set('Authorization', 'Bearer test-token-123')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({ formData: { field1: 'value1' } });

      const [data, token] = loadICMDataStub.getCall(0).args;
      expect(data).to.deep.equal({
        formId: 'form-123',
        username: undefined,
        originalServer: undefined,
      });
      expect(token).to.equal('test-token-123');
    });

    it('should pass through originalServer from headers', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      loadICMDataStub.resolves({
        success: true,
        data: { formData: { field1: 'value1' } },
      });

      await request(Server)
        .post('/api/loadICMData')
        .set('x-original-server', 'https://original.example.com')
        .send(testData)
        .expect(200);

      const [data] = loadICMDataStub.getCall(0).args;
      expect(data.originalServer).to.equal('https://original.example.com');
    });

    it('should handle ICM service error responses', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      loadICMDataStub.resolves({
        success: false,
        error: 'Form not found',
        status: 404,
      });

      const response = await request(Server)
        .post('/api/loadICMData')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).to.deep.equal({ error: 'Form not found' });
    });

    it('should handle ICM service error with default status 500', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
      };

      loadICMDataStub.resolves({
        success: false,
        error: 'Internal server error',
      });

      const response = await request(Server)
        .post('/api/loadICMData')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({ error: 'Internal server error' });
    });
  });

  describe('clearICMLockedFlag endpoint', () => {
    it('should successfully clear ICM locked flag with username', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      unlockICMDataStub.resolves({
        success: true,
        data: { unlocked: true, formId: 'form-123', status: 'unlocked' },
      });

      const response = await request(Server)
        .post('/api/clearICMLockedFlag')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        unlocked: true,
        formId: 'form-123',
        status: 'unlocked',
      });

      expect(unlockICMDataStub.calledOnce).to.be.true;
      const [data, token] = unlockICMDataStub.getCall(0).args;
      expect(data).to.deep.equal({
        formId: 'form-123',
        lockId: 'lock-456',
        username: 'testuser',
      });
      expect(token).to.be.undefined;
    });

    it('should successfully clear ICM locked flag with token in Authorization header', async () => {
      const testData = {
        formId: 'form-123',
        lockId: 'lock-456',
      };

      unlockICMDataStub.resolves({
        success: true,
        data: { unlocked: true, formId: 'form-123' },
      });

      const response = await request(Server)
        .post('/api/clearICMLockedFlag')
        .set('Authorization', 'Bearer test-token-456')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        unlocked: true,
        formId: 'form-123',
      });

      const [data, token] = unlockICMDataStub.getCall(0).args;
      expect(data).to.deep.equal({
        formId: 'form-123',
        lockId: 'lock-456',
        username: undefined,
      });
      expect(token).to.equal('test-token-456');
    });

    it('should successfully clear ICM locked flag with token in request body', async () => {
      const testData = {
        token: 'body-token-789',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      unlockICMDataStub.resolves({
        success: true,
        data: { unlocked: true },
      });

      const response = await request(Server)
        .post('/api/clearICMLockedFlag')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({ unlocked: true });

      const [data, token] = unlockICMDataStub.getCall(0).args;
      expect(data).to.deep.equal({
        formId: 'form-123',
        lockId: 'lock-456',
        username: undefined,
      });
      expect(token).to.equal('body-token-789');
    });

    it('should handle ICM service error responses', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      unlockICMDataStub.resolves({
        success: false,
        error: 'Insufficient permissions',
        status: 403,
      });

      const response = await request(Server)
        .post('/api/clearICMLockedFlag')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).to.deep.equal({
        error: 'Insufficient permissions',
      });
    });

    it('should handle ICM service error with default status 500', async () => {
      const testData = {
        username: 'testuser',
        formId: 'form-123',
        lockId: 'lock-456',
      };

      unlockICMDataStub.resolves({
        success: false,
        error: 'Internal unlock error',
      });

      const response = await request(Server)
        .post('/api/clearICMLockedFlag')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({ error: 'Internal unlock error' });
    });
  });

  describe('loadSavedJson endpoint', () => {
    it('should successfully load saved JSON data', async () => {
      const testData = {
        formId: 'form-123',
        version: '1.0',
      };

      loadSavedJsonStub.resolves({
        success: true,
        data: {
          success: true,
          data: {
            savedJson: { field1: 'value1', field2: 'value2' },
            version: '1.0',
            formId: 'form-123',
          },
        },
      });

      const response = await request(Server)
        .post('/api/loadSavedJson')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        success: true,
        data: {
          savedJson: { field1: 'value1', field2: 'value2' },
          version: '1.0',
          formId: 'form-123',
        },
      });

      expect(loadSavedJsonStub.calledOnce).to.be.true;
      const params = loadSavedJsonStub.getCall(0).args[0];
      expect(params).to.deep.equal({
        formId: 'form-123',
        version: '1.0',
      });
    });

    it('should handle ICM service error responses', async () => {
      const testData = {
        formId: 'form-123',
      };

      loadSavedJsonStub.resolves({
        success: false,
        error: 'Saved JSON not found',
        status: 404,
      });

      const response = await request(Server)
        .post('/api/loadSavedJson')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).to.deep.equal({ error: 'Saved JSON not found' });
    });

    it('should handle ICM service error with default status 500', async () => {
      const testData = {
        formId: 'form-123',
      };

      loadSavedJsonStub.resolves({
        success: false,
        error: 'Internal server error loading saved JSON',
      });

      const response = await request(Server)
        .post('/api/loadSavedJson')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal server error loading saved JSON',
      });
    });

    it('should pass through all request body parameters', async () => {
      const testData = {
        formId: 'form-456',
        version: '2.1',
        includeMetadata: true,
        userId: 'user-789',
      };

      loadSavedJsonStub.resolves({
        success: true,
        data: { savedJson: { data: 'test' } },
      });

      await request(Server)
        .post('/api/loadSavedJson')
        .send(testData)
        .expect(200);

      const params = loadSavedJsonStub.getCall(0).args[0];
      expect(params).to.deep.equal({
        formId: 'form-456',
        version: '2.1',
        includeMetadata: true,
        userId: 'user-789',
      });
    });
  });

  describe('pdfRender endpoint', () => {
    it('should successfully generate PDF with template ID in URL', async () => {
      const pdfTemplateId = 'invoice-template-123';
      const formData = {
        customerName: 'John Doe',
        amount: 1500,
        invoiceDate: '2024-01-15',
      };

      const mockPdfBuffer = Buffer.from('PDF binary content here');
      pdfRenderStub.resolves({
        success: true,
        data: mockPdfBuffer,
      });

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect(200);

      // Debug: Check if stub was called
      expect(pdfRenderStub.calledOnce).to.be.true;
      expect(response.headers['content-type']).to.equal('application/pdf');
      expect(response.body).to.deep.equal(mockPdfBuffer);

      const serviceData = pdfRenderStub.getCall(0).args[0];
      expect(serviceData).to.deep.equal({
        pdfTemplateId: 'invoice-template-123',
        customerName: 'John Doe',
        amount: 1500,
        invoiceDate: '2024-01-15',
      });
    });

    it('should return 404 when PDF template ID is missing from URL', async () => {
      const formData = { data: 'test' };

      await request(Server).post('/api/pdfRender/').send(formData).expect(404); // Express route not found

      expect(pdfRenderStub.called).to.be.false;
    });

    it('should handle empty form data correctly', async () => {
      const pdfTemplateId = 'empty-template';

      const mockPdfBuffer = Buffer.from('Empty template PDF');
      pdfRenderStub.resolves({
        success: true,
        data: mockPdfBuffer,
      });

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send({})
        .expect('Content-Type', 'application/pdf')
        .expect(200);

      expect(response.body).to.deep.equal(mockPdfBuffer);

      const serviceData = pdfRenderStub.getCall(0).args[0];
      expect(serviceData).to.deep.equal({
        pdfTemplateId: 'empty-template',
      });
    });

    it('should handle ICM service error responses', async () => {
      const pdfTemplateId = 'invalid-template';
      const formData = { data: 'test' };

      pdfRenderStub.resolves({
        success: false,
        error: 'Template not found',
        status: 404,
      });

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).to.deep.equal({
        error: 'Template not found',
      });
    });

    it('should handle ICM service error with default status 500', async () => {
      const pdfTemplateId = 'error-template';
      const formData = { data: 'test' };

      pdfRenderStub.resolves({
        success: false,
        error: 'Internal PDF generation error',
      });

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal PDF generation error',
      });
    });

    it('should handle service success but missing data', async () => {
      const pdfTemplateId = 'template-no-data';
      const formData = { data: 'test' };

      pdfRenderStub.resolves({
        success: true,
        data: null,
      });

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.have.property('error');
    });

    it('should pass through complex form data structures', async () => {
      const pdfTemplateId = 'complex-report';
      const formData = {
        report: {
          title: 'Annual Report',
          sections: [
            { name: 'Summary', content: 'Executive summary' },
            { name: 'Details', content: 'Detailed analysis' },
          ],
        },
        metadata: {
          author: 'John Smith',
          department: 'Finance',
          tags: ['annual', 'financial', '2024'],
        },
        settings: {
          includeCharts: true,
          pageNumbers: true,
        },
      };

      const mockPdfBuffer = Buffer.from('Complex report PDF');
      pdfRenderStub.resolves({
        success: true,
        data: mockPdfBuffer,
      });

      await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', 'application/pdf')
        .expect(200);

      const serviceData = pdfRenderStub.getCall(0).args[0];
      expect(serviceData).to.deep.equal({
        pdfTemplateId: 'complex-report',
        report: {
          title: 'Annual Report',
          sections: [
            { name: 'Summary', content: 'Executive summary' },
            { name: 'Details', content: 'Detailed analysis' },
          ],
        },
        metadata: {
          author: 'John Smith',
          department: 'Finance',
          tags: ['annual', 'financial', '2024'],
        },
        settings: {
          includeCharts: true,
          pageNumbers: true,
        },
      });
    });

    it('should handle special characters in template ID', async () => {
      const pdfTemplateId = 'template_with-special.chars@123';
      const formData = { field: 'value' };

      const mockPdfBuffer = Buffer.from('PDF with special template ID');
      pdfRenderStub.resolves({
        success: true,
        data: mockPdfBuffer,
      });

      await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', 'application/pdf')
        .expect(200);

      const serviceData = pdfRenderStub.getCall(0).args[0];
      expect(serviceData.pdfTemplateId).to.equal(
        'template_with-special.chars@123'
      );
    });

    it('should handle large PDF responses', async () => {
      const pdfTemplateId = 'large-document';
      const formData = { content: 'Large document content' };

      const largePdfBuffer = Buffer.alloc(2 * 1024 * 1024, 'L'); // 2MB PDF
      pdfRenderStub.resolves({
        success: true,
        data: largePdfBuffer,
      });

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', 'application/pdf')
        .expect(200);

      expect(response.body.length).to.equal(2 * 1024 * 1024);
      expect(response.body.equals(largePdfBuffer)).to.be.true;
    });

    it('should handle ICMService exceptions in try-catch', async () => {
      const pdfTemplateId = 'exception-template';
      const formData = { data: 'test' };

      pdfRenderStub.rejects(new Error('Service unavailable'));

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Service unavailable',
      });
    });

    it('should handle non-Error exceptions in try-catch', async () => {
      const pdfTemplateId = 'unknown-error-template';
      const formData = { data: 'test' };

      pdfRenderStub.rejects('Unknown error occurred');

      const response = await request(Server)
        .post(`/api/pdfRender/${pdfTemplateId}`)
        .send(formData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal server error',
      });
    });
  });

  describe('generatePortalForm endpoint', () => {
    it('should successfully generate portal form with username', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-123',
      };

      generatePortalFormStub.resolves({
        success: true,
        data: { save_data: { id: 'pf-123', built: true }, status: 'created' },
      });

      const response = await request(Server)
        .post('/api/generatePortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        save_data: { id: 'pf-123', built: true },
        status: 'created',
      });

      expect(generatePortalFormStub.calledOnce).to.be.true;
      const [data, token] = generatePortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-123',
        username: 'testuser',
        originalServer: undefined,
      });
      expect(token).to.be.undefined;
    });

    it('should successfully generate portal form with token in Authorization header', async () => {
      const testData = {
        formType: 'portal',
        templateId: 'tpl-456',
      };

      generatePortalFormStub.resolves({
        success: true,
        data: { save_data: { id: 'pf-456' }, ok: true },
      });

      const response = await request(Server)
        .post('/api/generatePortalForm')
        .set('Authorization', 'Bearer header-token-123')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        save_data: { id: 'pf-456' },
        ok: true,
      });

      const [data, token] = generatePortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-456',
        username: undefined,
        originalServer: undefined,
      });
      expect(token).to.equal('header-token-123');
    });

    it('should prioritize token from request body over Authorization header', async () => {
      const testData = {
        token: 'body-token-999',
        formType: 'portal',
        templateId: 'tpl-priority',
      };

      generatePortalFormStub.resolves({
        success: true,
        data: { save_data: { id: 'pf-priority' } },
      });

      const response = await request(Server)
        .post('/api/generatePortalForm')
        .set('Authorization', 'Bearer header-token-should-be-ignored')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({ save_data: { id: 'pf-priority' } });

      const [data, token] = generatePortalFormStub.getCall(0).args;
      expect(token).to.equal('body-token-999');
      expect(data).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-priority',
        username: undefined,
        originalServer: undefined,
      });
    });

    it('should pass through originalServer from headers', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-os',
      };

      generatePortalFormStub.resolves({
        success: true,
        data: { save_data: { id: 'pf-os' } },
      });

      await request(Server)
        .post('/api/generatePortalForm')
        .set('x-original-server', 'https://icm-dev.internal')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      const [data] = generatePortalFormStub.getCall(0).args;
      expect(data.originalServer).to.equal('https://icm-dev.internal');
    });

    it('should return 401 when service reports authentication error', async () => {
      generatePortalFormStub.resolves({
        success: false,
        status: 401,
        error: 'Authentication required',
      });

      const response = await request(Server)
        .post('/api/generatePortalForm')
        .send({ formType: 'portal', templateId: 'tpl-unauth' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).to.deep.equal({ error: 'Authentication required' });
    });

    it('should handle service error with default status 500', async () => {
      generatePortalFormStub.resolves({
        success: false,
        error: 'Internal portal generation error',
      });

      const response = await request(Server)
        .post('/api/generatePortalForm')
        .send({ formType: 'portal', templateId: 'tpl-err' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal portal generation error',
      });
    });

    it('should pass through all request body parameters', async () => {
      const testData = {
        username: 'testuser',
        formType: 'portal',
        templateId: 'tpl-777',
        customField1: 'v1',
        customField2: 2,
        metadata: { source: 'api' },
      };

      generatePortalFormStub.resolves({
        success: true,
        data: { save_data: { id: 'pf-777' } },
      });

      await request(Server)
        .post('/api/generatePortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      const [data] = generatePortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        formType: 'portal',
        templateId: 'tpl-777',
        customField1: 'v1',
        customField2: 2,
        metadata: { source: 'api' },
        username: 'testuser',
        originalServer: undefined,
      });
    });
  });

  describe('loadPortalForm endpoint', () => {
    it('should successfully load portal form with basic request data', async () => {
      const testData = {
        portalFormId: 'portal-123',
        userId: 'user-456',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: {
          success: true,
          formData: {
            id: 'portal-123',
            fields: { field1: 'value1', field2: 'value2' },
            version: '2.0',
          },
        },
      });

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        success: true,
        formData: {
          id: 'portal-123',
          fields: { field1: 'value1', field2: 'value2' },
          version: '2.0',
        },
      });

      expect(loadPortalFormStub.calledOnce).to.be.true;
      const [data, token, originalServer] = loadPortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        portalFormId: 'portal-123',
        userId: 'user-456',
      });
      expect(token).to.be.undefined;
      expect(originalServer).to.be.undefined;
    });

    it('should successfully load portal form with token in Authorization header', async () => {
      const testData = {
        portalFormId: 'portal-789',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: { success: true, formData: { id: 'portal-789' } },
      });

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .set('Authorization', 'Bearer test-token-123')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        success: true,
        formData: { id: 'portal-789' },
      });

      const [data, token, originalServer] = loadPortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({ portalFormId: 'portal-789' });
      expect(token).to.equal('test-token-123');
      expect(originalServer).to.be.undefined;
    });

    it('should successfully load portal form with Bearer prefix removed from token', async () => {
      const testData = {
        portalFormId: 'portal-bearer-test',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: { success: true, formData: { id: 'portal-bearer-test' } },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .set('Authorization', 'Bearer clean-token-456')
        .send(testData)
        .expect(200);

      const [, token] = loadPortalFormStub.getCall(0).args;
      expect(token).to.equal('clean-token-456');
    });

    it('should pass through originalServer from x-original-server header', async () => {
      const testData = {
        portalFormId: 'portal-original-server',
        userId: 'user-123',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: { success: true, formData: { id: 'portal-original-server' } },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .set('x-original-server', 'https://portal.example.com')
        .send(testData)
        .expect(200);

      const [data, token, originalServer] = loadPortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        portalFormId: 'portal-original-server',
        userId: 'user-123',
      });
      expect(token).to.be.undefined;
      expect(originalServer).to.equal('https://portal.example.com');
    });

    it('should handle token and originalServer together', async () => {
      const testData = {
        portalFormId: 'portal-combined',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: { success: true, formData: { id: 'portal-combined' } },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .set('Authorization', 'Bearer combined-token-789')
        .set('x-original-server', 'https://combined.example.com')
        .send(testData)
        .expect(200);

      const [data, token, originalServer] = loadPortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({ portalFormId: 'portal-combined' });
      expect(token).to.equal('combined-token-789');
      expect(originalServer).to.equal('https://combined.example.com');
    });

    it('should handle ICM service error responses', async () => {
      const testData = { portalFormId: 'invalid-portal-form' };

      loadPortalFormStub.resolves({
        success: false,
        error: 'Portal form not found',
        status: 404,
      });

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).to.deep.equal({
        error: 'Portal form not found',
      });
    });

    it('should handle ICM service error with default status 500', async () => {
      const testData = { portalFormId: 'error-portal-form' };

      loadPortalFormStub.resolves({
        success: false,
        error: 'Internal portal form loading error',
      });

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal portal form loading error',
      });
    });

    it('should pass through all request body parameters', async () => {
      const testData = {
        portalFormId: 'portal-complex',
        userId: 'user-complex',
        options: {
          includeHistory: true,
          version: 'latest',
          metadata: { source: 'portal', timestamp: '2023-01-01T00:00:00Z' },
        },
        filters: ['field1', 'field2'],
        apiKey: 'api-key-123',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: {
          success: true,
          formData: {
            id: 'portal-complex',
            history: [{ version: '1.0' }, { version: '2.0' }],
            fields: { field1: 'value1', field2: 'value2' },
          },
        },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect(200);

      const [data] = loadPortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        portalFormId: 'portal-complex',
        userId: 'user-complex',
        options: {
          includeHistory: true,
          version: 'latest',
          metadata: { source: 'portal', timestamp: '2023-01-01T00:00:00Z' },
        },
        filters: ['field1', 'field2'],
        apiKey: 'api-key-123',
      });
    });

    it('should handle empty request body', async () => {
      loadPortalFormStub.resolves({
        success: false,
        error: 'Request data is required',
        status: 400,
      });

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .send({})
        .expect(400);

      expect(response.status).to.equal(400);

      if (loadPortalFormStub.called) {
        const [data] = loadPortalFormStub.getCall(0).args;
        expect(data).to.deep.equal({});
      }
    });

    it('should handle Authorization header without Bearer prefix', async () => {
      const testData = {
        portalFormId: 'portal-no-bearer',
      };

      loadPortalFormStub.resolves({
        success: true,
        data: { success: true, formData: { id: 'portal-no-bearer' } },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .set('Authorization', 'direct-token-123')
        .send(testData)
        .expect(200);

      const [, token] = loadPortalFormStub.getCall(0).args;
      expect(token).to.equal('direct-token-123');
    });

    it('should handle complex nested data structures', async () => {
      const testData = {
        portalFormId: 'portal-nested',
        configuration: {
          display: {
            theme: 'dark',
            language: 'en',
            features: {
              autoSave: true,
              validation: { strict: true, async: false },
            },
          },
          data: {
            preload: ['section1', 'section2'],
            cache: { enabled: true, ttl: 300 },
          },
        },
        metadata: {
          requestId: 'req-789',
          timestamp: '2024-01-01T00:00:00.000Z',
          tags: ['portal', 'test', 'nested'],
        },
      };

      loadPortalFormStub.resolves({
        success: true,
        data: {
          success: true,
          formData: { id: 'portal-nested', processedConfiguration: true },
        },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect(200);

      const [data] = loadPortalFormStub.getCall(0).args;
      expect(data).to.deep.equal({
        portalFormId: 'portal-nested',
        configuration: {
          display: {
            theme: 'dark',
            language: 'en',
            features: {
              autoSave: true,
              validation: { strict: true, async: false },
            },
          },
          data: {
            preload: ['section1', 'section2'],
            cache: { enabled: true, ttl: 300 },
          },
        },
        metadata: {
          requestId: 'req-789',
          timestamp: '2024-01-01T00:00:00.000Z',
          tags: ['portal', 'test', 'nested'],
        },
      });
    });

    it('should handle ICMService exceptions in try-catch', async () => {
      const testData = { portalFormId: 'exception-portal-form' };

      loadPortalFormStub.rejects(new Error('Portal service unavailable'));

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Portal service unavailable',
      });
    });

    it('should handle non-Error exceptions in try-catch', async () => {
      const testData = { portalFormId: 'unknown-error-portal-form' };

      loadPortalFormStub.rejects('Unknown portal error occurred');

      const response = await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal server error',
      });
    });

    it('should handle large payload data correctly', async () => {
      const testData = {
        portalFormId: 'portal-large-payload',
        largeData: {
          records: new Array(100).fill(null).map((_, i) => ({
            id: i,
            name: `Record ${i}`,
            data: `Large data content for record ${i}`.repeat(10),
          })),
          metadata: {
            totalSize: '1MB',
            compressed: false,
            encoding: 'utf-8',
          },
        },
      };

      loadPortalFormStub.resolves({
        success: true,
        data: {
          success: true,
          formData: { id: 'portal-large-payload', processed: true },
        },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .send(testData)
        .expect(200);

      const [data] = loadPortalFormStub.getCall(0).args;
      expect(data.portalFormId).to.equal('portal-large-payload');
      expect(data.largeData.records).to.have.lengthOf(100);
      expect(data.largeData.metadata.totalSize).to.equal('1MB');
    });

    it('should handle multiple header variations correctly', async () => {
      const testData = { portalFormId: 'portal-headers' };

      loadPortalFormStub.resolves({
        success: true,
        data: { success: true, formData: { id: 'portal-headers' } },
      });

      await request(Server)
        .post('/api/loadPortalForm')
        .set('Authorization', 'Bearer header-token')
        .set('x-original-server', 'https://headers.example.com')
        .set('content-type', 'application/json')
        .set('x-request-id', 'req-123')
        .send(testData)
        .expect(200);

      const [data, token, originalServer] = loadPortalFormStub.getCall(0).args;
      expect(data.portalFormId).to.equal('portal-headers');
      expect(token).to.equal('header-token');
      expect(originalServer).to.equal('https://headers.example.com');
    });
  });

  describe('submitForPortalAction endpoint', () => {
    it('should successfully submit portal action with all required fields', async () => {
      const testData = {
        tokenId: 'token-123',
        savedForm: 'form-data-json',
        config: { action: 'submit', workflow: 'approval' },
      };

      submitForPortalActionStub.resolves({
        success: true,
        data: {
          success: true,
          actionId: 'action-456',
          status: 'submitted',
        },
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        success: true,
        actionId: 'action-456',
        status: 'submitted',
      });

      expect(submitForPortalActionStub.calledOnce).to.be.true;
      const data = submitForPortalActionStub.getCall(0).args[0];
      expect(data).to.deep.equal({
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

      submitForPortalActionStub.resolves({
        success: false,
        error: 'Missing required fields: tokenId, savedForm, or config',
        status: 400,
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).to.deep.equal({
        error: 'Missing required fields: tokenId, savedForm, or config',
      });
    });

    it('should return error when savedForm is missing', async () => {
      const testData = {
        tokenId: 'token-123',
        config: { action: 'submit' },
      };

      submitForPortalActionStub.resolves({
        success: false,
        error: 'Missing required fields: tokenId, savedForm, or config',
        status: 400,
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).to.deep.equal({
        error: 'Missing required fields: tokenId, savedForm, or config',
      });
    });

    it('should return error when config is missing', async () => {
      const testData = {
        tokenId: 'token-123',
        savedForm: 'form-data-json',
      };

      submitForPortalActionStub.resolves({
        success: false,
        error: 'Missing required fields: tokenId, savedForm, or config',
        status: 400,
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).to.deep.equal({
        error: 'Missing required fields: tokenId, savedForm, or config',
      });
    });

    it('should handle ICM service error responses', async () => {
      const testData = {
        tokenId: 'invalid-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      submitForPortalActionStub.resolves({
        success: false,
        error: 'Unauthorized',
        status: 401,
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).to.deep.equal({
        error: 'Unauthorized',
      });
    });

    it('should handle ICM service error responses with default error message', async () => {
      const testData = {
        tokenId: 'error-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      submitForPortalActionStub.resolves({
        success: false,
        error: 'Error submitting button action. Please try again.',
        status: 500,
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Error submitting button action. Please try again.',
      });
    });

    it('should handle ICM service exceptions', async () => {
      const testData = {
        tokenId: 'exception-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      submitForPortalActionStub.rejects(new Error('Network connection failed'));

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Network connection failed',
      });
    });

    it('should handle non-Error exceptions in try-catch', async () => {
      const testData = {
        tokenId: 'unknown-error-token',
        savedForm: 'form-data-json',
        config: { action: 'submit' },
      };

      submitForPortalActionStub.rejects('Unknown error occurred');

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).to.deep.equal({
        error: 'Internal server error',
      });
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

      submitForPortalActionStub.resolves({
        success: true,
        data: {
          success: true,
          actionId: 'complex-action-789',
          workflowId: 'workflow-123',
        },
      });

      const response = await request(Server)
        .post('/api/submitForPortalAction')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).to.deep.equal({
        success: true,
        actionId: 'complex-action-789',
        workflowId: 'workflow-123',
      });

      expect(submitForPortalActionStub.calledOnce).to.be.true;
      const data = submitForPortalActionStub.getCall(0).args[0];
      expect(data).to.deep.equal(testData);
    });
  });
});
