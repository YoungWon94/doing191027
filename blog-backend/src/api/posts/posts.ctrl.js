/* eslint-disable require-atomic-updates */
import Post from "../../models/post";
import mongoose from "mongoose";
import Joi from 'joi';

const {ObjectId} = mongoose.Types;

export const checkObjectId = (ctx, next)=>{
  const {id} = ctx.params;
  if(!ObjectId.isValid(id)){
    ctx.status=400;
    return;
  }
  return next();
}



export const write = async ctx => {

  const schema = Joi.object().keys({ //객체가 다음 필드를 가지고 있음을 검증
    title : Joi.string().required(), //required() 가 있으면 필수항목
    body : Joi.string().required(),
    tags:Joi.array().items(Joi.string()).required() //문자열로 이루어진 배열
  });

  //검증 후 검증 실패인 경우 에러 처러ㅣ
  const result = Joi.validate(ctx.request.body, schema);
  if(result.error){
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const {title, body, tags} =ctx.request.body;
  const post = new Post({
    title,
    body,
    tags
  });

  try{
    await post.save(); //db에 저장. 반환값: promise
    // eslint-disable-next-line require-atomic-updates
    ctx.body = post;
  }catch(e){
    ctx.throw(500,e)
  }
};
export const list = async ctx => {
  const page = parseInt(ctx.query.page || '1', 10);

  if(page < 1){
    ctx.status = 400;
    return;
  }

  try{
    const posts = await Post.find()
      .sort({_id:-1}) // 1: 오름차순, -1 : 내림차순
      .limit(10) //보이는 개수 제한. 10개 문서(레코드)만 불러옴
      .skip((page-1)*10) //개수만큼 스킵하고 그 다음거 부터 불러옴
      .lean() //find()의 결과를 mongoose 문서 인스턴스 형태가 아닌 json 형태로 받는다.
      .exec(); 

      const postCount = await Post.countDocuments().exec(); 
      ctx.set('Last-Page', Math.ceil(postCount /10)); //Last-Page라는 커스텀 HTTP 헤더 설정.
      
      ctx.body = posts.map(post=>({
          ...post,
          body:
            post.body.length < 200 ? post.body : `${post.body.slice(0,200)}...`,
        }))
  }catch(e){
    ctx.throw(500,e);
  }
};
export const read = async ctx => {
  const {id} = ctx.params;
  try{
    const post = await Post.findById(id).exec();
    if(!post){
      // eslint-disable-next-line require-atomic-updates
      ctx.status = 404;
      return;
    }
    // eslint-disable-next-line require-atomic-updates
    ctx.body = post;
  }catch(e){
    ctx.throw(500,e);
  }
};
export const remove = async ctx => {
  const {id} = ctx.params;
  try{
    await Post.findByIdAndRemove(id).exec();
    // eslint-disable-next-line require-atomic-updates
    ctx.status = 204; //204 : 성공했지만 응답할 데이터 없음
  }catch(e){
    ctx.throw(500,e);
  }
};
export const update = async ctx => {

  const schema = Joi.object().keys({ 
    title : Joi.string(), 
    body : Joi.string(),
    tags:Joi.array().items(Joi.string()) 
  });

  //검증 후 검증 실패인 경우 에러 처러ㅣ
  const result = Joi.validate(ctx.request.body, schema);
  if(result.error){
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const {id} = ctx.params;
  try {
    const post = await Post.findByIdAndUpdate(id,ctx.request.body, {
      new : true // 이 값을 설정하면 업데이트 된 데이터를 반환, false 로 하면 업데이트 전 데이터를 반환
    }).exec();
    if(!post){
      ctx.status=404;
      return;
    }
    ctx.body=post;
  } catch (e) {
    ctx.throw(500,e);
  }  
};





