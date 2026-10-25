import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import {existsSync} from 'node:fs';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {OAuth2Client} from 'google-auth-library';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {User} from '../src/models/User.js';
import {verifyGoogleCredential} from '../src/services/googleAuth.js';

let mongo,app;
const identity={sub:'google-sub-123',email:'gardener@example.com',name:'Gardener'};
const verify=vi.fn(async()=>identity);
beforeAll(async()=>{
  const systemBinary=process.env.MONGOMS_SYSTEM_BINARY || (existsSync('C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe')?'C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe':undefined);
  mongo=await MongoMemoryServer.create({binary:systemBinary?{systemBinary,checkMD5:false,version:'8.2.5'}:undefined});
  env.mongoUri=mongo.getUri();env.jwtSecret='google-test-secret-only-12345678901234567890';env.googleClientId='test.apps.googleusercontent.com';
  await mongoose.connect(env.mongoUri);await User.init();
  app=createApp({verifyGoogleCredential:verify});
});
afterEach(()=>{vi.restoreAllMocks();});
afterAll(async()=>{await mongoose.disconnect();await mongo?.stop();});
const signIn=()=>request(app).post('/api/auth/google').set('Origin',env.clientUrl).send({credential:'test-token',challenge:'test-challenge'});

it('returns a no-store config with a short-lived nonce challenge',async()=>{
  const r=await request(app).get('/api/auth/google/config');
  expect(r.headers['cache-control']).toBe('no-store');expect(r.body.clientId).toBe(env.googleClientId);
  const claims=jwt.verify(r.body.challenge,env.jwtSecret,{audience:'google-login',issuer:'mokka-ai'});
  expect(claims.nonce).toBe(r.body.nonce);expect(claims.exp-claims.iat).toBe(300);
});
it('creates a Google-only account and reuses it on repeated sign-in',async()=>{
  const first=await signIn(),second=await signIn();
  expect(first.status).toBe(200);expect(second.body.user.id).toBe(first.body.user.id);
  expect(await User.countDocuments({email:identity.email})).toBe(1);
  expect(first.body.user.googleSub).toBeUndefined();expect(first.body.user.passwordHash).toBeUndefined();
  expect((await request(app).get('/api/auth/me').set('Authorization',`Bearer ${first.body.token}`)).status).toBe(200);
});
it('rejects password login for a Google-only account without a server error',async()=>{
  expect((await request(app).post('/api/auth/login').send({email:identity.email,password:'some-password'})).status).toBe(401);
});
it('does not link an existing password account by matching email',async()=>{
  const r=await request(app).post('/api/auth/register').send({name:'Existing',email:'existing@example.com',password:'some-password'});
  expect(r.status).toBe(201);
  verify.mockResolvedValueOnce({...identity,sub:'different-sub',email:'existing@example.com'});
  expect((await signIn()).status).toBe(409);
  const user=await User.findOne({email:'existing@example.com'}).select('+googleSub');expect(user.googleSub).toBeUndefined();
  expect((await request(app).post('/api/auth/login').send({email:'existing@example.com',password:'some-password'})).status).toBe(200);
});
it('rejects cross-origin and malformed requests before identity verification',async()=>{
  const before=verify.mock.calls.length;
  expect((await request(app).post('/api/auth/google').send({credential:'x',challenge:'x'})).status).toBe(403);
  expect((await request(app).post('/api/auth/google').set('Origin',env.clientUrl).send({credential:'x'})).status).toBe(400);
  expect(verify.mock.calls.length).toBe(before);
});
it('verifies audience and nonce and rejects unverified identities',async()=>{
  const config=(await request(app).get('/api/auth/google/config')).body;
  const payload={...identity,email_verified:true,nonce:config.nonce};
  const spy=vi.spyOn(OAuth2Client.prototype,'verifyIdToken').mockResolvedValue({getPayload:()=>payload});
  expect((await verifyGoogleCredential({credential:'signed-id-token',challenge:config.challenge})).sub).toBe(identity.sub);
  expect(spy).toHaveBeenCalledWith({idToken:'signed-id-token',audience:env.googleClientId});
  payload.nonce='wrong';
  await expect(verifyGoogleCredential({credential:'token',challenge:config.challenge})).rejects.toMatchObject({status:401});
  payload.nonce=config.nonce;payload.email_verified=false;
  await expect(verifyGoogleCredential({credential:'token',challenge:config.challenge})).rejects.toMatchObject({status:401});
});
it('rejects forged/expired challenges and signature-verification failures',async()=>{
  const spy=vi.spyOn(OAuth2Client.prototype,'verifyIdToken').mockRejectedValue(new Error('bad signature'));
  for(const challenge of ['forged',jwt.sign({nonce:'n'},env.jwtSecret,{expiresIn:-1,issuer:'mokka-ai',audience:'google-login'})]){
    await expect(verifyGoogleCredential({credential:'token',challenge})).rejects.toMatchObject({status:401});
  }
  expect(spy).not.toHaveBeenCalled();
  const config=(await request(app).get('/api/auth/google/config')).body;
  await expect(verifyGoogleCredential({credential:'token',challenge:config.challenge})).rejects.toMatchObject({status:401});
});
