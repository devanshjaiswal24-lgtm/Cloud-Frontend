import multer from "multer";
import { PassThrough } from "stream";
import { getCloudinary } from "../config/cloudinary.js";

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Only image or PDF files are allowed"), false);
    }

    return cb(null, true);
  },
});

const bufferToStream = (buffer) => {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
};

export const uploadBookCover = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const cloudinary = getCloudinary();

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "library-management/books",
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) {
            return reject(error);
          }

          return resolve(uploadResult);
        }
      );

      bufferToStream(req.file.buffer).pipe(stream);
    });

    req.uploadedCover = {
      coverImage: result.secure_url,
      publicId: result.public_id,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const uploadBuffer = (cloudinary, buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, uploadResult) => {
    if (error) {
      return reject(error);
    }

    return resolve(uploadResult);
  });

  bufferToStream(buffer).pipe(stream);
});

export const uploadBookAssets = async (req, res, next) => {
  try {
    const cloudinary = getCloudinary();
    const files = req.files || {};
    const coverFile = files.cover?.[0];
    const pdfFile = files.pdf?.[0];

    if (coverFile) {
      const coverResult = await uploadBuffer(cloudinary, coverFile.buffer, {
        folder: "library-management/books",
        resource_type: "image",
      });

      req.uploadedCover = {
        coverImage: coverResult.secure_url,
        publicId: coverResult.public_id,
      };
    }

    if (pdfFile) {
      const pdfResult = await uploadBuffer(cloudinary, pdfFile.buffer, {
        folder: "library-management/books",
        resource_type: "raw",
        format: "pdf",
      });

      req.uploadedPdf = {
        pdfUrl: pdfResult.secure_url,
        pdfPublicId: pdfResult.public_id,
      };
    }

    return next();
  } catch (error) {
    return next(error);
  }
};