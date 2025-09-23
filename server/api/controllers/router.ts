import express from 'express';

// Controllers
import DefaultController from './default.controller';
import CommunicationsController from './communications.controller';
import RendererController from './renderer.controller';
import examplesRouter from './examples/router';
import {
  authMiddleware,
  optionalAuthMiddleware,
} from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/saveICMData', authMiddleware, (req, res) =>
  CommunicationsController.saveICMData(req, res)
);
router.post('/generateForm', optionalAuthMiddleware, (req, res) =>
  CommunicationsController.generateForm(req, res)
);
router.post('/editForm', authMiddleware, (req, res) =>
  CommunicationsController.editFormData(req, res)
);
router.post('/loadICMData', authMiddleware, (req, res) =>
  CommunicationsController.loadICMData(req, res)
);
router.post('/unlockICMData', authMiddleware, (req, res) =>
  CommunicationsController.unlockICMData(req, res)
);
router.post('/loadSavedJson', authMiddleware, (req, res) =>
  CommunicationsController.loadSavedJson(req, res)
);
router.post('/pdfRender/:pdfTemplateId', optionalAuthMiddleware, (req, res) =>
  CommunicationsController.pdfRender(req, res)
);
router.post('/generatePortalForm', optionalAuthMiddleware, (req, res) =>
  CommunicationsController.generatePortalForm(req, res)
);
router.post('/loadPortalForm', optionalAuthMiddleware, (req, res) =>
  CommunicationsController.loadPortalForm(req, res)
);
router.post('/submitForPortalAction', authMiddleware, (req, res) =>
  CommunicationsController.submitForPortalAction(req, res)
);
router.post('/loadBoundForm', optionalAuthMiddleware, (req, res) =>
  CommunicationsController.loadBoundForm(req, res)
);
router.post('/bindPreviewForm', optionalAuthMiddleware, (req, res) =>
  CommunicationsController.bindPreviewForm(req, res)
);
router.post('/saveFormData', authMiddleware, (req, res) =>
  CommunicationsController.saveFormData(req, res)
);

router.get('/view', optionalAuthMiddleware, (req, res) =>
  RendererController.viewForm(req, res)
);
router.get('/edit', authMiddleware, (req, res) =>
  RendererController.editForm(req, res)
);

// Examples Routes
router.use('/examples', examplesRouter);

router.get('/', (req, res) => DefaultController.all(req, res));
router.post('/', optionalAuthMiddleware, (req, res) =>
  DefaultController.create(req, res)
);
router.get('/:id', optionalAuthMiddleware, (req, res) =>
  DefaultController.byId(req, res)
);

export default router;
