import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { vendorRoutes } from '../modules/user/user.routes';



export const router = Router();

const moduleRoutes = [
   {
    path: '/auth',
    route: authRouter
   },
   {
    path: '/vendor',
    route: vendorRoutes
   }
];

moduleRoutes.forEach((r) => {
  router.use(r.path, r.route);
});
