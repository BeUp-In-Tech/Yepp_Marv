import { Router } from 'express';
import { checkAuth } from '../../middlewares/auth.middleware';
import { Role } from '../user/user.interface';
import { voucherControllers } from './voucher.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { voucherValidationSchema } from './voucher.validate';

const router = Router();

router.post(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(voucherValidationSchema),
  voucherControllers.createVoucher
);

export const voucherRouter = router;
