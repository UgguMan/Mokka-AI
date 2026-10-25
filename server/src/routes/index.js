import {Router} from 'express';
import * as authentication from '../controllers/auth.js';
import * as records from '../controllers/records.js';
import {auth} from '../middleware/auth.js';
import {validate,validId,registerSchema,loginSchema,googleLoginSchema,fieldsSchema} from '../middleware/validate.js';
import {upload} from '../middleware/upload.js';
import {authLimit,analyzeLimit} from '../middleware/rateLimit.js';
import {asyncRoute} from '../utils/errors.js';
import {analyzeAndSave} from '../services/analysis.js';
export function routes({classifier,verifyGoogleCredential}={}){
  const router=Router();
  router.post('/auth/register',authLimit,validate(registerSchema),asyncRoute(authentication.register));
  router.post('/auth/login',authLimit,validate(loginSchema),asyncRoute(authentication.login));
  router.post('/auth/google',authLimit,validate(googleLoginSchema),asyncRoute(authentication.googleLogin(verifyGoogleCredential)));
  router.get('/auth/me',auth,authentication.me);
  router.post('/analyze',auth,analyzeLimit,upload,validate(fieldsSchema),asyncRoute(async(req,res)=>res.status(201).json(await analyzeAndSave({user:req.user.id,file:req.file,fields:req.body},classifier))));
  router.get('/history',auth,asyncRoute(records.history));
  router.get('/history/:id',auth,validId,asyncRoute(records.result));
  router.delete('/history/:id',auth,validId,asyncRoute(records.remove));
  router.get('/diseases',asyncRoute(records.diseases));router.get('/diseases/:id',validId,asyncRoute(records.disease));
  router.get('/dashboard/stats',auth,asyncRoute(records.stats));return router;
}
