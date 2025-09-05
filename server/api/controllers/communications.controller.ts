import { Request, Response } from 'express';
import ICMService from '../services/icm.service';

export class CommunicationsController {
  saveData(req: Request, res: Response): void {
    res.json({ endpoint: 'saveForm', payload: req.body });
  }

  async generateForm(req: Request, res: Response): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    const { token, username, ...params } = req.body;

    const authHeader = req.headers.authorization;
    const authToken =
      token ||
      (authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader);

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

  editFormData(req: Request, res: Response): void {
    res.json({ endpoint: 'editForm', payload: req.body });
  }

  async saveICMData(req: Request, res: Response): Promise<void> {
    const { attachmentId, OfficeName, username, savedForm } = req.body;

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    // TODO: Implement authentication/authorization when available

    const result = await ICMService.saveICMData(
      { attachmentId, OfficeName, username, savedForm },
      token
    );

    if (result.success) {
      res.status(200).json({ message: 'success' });
    } else {
      res.status(result.status || 500).json({ error: result.error });
    }
  }

  async loadICMData(req: Request, res: Response): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    const { token, username, ...params } = req.body;

    const authHeader = req.headers.authorization;
    const authToken =
      token ||
      (authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader);

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

  async clearICMLockedFlag(req: Request, res: Response): Promise<void> {
    const { token, username, ...params } = req.body;

    const authHeader = req.headers.authorization;
    const authToken =
      token ||
      (authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader);

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

  async generatePortalForm(req: Request, res: Response): Promise<void> {
    const originalServer = req.headers['x-original-server'] as string;
    const { token, username, ...params } = req.body;

    const authHeader = req.headers.authorization;
    const authToken =
      token ||
      (authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader);

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

  async loadPortalForm(req: Request, res: Response): Promise<void> {
    try {
      const requestData = req.body;

      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;

      const originalServer = req.headers['x-original-server'] as string;

      // TODO: Implement authentication/authorization when available

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

  generatePDFFromJson(req: Request, res: Response): void {
    res.json({ endpoint: 'generatePDFFromJson', payload: req.body });
  }

  generateNewTemplate(req: Request, res: Response): void {
    res.json({ endpoint: 'generateNewTemplate', payload: req.body });
  }
}

export default new CommunicationsController();
