import mongoose from 'mongoose';
const schema=new mongoose.Schema({plant:String,disease:String,classLabel:{type:String,unique:true,required:true},symptoms:[String],generalInformation:String,source:String},{timestamps:true});
export const Disease=mongoose.model('Disease',schema);
