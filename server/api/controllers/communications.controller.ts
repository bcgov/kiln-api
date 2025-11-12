import { Request, Response } from 'express';
import ICMService from '../services/icm.service';
import {
  AuthenticatedRequest,
  getAuthToken,
  getUsername,
} from '../middleware/auth.middleware';

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

  async loadICMData(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    const { token, ...params } = req.body;
    const authToken = getAuthToken(req);
    const username = getUsername(req);

    const result = await ICMService.unlockICMData(
      { ...params, username },
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
      res.status(200).json(result.data);
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

  async generatePortalForm(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    const { token, ...params } = req.body;
    const authToken = getAuthToken(req);
    const username = getUsername(req);

    const result = await ICMService.generatePortalForm(
      { ...params, username, originalServer },
      authToken
    );

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async loadPortalForm(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const requestData = req.body;
      const token = getAuthToken(req);
      const originalServer = req.headers['x-original-server'] as string;

      const result = await ICMService.loadPortalForm(
        requestData,
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

  async loadBoundForm(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const originalServer = req.headers['x-original-server'] as string;
      const { isPortalIntegrated, ...params } = req.body;
      const authToken = getAuthToken(req);
      const username = getUsername(req);

      let result;
      if (isPortalIntegrated) {
        result = await ICMService.loadPortalForm(
          { ...params },
          authToken,
          originalServer
        );
      } else {
        result = await ICMService.loadICMData(
          { ...params, username, originalServer },
          authToken
        );
      }

      if (result.success) {
        const boundData = await ICMService.bindFormData(result.data);
        res.status(200).json(boundData);
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

  async submitForPortalAction(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { tokenId, savedForm, config } = req.body;

      const result = await ICMService.submitForPortalAction({
        tokenId,
        savedForm,
        config,
      });

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

  async generateNewTemplate(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const requestData = req.body;
      const authToken = getAuthToken(req);
      const originalServer = req.headers['x-original-server'] as string;

      const result = await ICMService.generateNewTemplate(
        {
          ...requestData,
          ...(originalServer ? { originalServer } : {}),
        },
        authToken
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

  async saveFormData(req: AuthenticatedRequest, res: Response): Promise<void> {
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
}

export default new CommunicationsController();
