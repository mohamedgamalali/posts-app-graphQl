const fs = require('fs');
const path = require('path');


const {validationResult} = require('express-validator/check');

const io   = require('../socket.io/socket'); 
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req,res,next)=>{
  const page = req.query.page || 1 ;
  const postPerPage = 2 ;
  let totalPosts ;

  Post.find({})
  .sort({date:-1})
  .countDocuments()
  .then(count=>{
    totalPosts = count;
    return Post.find()
    .populate('creator')
    .skip((page-1)*postPerPage)
    .limit(postPerPage)
    .then(result=>{
      console.log(result);
      return res.status(200).json({posts:result,totalItems:totalPosts});
    });
  })
  .catch(err=>{
    if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  })
  
}


exports.creatPost = (req,res,next)=>{
  const error = validationResult(req);
  let creator;
  let newPost ;
  if(!error.isEmpty()){
    const errorr = new Error('invalid input');
     errorr.statusCode = 422;
     throw errorr ;
  }
  if(!req.file){
    const errorr = new Error('no image found.');
     errorr.statusCode = 422;
     throw errorr ;
  }
  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path;
   newPost = new Post({
    title:title,
    content:content,
    imageUrl:imageUrl,
    creator:req.userId
  });
  newPost.save().then(result=>{
    
    return User.findById(req.userId);
  })
  .then(user=>{
    creator = user;
    console.log(newPost);
    
    user.posts.push(newPost);
    return user.save();
  })
  .then(result=>{
    //console.log(newPost);
    io.getIo().emit('posts',{action:'creat',post:{...newPost._doc,creator:{_id: req.userId,name:creator.name}}});
    res.status(201).json({
      message:'susess',
      post:newPost,
      creator:{_id:creator._id,name:creator.name}
    });
  })
  .catch(err=>{
    if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  });
}

exports.getSinglePost = (req,res,next)=>{
  const postId = req.params.id;
  Post.findById(postId).then(result=>{
    if(!result){
      const error = new error('post not found 404...');
      error.statusCode = 404;
      throw error ;
    }
    return res.status(200).json({post:result});
  })
  .catch(err=>{
    if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  });
}


exports.putEdit = (req,res,next)=>{
  const postId  = req.params.id;
  const title   = req.body.title;
  const content = req.body.content;
  let imageUrl  = req.body.image;
  const error = validationResult(req);
  if(!error.isEmpty()){
    const errorr = new Error('invalid input');
     errorr.statusCode = 422;
     throw errorr ;
  }
  if(req.file){
    imageUrl = req.file.path;
  }
  if(!imageUrl){
    const error = new Error('No file picked');
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
  .populate('creator')
  .then(post=>{
    
    
    if(!post){
      const error = new Error('coundl Not Find post!!');
      error.statusCode = 404 ;
      throw error ;
    }
    if(post.creator._id.toString()!==req.userId.toString()){
      const error = new Error('not outhrized!!');
      error.statusCode = 403 ;
      throw error ;
    }
    if(imageUrl!==post.imageUrl){
      clearImage(post.imageUrl);
    }
    post.title   = title;
    post.content = content;
    post.imageUrl= imageUrl;
    return post.save();
  })
  .then(result=>{
    io.getIo().emit('posts',{action:'update',
    post:result});
    res.status(200).json({message:'post updated!',post:result});
  })
  .catch(err=>{
    if(!err.statusCode){
      err.statusCode = 500 ;
    }
    next(err);
  })
}


exports.deletePost = (req,res,next)=>{
  const postId = req.params.postId ; 
  Post.findById(postId).then(post=>{
    if(!post){
      const error = new Error('post not found!!');
      error.statusCode = 404 ;
      throw error;
    }
    if(post.creator.toString()!==req.userId){
      const error = new Error('not outhrized!!');
      error.statusCode = 403 ;
      throw error ;
    }
    clearImage(post.imageUrl);
    return Post.findByIdAndRemove(postId);
  })
  .then(result=>{
    return User.findById(req.userId);
  })
  .then(user=>{
    user.posts.pull(postId);
    io.getIo().emit('posts',{action:'delete',
    post:postId});
    return res.status(200).json({message:'post deleted'});
  })
  .catch(err=>{
      if(!err.statusCode){
        err.statusCode = 500 ;
      }
      next(err);
  });
}


const clearImage = filePath =>{
  filePath = path.join(__dirname,'..',filePath);
  fs.unlink(filePath,err=>console.log(err));
}