import { Request, Response } from 'express';
import ICMService from '../services/icm.service';
import {
  AuthenticatedRequest,
  getAuthToken,
  getUsername,
} from '../middleware/auth.middleware';
import L from '../../common/logger';
import FileService from '../services/file.service';
import { RequestWithCache } from '../middleware/cache.middleware';
import CacheService from '../services/cache.service';

export class CommunicationsController {
  async generateForm(req: AuthenticatedRequest, res: Response): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    const { token, ...params } = req.body;
    const authToken = getAuthToken(req);
    const username = getUsername(req);

    const result = await ICMService.generateForm(
      { ...params, username, originalServer },
      authToken
    );

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async loadICMData(req: RequestWithCache, res: Response): Promise<void> {
    if (req.attachmentCache) {
      res.status(200).json(req.attachmentCache);
      return;
    }
    const originalServer = req.headers['x-original-server'] as string;
    const { ...params } = req.body;
    const authToken = getAuthToken(req);
    const username = getUsername(req);

    const result = await ICMService.loadICMData(
      { ...params, username, originalServer },
      authToken
    );

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async unlockICMData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    const { ...params } = req.body;
    const authToken = getAuthToken(req);
    const username = getUsername(req);

    const result = await ICMService.unlockICMData(
      { ...params, username, originalServer },
      authToken
    );

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async loadSavedJson(req: Request, res: Response): Promise<void> {
    const params = req.body;

    const result = await ICMService.loadSavedJson(params);

    if (result.success) {
      const boundData = (await ICMService.bindFormData(result.data)) as any;
      // Preserve params from original response for generate flow
      // Communication-Layer stores attachmentId, OfficeName, etc. in params
      if (result.data?.params) {
        boundData.params = result.data.params;
      }
      res.status(200).json(boundData);
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async pdfRender(req: Request, res: Response): Promise<void> {
    try {
      const pdfTemplateId = req.params.pdfTemplateId;

      if (!pdfTemplateId) {
        res
          .status(400)
          .json({ error: 'PDF template ID is required in URL path' });
        return;
      }

      const formData = req.body;

      const result = await ICMService.pdfRender({
        pdfTemplateId,
        ...formData,
      });

      if (result.success && result.data) {
        res.setHeader('Content-Type', 'application/pdf');
        res.status(200).send(result.data);
      } else if (result.success && !result.data) {
        res
          .status(500)
          .json({ error: 'PDF generation succeeded but no data returned' });
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      console.error('PDF render error:', error);
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }

  async generatePortalForm(req: Request, res: Response): Promise<void> {
    const requestData = (req.body ?? {}) as Record<string, any>;
    const originalServer = req.headers['x-original-server'] as
      | string
      | undefined;

    // start loose, then enforce
    const payload: Record<string, any> = { ...requestData };

    // runtime guard so the cast is safe
    if (typeof payload.id !== 'string' || !payload.id.trim()) {
      res.status(400).json({ error: 'Missing required field: id' });
      return;
    }

    const result = await ICMService.generatePortalForm(
      payload as { id: string } & Record<string, any>,
      originalServer
    );

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async loadPortalForm(req: Request, res: Response): Promise<void> {
    try {
      const requestData = (req.body ?? {}) as Record<string, any>;
      const originalServer = req.headers['x-original-server'] as
        | string
        | undefined;

      // start loose, then enforce
      const payload: Record<string, any> = { ...requestData };

      // runtime guard so the cast is safe
      if (typeof payload.id !== 'string' || !payload.id.trim()) {
        res.status(400).json({ error: 'Missing required field: id' });
        return;
      }

      const result = await ICMService.loadPortalForm(
        payload as { id: string } & Record<string, any>,
        originalServer
      );
      if (result.success) {
        const boundData = await ICMService.bindFormData(result.data);
        res.status(200).json(boundData);
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Internal server error';
      res.status(500).json({ error: errorMessage });
    }
  }

  async loadBoundForm(req: RequestWithCache, res: Response): Promise<void> {
    if (req.attachmentCache) {
      res.status(200).json(req.attachmentCache.attachment);
      return;
    }
    try {
      const originalServer = req.headers['x-original-server'] as string;
      const { isPortalIntegrated, ...params } = req.body;
      const authToken = getAuthToken(req);
      const username = getUsername(req);

      let result;
      if (isPortalIntegrated) {
        const p: Record<string, any> = { ...params };
        if (!p.id && authToken) p.id = authToken;

        if (typeof p.id !== 'string' || !p.id.trim()) {
          res.status(400).json({ error: 'Missing required field: id' });
          return;
        }

        result = await ICMService.loadPortalForm(
          p as { id: string } & Record<string, any>,
          originalServer
        );
      } else {
        result = await ICMService.loadICMData(
          { ...params, username, originalServer },
          authToken
        );
      }

      if (!result.success) {
        res.status(result.status || 500).json({ error: result.error });
        return;
      }

      // TODO extract and create files using fileId in field data
      const boundData = await ICMService.bindFormData(result.data);
      if (boundData.error) {
        res.status(boundData.status).json({ error: boundData.error });
        return;
      }
      const TTL = await CacheService.setAttachment(
        req.body.attachmentId,
        boundData,
        []
      );
      res.status(200).json({ ...boundData, TTL });
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }

  async bindPreviewForm(req: Request, res: Response): Promise<void> {
    try {
      const { formData } = req.body;

      if (!formData) {
        res.status(400).json({ error: 'Form data is required' });
        return;
      }

      const boundData = await ICMService.bindFormData(formData);
      res.status(200).json(boundData);
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }

  async generateNewTemplate(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const requestData = req.body;
      const authToken = getAuthToken(req);
      const originalServer = req.headers['x-original-server'] as string;

      L.info(
        {
          route: 'generateNewTemplate',
          requestData,
          authToken,
          originalServer,
        },
        'Incoming generateNewTemplate request'
      );

      const result = await ICMService.generateNewTemplate(
        {
          ...requestData,
          ...(originalServer ? { originalServer } : {}),
        },
        authToken,
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(result.status || 400).json({ error: result.error });
      }
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) errorMessage = error.message;
      res.status(500).json({ error: errorMessage });
    }
  }
  async compareFormData(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    try {
      const {
        action,
        formState,
        groupState,
        formDefinition,
        metadata,
        items,
        sessionParams,
      } = req.body;

      const result = await ICMService.compareFormData(
        {
          action,
          formState,
          groupState,
          formDefinition,
          metadata,
          items,
          sessionParams,
        },
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }
  async saveFormData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;

    L.debug(
      {
        method: req.method,
        headers: req.headers,
        params: req.params,
        query: req.query,
        body: req.body,
      },
      'saveFormData: full incoming request'
    );

    try {
      const {
        action,
        formState,
        groupState,
        formDefinition,
        metadata,
        items,
        sessionParams,
      } = req.body;
      const token = getAuthToken(req);

      const result = await ICMService.saveFormData(
        {
          action,
          formState,
          groupState,
          formDefinition,
          metadata,
          items,
          sessionParams,
        },
        token,
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }

  async generatePdfFromJson(req: Request, res: Response): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as
        | string
        | undefined;
      const body: any = req.body;

      // Accept either { attachment: <base64> }, an array [<base64>], or raw JSON
      let attachmentBase64: string | undefined;

      if (
        body &&
        typeof body.attachment === 'string' &&
        body.attachment.trim()
      ) {
        attachmentBase64 = body.attachment.trim();
      } else if (Array.isArray(body) && typeof body[0] === 'string') {
        attachmentBase64 = String(body[0]);
      } else if (body && typeof body === 'object') {
        const { token, username, originalServer: _ignored, ...formJson } = body;
        if (Object.keys(formJson || {}).length > 0) {
          const jsonStr = JSON.stringify(formJson);
          attachmentBase64 = Buffer.from(jsonStr, 'utf8').toString('base64');
        }
      }

      if (!attachmentBase64) {
        res
          .status(400)
          .json({ error: 'attachment (base64) or a JSON body is required' });
        return;
      }

      const result = await ICMService.generatePdfFromJson(
        { attachment: attachmentBase64 },
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(result.status ?? 500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
  // interface
  async getInterface(req: Request, res: Response): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as
        | string
        | undefined;
      const result = await ICMService.getInterface(originalServer);
      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  // portal
  async saveForPortalAction(req: Request, res: Response): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as
        | string
        | undefined;
      const { tokenId, savedForm, path, type, headers } = req.body || {};

      if (!tokenId || !savedForm) {
        res
          .status(400)
          .json({ error: 'Missing required fields: tokenId and savedForm' });
        return;
      }

      const result = await ICMService.saveForPortalAction(
        {
          tokenId,
          savedForm,
          ...(path ? { path } : {}),
          ...(type ? { type } : {}),
          ...(headers ? { headers } : {}),
        },
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data); // Comm Layer returns { status: "success" }
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async submitForPortalAction(req: Request, res: Response): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as
        | string
        | undefined;
      const { tokenId } = req.body || {};
      if (!tokenId) {
        res.status(400).json({ error: 'Missing required field: tokenId' });
        return;
      }

      const result = await ICMService.submitForPortalAction(
        { tokenId },
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data); // { status: "success" }
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async cancelForPortalAction(req: Request, res: Response): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as
        | string
        | undefined;
      const { tokenId, path, type, headers } = req.body || {};
      if (!tokenId) {
        res.status(400).json({ error: 'Missing required field: tokenId' });
        return;
      }

      const result = await ICMService.cancelForPortalAction(
        {
          tokenId,
          ...(path ? { path } : {}),
          ...(type ? { type } : {}),
          ...(headers ? { headers } : {}),
        },
        originalServer
      );

      if (result.success) {
        res.status(200).json(result.data); // { status: "success", expired: true }
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async loadPDFFromICMData(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as string;
      const { isPortalIntegrated, ...params } = req.body;
      const authToken = getAuthToken(req);
      const username = getUsername(req);

      const result = await ICMService.loadPdfFromICMData(
        { ...params, username, originalServer },
        authToken
      );

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(result.status || 500).json({ error: result.error });
      }
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }
  async uploadFile(req: RequestWithCache, res: Response): Promise<void> {
    const { attachmentCache, attachmentId } = req;
    if (!attachmentId) {
      res.status(400).json({
        error: 'Missing attachmentId',
      });
      return;
    }
    if (!attachmentCache) {
      res.status(400).json({
        error: 'Missing attachment cache',
      });
      return;
    }
    try {
      const schema = attachmentCache.attachment.form_definition;
      FileService.handleFileUpload(req, res, attachmentId, schema);
    } catch (error) {
      let errorMessage = 'Internal server error';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({
        error: errorMessage,
      });
    }
  }
}

export default new CommunicationsController();
