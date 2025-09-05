import express from 'express';

// Controllers
import DefaultController from './default.controller';
import CommunicationsController from './communications.controller';
import RendererController from './renderer.controller';
import examplesRouter from './examples/router';

const router = express.Router();

// Communications Layer Routes
router.post('/saveICMData', (req, res) =>
  CommunicationsController.saveICMData(req, res)
);
router.post('/saveForm', (req, res) =>
  CommunicationsController.saveData(req, res)
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
router.post('/clearICMLockedFlag', (req, res) =>
  CommunicationsController.clearICMLockedFlag(req, res)
);
router.post('/loadSavedJson', (req, res) =>
  CommunicationsController.loadSavedJson(req, res)
);
router.post('/pdfRender/:pdfTemplateId', (req, res) =>
  CommunicationsController.pdfRender(req, res)
);
router.post('/generatePDFFromJson', (req, res) =>
  CommunicationsController.generatePDFFromJson(req, res)
);
router.post('/generatePortalForm', (req, res) =>
  CommunicationsController.generatePortalForm(req, res)
);
router.post('/loadPortalForm', (req, res) =>
  CommunicationsController.loadPortalForm(req, res)
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
