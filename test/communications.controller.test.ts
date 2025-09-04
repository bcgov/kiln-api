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

  beforeEach(() => {
    loadICMDataStub = sinon.stub(ICMService, 'loadICMData');
    unlockICMDataStub = sinon.stub(ICMService, 'unlockICMData');
    loadSavedJsonStub = sinon.stub(ICMService, 'loadSavedJson');
    generateFormStub = sinon.stub(ICMService, 'generateForm');
    pdfRenderStub = sinon.stub(ICMService, 'pdfRender');
    generatePortalFormStub = sinon.stub(ICMService, 'generatePortalForm');
  });

  afterEach(() => {
    sinon.restore();
  });

  // Test sample of placeholder endpoints to verify basic connectivity
  it('should respond to POST /api/saveForm', () =>
    request(Server)
      .post('/api/saveForm')
      .send({ test: true })
      .expect('Content-Type', /json/)
      .expect(200)
      .then((res) => {
        expect(res.body).to.have.property('endpoint', 'saveForm');
        expect(res.body.payload).to.have.property('test', true);
      }));

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

      await request(Server)
        .post('/api/pdfRender/')
        .send(formData)
        .expect(404); // Express route not found

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
      expect(serviceData.pdfTemplateId).to.equal('template_with-special.chars@123');
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

      expect(response.body).to.deep.equal({ save_data: { id: 'pf-456' }, ok: true });

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
        // send minimum fields required by your swagger schema so validator passes
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

});
