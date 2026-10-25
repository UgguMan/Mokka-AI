export class AppError extends Error {
  constructor(status,message,code='REQUEST_FAILED',retryAfter){super(message);Object.assign(this,{status,code,retryAfter});}
}
export const asyncRoute = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
