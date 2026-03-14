/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    
    if (!req.files) return next();

    const files = req.files as Record<string, Express.Multer.File[]>;
    const uploaded: Record<string, string[]> = {};

    for (const field in files) {
      uploaded[field] = [];

      for (const file of files[field]) {
        const result: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: `deals/${field}` },
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        uploaded[field].push(result.secure_url);
      }
    }

    // ✅ Merge uploaded URLs safely into req.body without overwriting
    req.body.coupon_option =  {qr: undefined, upc: undefined};

    req.body.coupon_option.qr = uploaded.qr?.[0];
    req.body.coupon_option.upc = uploaded.upc?.[0];
    req.body.images = uploaded.files;

    next();
  } catch (err) {
    next(err);
  }
};
