import { Express } from 'express';
import villaRoutes from './villa.route'

const clientRoutesApiVer1 = (app: Express) => {
  const version = "/api/v1";

  app.use(version + "/villas", villaRoutes);
};

export default clientRoutesApiVer1;