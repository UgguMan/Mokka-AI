import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
import {existsSync} from 'node:fs';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';
import {env} from '../src/config/env.js';
import {createApp} from '../src/app.js';
import {User} from '../src/models/User.js';
import {Analysis} from '../src/models/Analysis.js';
import {Disease} from '../src/models/Disease.js';
import {AppError} from '../src/utils/errors.js';
const valid={plantName:'Apple',diseaseName:'Healthy',classLabel:'Apple leaf',scientificName:'Malus domestica',status:'healthy',visualSymptoms:['Even green color'],reasoningSummary:'No visible lesions.',recommendations:['Verify with an expert.'],modelAssessedCertainty:'medium'};
let mongo,app,token,otherToken,png;const classifier=vi.fn();
beforeAll(async()=>{
  const systemBinary=process.env.MONGOMS_SYSTEM_BINARY || (existsSync('C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe')?'C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe':undefined);
  mongo=await MongoMemoryServer.create({binary:systemBinary?{systemBinary,checkMD5:false,version:'8.2.5'}:undefined,instance:{dbName:'mokka_test'}});
  env.mongoUri=mongo.getUri();env.jwtSecret='test-secret-only-not-for-production-1234567890';
  app=createApp({classifier});png=await sharp({create:{width:20,height:20,channels:3,background:'#478543'}}).png().toBuffer();
  const account=await request(app).post('/api/auth/register').send({name:'Test Gardener',email:'test@example.com',password:'secret-pass-123'});expect(account.status).toBe(201);token=account.body.token;
  const other=await request(app).post('/api/auth/register').send({name:'Other Gardener',email:'other@example.com',password:'secret-pass-123'});otherToken=other.body.token;
});
afterAll(async()=>{await mongoose.disconnect();await mongo?.stop();});
beforeEach(async()=>{classifier.mockReset().mockResolvedValue(valid);await Analysis.deleteMany({});});
const analyze=()=>request(app).post('/api/analyze').set('Authorization',`Bearer ${token}`);
describe('Auth and authorization',()=>{
  it('stores a hash, logs in and exposes only safe user fields',async()=>{const user=await User.findOne({email:'test@example.com'}).select('+passwordHash');expect(user.passwordHash).not.toBe('secret-pass-123');const login=await request(app).post('/api/auth/login').send({email:'TEST@example.com',password:'secret-pass-123'});expect(login.status).toBe(200);expect(login.body.user.passwordHash).toBeUndefined();const me=await request(app).get('/api/auth/me').set('Authorization',`Bearer ${token}`);expect(me.body.user.email).toBe('test@example.com');});
  it('rejects duplicate accounts, bad passwords and invalid inputs',async()=>{expect((await request(app).post('/api/auth/register').send({name:'Test',email:'test@example.com',password:'secret-pass-123'})).status).toBe(409);expect((await request(app).post('/api/auth/login').send({email:'test@example.com',password:'wrong-pass'})).status).toBe(401);expect((await request(app).post('/api/auth/register').send({name:'x',email:'not-email',password:'x'})).status).toBe(400);});
  it('protects private routes and rejects invalid tokens',async()=>{expect((await request(app).get('/api/history')).status).toBe(401);expect((await request(app).get('/api/auth/me').set('Authorization','Bearer invalid')).status).toBe(401);});
  it('enforces CORS',async()=>expect((await request(app).get('/api/health').set('Origin','https://untrusted.example')).status).toBe(403));
});
describe('Uploads and analysis',()=>{
  it('requires an image',async()=>{expect((await analyze().field('symptoms','spots')).status).toBe(400);expect(classifier).not.toHaveBeenCalled();});
  it('rejects spoofed magic bytes',async()=>{expect((await analyze().attach('image',Buffer.from('not png'),{filename:'leaf.png',contentType:'image/png'})).status).toBe(415);expect(classifier).not.toHaveBeenCalled();});
  it('rejects corrupt images with valid headers',async()=>{expect((await analyze().attach('image',png.subarray(0,16),{filename:'leaf.png',contentType:'image/png'})).status).toBe(400);});
  it('rejects files over 4 MB',async()=>expect((await analyze().attach('image',Buffer.alloc(4*1024*1024+1),{filename:'leaf.png',contentType:'image/png'})).status).toBe(413));
  it('saves an analysis without image bytes and sanitizes input',async()=>{const r=await analyze().field('symptoms','<spots>').attach('image',png,{filename:'leaf.png',contentType:'image/png'});expect(r.status).toBe(201);expect(r.body.userSymptoms).toBe('spots');const saved=await Analysis.findById(r.body._id).lean();expect(saved.imageMeta.sizeBytes).toBe(png.length);expect(saved.image).toBeUndefined();expect(saved.buffer).toBeUndefined();expect(classifier.mock.calls[0][0].fields.symptoms).toBe('spots');});
  it('returns provider failures without saving a record',async()=>{classifier.mockRejectedValue(new AppError(429,'Quota is unavailable.','AI_QUOTA',60));const r=await analyze().attach('image',png,{filename:'leaf.png',contentType:'image/png'});expect(r.status).toBe(429);expect(r.headers['retry-after']).toBe('60');expect(await Analysis.countDocuments()).toBe(0);});
});
describe('History, aggregates and reference library',()=>{
  it('isolates ownership, paginates history, aggregates counts, and deletes',async()=>{const row=await Analysis.create({...valid,user:(await User.findOne({email:'test@example.com'})).id});await Analysis.create({...valid,status:'uncertain',classLabel:'uncertain',user:(await User.findOne({email:'other@example.com'})).id});expect((await request(app).get(`/api/history/${row.id}`).set('Authorization',`Bearer ${otherToken}`)).status).toBe(404);expect((await request(app).delete(`/api/history/${row.id}`).set('Authorization',`Bearer ${otherToken}`)).status).toBe(404);const history=await request(app).get('/api/history').set('Authorization',`Bearer ${token}`);expect(history.body.total).toBe(1);const stats=await request(app).get('/api/dashboard/stats').set('Authorization',`Bearer ${token}`);expect(stats.body.total).toBe(1);expect(stats.body.counts.healthy).toBe(1);expect(stats.body.counts.uncertain).toBe(0);expect((await request(app).delete(`/api/history/${row.id}`).set('Authorization',`Bearer ${token}`)).status).toBe(204);});
  it('rejects invalid ids and invalid pagination',async()=>{expect((await request(app).get('/api/history/bad-id').set('Authorization',`Bearer ${token}`)).status).toBe(400);expect((await request(app).get('/api/history?page=-1').set('Authorization',`Bearer ${token}`)).status).toBe(400);});
  it('searches and filters the database library',async()=>{await Disease.create({classLabel:'Apple leaf',plant:'Apple',disease:'Healthy',symptoms:['green'],generalInformation:'Reference',source:'test'});const r=await request(app).get('/api/diseases?plant=Apple&search=green');expect(r.body.items).toHaveLength(1);expect((await request(app).get('/api/diseases?plant=Tomato')).body.items).toHaveLength(0);});
});
