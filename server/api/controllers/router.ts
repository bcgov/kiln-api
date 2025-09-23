import express from 'express';

// Controllers
import DefaultController from './default.controller';
import CommunicationsController from './communications.controller';
import RendererController from './renderer.controller';
import examplesRouter from './examples/router';
import userExtractionMiddleware from '../middlewares/user.middleware';

const router = express.Router();

// Apply user extraction middleware to all routes
router.use(userExtractionMiddleware);

// Communications Layer Routes - No auth required (handled by OpenShift route)
router.post('/saveICMData', (req, res) =>
  CommunicationsController.saveICMData(req, res)
);
router.post('/generateForm', (req, res) =>
  CommunicationsController.generateForm(req, res)
);
router.post('/editForm', (req, res) =>
  CommunicationsController.editFormData(req, res)
);
router.post('/loadICMData', (req, res) =>
  CommunicationsController.loadICMData(req, res)
);
router.post('/unlockICMData', (req, res) =>
  CommunicationsController.unlockICMData(req, res)
);
router.post('/loadSavedJson', (req, res) =>
  CommunicationsController.loadSavedJson(req, res)
);
router.post('/pdfRender/:pdfTemplateId', (req, res) =>
  CommunicationsController.pdfRender(req, res)
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
router.post('/loadBoundForm', (req, res) =>
  CommunicationsController.loadBoundForm(req, res)
);
router.post('/bindPreviewForm', (req, res) =>
  CommunicationsController.bindPreviewForm(req, res)
);
router.post('/saveFormData', (req, res) =>
  CommunicationsController.saveFormData(req, res)
);

// Kiln Renderer Routes
router.get('/view', (req, res) => RendererController.viewForm(req, res));
router.get('/edit', (req, res) => RendererController.editForm(req, res));

// Examples Routes
router.use('/examples', examplesRouter);

// Default / Health Check Routes
router.get('/', (req, res) => DefaultController.all(req, res));
router.post('/', (req, res) => DefaultController.create(req, res));
router.get('/:id', (req, res) => DefaultController.byId(req, res));

export default router;
