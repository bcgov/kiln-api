import express from 'express';

// Controllers
import DefaultController from './default.controller';
import CommunicationsController from './communications.controller';
import RendererController from './renderer.controller';
import examplesRouter from './examples/router';
import { extractAuth } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/generateForm', extractAuth, (req, res) =>
  CommunicationsController.generateForm(req, res)
);
router.post('/loadICMData', extractAuth, (req, res) =>
  CommunicationsController.loadICMData(req, res)
);
router.post('/unlockICMData', extractAuth, (req, res) =>
  CommunicationsController.unlockICMData(req, res)
);
router.post('/loadSavedJson', (req, res) =>
  CommunicationsController.loadSavedJson(req, res)
);
router.post('/pdfRender/:pdfTemplateId', extractAuth, (req, res) =>
  CommunicationsController.pdfRender(req, res)
);
router.post('/getInterface', (req, res) =>
  CommunicationsController.getInterface(req, res)
);
router.post('/generatePortalForm', (req, res) =>
  CommunicationsController.generatePortalForm(req, res)
);
router.post('/loadPortalForm', (req, res) =>
  CommunicationsController.loadPortalForm(req, res)
);
router.post('/submitForPortalAction', (req, res) =>
  CommunicationsController.submitForPortalAction(req, res)
);
router.post('/saveForPortalAction', (req, res) =>
  CommunicationsController.saveForPortalAction(req, res)
);
router.post('/cancelForPortalAction', (req, res) =>
  CommunicationsController.cancelForPortalAction(req, res)
);
router.post('/generateNewTemplate', extractAuth, (req, res) =>
  CommunicationsController.generateNewTemplate(req, res)
);
router.post('/loadBoundForm', extractAuth, (req, res) =>
  CommunicationsController.loadBoundForm(req, res)
);
router.post('/bindPreviewForm', extractAuth, (req, res) =>
  CommunicationsController.bindPreviewForm(req, res)
);
router.post('/saveFormData', extractAuth, (req, res) =>
  CommunicationsController.saveFormData(req, res)
);
router.post('/generatePDFFromJson', (req, res) =>
  CommunicationsController.generatePdfFromJson(req, res)
);

// Kiln Renderer Routes
router.get('/view', (req, res) => RendererController.viewForm(req, res));
router.get('/edit', (req, res) => RendererController.editForm(req, res));

// Examples Routes
router.use('/examples', examplesRouter);

// Default / Health Check Routes (put last to avoid conflicts)
router.get('/', (req, res) => DefaultController.all(req, res));
router.post('/', (req, res) => DefaultController.create(req, res));
router.get('/:id', (req, res) => DefaultController.byId(req, res));

export default router;
