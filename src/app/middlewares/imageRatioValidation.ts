import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import AppError from '../errorHelpers/AppError';



export interface MulterRequest extends Request {
  files: {
    qr?: Express.Multer.File[];
    upc?: Express.Multer.File[];
    files?: Express.Multer.File[];
  };
}

export const validateImageDimensions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.files) return next();

    const _req = req as MulterRequest;

    const qrFile = _req.files?.qr?.[0];
    const upcFile = _req.files?.upc?.[0];

    if (qrFile) {
      const meta = await sharp(qrFile.buffer).metadata();

      if (meta.width !== 500 || meta.height !== 500) {
        throw new AppError(400, "QR code image must be 500x500");
      }
    }

    if (upcFile) {
      const meta = await sharp(upcFile.buffer).metadata();

      if (meta.width !== 800 || meta.height !== 400) {
        throw new AppError(400, "UPC image must be 800x400");
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};





