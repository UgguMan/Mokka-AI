import mongoose from 'mongoose';
import {z} from 'zod';
import {Analysis} from '../models/Analysis.js';
import {Disease} from '../models/Disease.js';
import {AppError} from '../utils/errors.js';
const pageSchema=z.coerce.number().int().min(1).max(10000).default(1);
export async function history(req,res){const page=pageSchema.parse(req.query.page);const query={user:req.user.id};const [items,total]=await Promise.all([Analysis.find(query).sort({createdAt:-1,_id:-1}).skip((page-1)*12).limit(12).lean(),Analysis.countDocuments(query)]);res.json({items,total,page,pages:Math.ceil(total/12)});}
export async function result(req,res){const item=await Analysis.findOne({_id:req.params.id,user:req.user.id}).lean();if(!item)throw new AppError(404,'Analysis not found.');res.json(item);}
export async function remove(req,res){const item=await Analysis.findOneAndDelete({_id:req.params.id,user:req.user.id});if(!item)throw new AppError(404,'Analysis not found.');res.status(204).end();}
export async function diseases(req,res){const query=z.object({search:z.string().max(100).default(''),plant:z.string().max(100).default(''),disease:z.string().max(100).default('')}).parse(req.query);let items=await Disease.find({}).sort({plant:1,disease:1}).lean();const filters={plants:[...new Set(items.map(i=>i.plant))],diseases:[...new Set(items.map(i=>i.disease))].sort()};items=items.filter(i=>(!query.plant || i.plant===query.plant)&&(!query.disease || i.disease===query.disease)&&`${i.plant} ${i.disease} ${i.symptoms.join(' ')}`.toLowerCase().includes(query.search.toLowerCase()));res.json({items,filters});}
export async function disease(req,res){const item=await Disease.findById(req.params.id).lean();if(!item)throw new AppError(404,'Reference not found.');res.json(item);}
export async function stats(req,res){
  const [data]=await Analysis.aggregate([{$match:{user:new mongoose.Types.ObjectId(req.user.id)}},{$facet:{counts:[{$group:{_id:'$status',count:{$sum:1}}}],commonDiseases:[{$match:{status:'disease_detected'}},{$group:{_id:'$classLabel',plant:{$first:'$plantName'},disease:{$first:'$diseaseName'},count:{$sum:1}}},{$sort:{count:-1,_id:1}},{$limit:5}],recent:[{$sort:{createdAt:-1}},{$limit:5},{$project:{plantName:1,diseaseName:1,status:1,createdAt:1}}]}}]);
  const counts={healthy:0,disease_detected:0,uncertain:0,unsupported_plant:0};for(const item of data.counts)counts[item._id]=item.count;res.json({total:Object.values(counts).reduce((a,b)=>a+b,0),counts,commonDiseases:data.commonDiseases,recent:data.recent});
}
