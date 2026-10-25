import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true},email:{type:String,unique:true,required:true},passwordHash:{type:String,required:function(){return !this.googleSub;},select:false},googleSub:{type:String,unique:true,sparse:true,select:false}},{timestamps:true});
export const User=mongoose.model('User',schema);
