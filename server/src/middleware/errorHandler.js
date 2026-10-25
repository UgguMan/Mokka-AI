import multer from 'multer';
import {ZodError} from 'zod';
export function errorHandler(error,req,res,next){
  if(res.headersSent) return next(error);
  let status=error.status || 500, message=error.status ? error.message : 'Something went wrong. Please try again.',code=error.code || 'SERVER_ERROR';
  if(error instanceof ZodError){status=400;code='VALIDATION_ERROR';message=error.issues.map(i=>`${i.path.join('.') || 'Input'}: ${i.message}`).join('; ');}
  if(error instanceof multer.MulterError){status=error.code==='LIMIT_FILE_SIZE'?413:400;code='INVALID_UPLOAD';message=error.code==='LIMIT_FILE_SIZE'?'Choose an image no larger than 4 MB.':'Upload one image and keep the optional fields within their limits.';}
  if(error.code===11000){status=409;code='EMAIL_EXISTS';message='An account with that email already exists.';}
  if(['MongoServerSelectionError','MongooseServerSelectionError','MongoNetworkError'].includes(error.name)){status=503;code='DATABASE_UNAVAILABLE';message='The database is unavailable. Please start MongoDB and try again.';}
  if(error.type==='entity.too.large'){status=413;code='TOO_LARGE';message='This request is too large.';}
  if(error.type==='entity.parse.failed'){status=400;code='INVALID_JSON';message='Please send valid JSON.';}
  if(error.retryAfter) res.set('Retry-After',String(error.retryAfter));
  res.status(status).json({error:{code,message,...(error.retryAfter?{retryAfter:error.retryAfter}:{})}});
}
