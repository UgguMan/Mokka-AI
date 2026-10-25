import multer from 'multer';
import sharp from 'sharp';
import {AppError} from '../utils/errors.js';
export const MAX_BYTES=4*1024*1024;
export const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_BYTES,files:1,fields:4,fieldSize:4096,parts:5},fileFilter(req,file,cb){cb(['image/jpeg','image/png','image/webp'].includes(file.mimetype)?null:new AppError(415,'Use a JPEG, PNG or WebP image.'),true);}}).single('image');
export function detectMime(b){
  if(b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255)return 'image/jpeg';
  if(b.length>=8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(b.length>=12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP')return 'image/webp';
  return null;
}
export async function validateImage(file){
  if(!file?.buffer?.length)throw new AppError(400,'Choose a non-empty leaf image.');
  if(file.buffer.length>MAX_BYTES)throw new AppError(413,'Choose an image no larger than 4 MB.');
  const mime=detectMime(file.buffer);
  if(!mime || (file.mimetype && mime!==file.mimetype))throw new AppError(415,'The image content does not match a supported image format.');
  try{await sharp(file.buffer,{limitInputPixels:25000000,failOn:'error'}).resize(1,1).toBuffer();}catch{throw new AppError(400,'This image is damaged or too large in dimensions. Choose a clear, smaller image.');}
  return mime;
}
