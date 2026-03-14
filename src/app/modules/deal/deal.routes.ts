import { Router } from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  CreateDealZodSchema,
  UpdateDealZodSchema,
} from './deal.validate';
import { multerUpload, uploadMulter } from '../../config/multer.config';
import { checkAuth } from '../../middlewares/auth.middleware';
import { Role } from '../user/user.interface';
import { dealsControllers } from './deal.controllers';
import { validateImageDimensions } from '../../middlewares/imageRatioValidation';
import { uploadToCloudinary } from '../../middlewares/uploadCloudinary';


const router = Router();

// SERVICE CREATE
router.post(
  '/',
  checkAuth(Role.VENDOR),
   multerUpload.fields([
    { name: 'files', maxCount: 10 },
    { name: 'qr', maxCount: 1 },
    { name: 'upc', maxCount: 1 },
  ]),
  validateRequest(CreateDealZodSchema),
  dealsControllers.createDeals
);

// GET ALL DEALS
router.get('/deals/all_deals/:lng/:lat', dealsControllers.getAllDeals);

// GET NEARESST DEALS
router.get('/deals/:lng/:lat', dealsControllers.getNearestDeals);

// GET MY SERVICE
router.get('/my_deals', checkAuth(Role.VENDOR), dealsControllers.getMyDeals);

// GET USERS SAVED DEALS
router.get('/saved', dealsControllers.getDealsByIds);

// GET SINGLE DEALS
router.get(
  '/:dealId/:lng/:lat',
  dealsControllers.getSingleDeals
);

// GET DEALS BY CATEGORY
router.get(
  '/c/:categoryId',
  dealsControllers.getDealsByCategory
);

// DELETE SERVICE
router.delete(
  '/:serviceId',
  checkAuth(Role.VENDOR),
  dealsControllers.deleteDeals
);

// UPDATE SERVICE
router.patch(
  '/:serviceId',
  checkAuth(Role.VENDOR),
  uploadMulter.fields([
    { name: 'files', maxCount: 10 },
    { name: 'qr', maxCount: 1 },
    { name: 'upc', maxCount: 1 },
  ]),
  validateImageDimensions,
  uploadToCloudinary,
  validateRequest(UpdateDealZodSchema),
  dealsControllers.updateSingleDeals
);

// GET TOP VIEWED DEALS
router.get('/top_viewed_deals', checkAuth(Role.VENDOR), dealsControllers.topViewedDeals);





export const serviceRouter = router;
