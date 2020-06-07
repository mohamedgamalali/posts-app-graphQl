const bycript   = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const validator = require('validator');
const path      = require('path');
const fs      = require('fs');

const User = require('../models/user');
const Post = require('../models/post');

const privateKey = 'hellothatisourincriptionpleasedonothackme';

module.exports = {
    createUser({userInput}, req){
        const errors = [];
        if(!validator.isEmail(userInput.email)){
            errors.push({message:'invalid email.'})
        }
        if(validator.isEmpty(userInput.password) || !validator.isLength(userInput.password,{min:5})){
            errors.push({message:'password to short'})
        }
        if(errors.length>0){
            const error   = new Error('invalid input!!.');
            error.data = errors ;
            error.code = 422    ;  
            throw error ;
        }
        return User.findOne({email:userInput.email}).then(user=>{
            if(user){
                const error = new Error('User exists already');
                error.code = 422    ; 
                throw error;
            }
            return bycript.hash(userInput.password,12);
        })
        .then(hashed=>{
            const Newuser = new User({
                email:userInput.email,
                password:hashed,
                name:userInput.name
            });
            return Newuser.save();
        })
        .then(result=>{
            return {...result._doc,_id:result._id.toString()}
        })
        .catch(err=>{
            console.log(err);
        });
    },
    login({userInput},req){
        let logeedInUser;
        return User.findOne({email:userInput.email})
        .then(user=>{
            if(!user){
                const error = new Error('user not found');
                error.data  = 'user not found';
                error.code  = 404    ; 
                throw error;
            }
            logeedInUser = user ;
            return bycript.compare(userInput.password,user.password);
        })
        .then(match=>{
            if(!match){
                const error = new Error('wrong password!!');
                error.data  = 'wrong password!!';
                error.code  = 401    ; 
                throw error;
            }
            const token = jwt.sign(
                {
                   userId: logeedInUser._id.toString(),
                   email : logeedInUser.email 
                },
                privateKey,
                {expiresIn:'1h'}
            );
            return {
                token:token,
                userID:logeedInUser._id.toString()
            };
        })
        .catch(err=>{
            console.log(err);
        })
    },
    createPost({postInput},req){
        let newNewPost ;
        if(!req.isAuth){
            const error = new Error('not authrized');
            error.code  = 401;
            throw error ;
        }
        const errors = [];
        if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title,{min:5})){
            errors.push({message:'invalid title!!'});
        }
        if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content,{min:5})){
            errors.push({message:'invalid content!!'});
        }
        if(errors.length>0){
            const error   = new Error('invalid input!!.');
            error.data = errors ;
            error.code = 422    ;  
            throw error ;
        }
    return User.findById(req.userId)
    .then(user=>{
        if(!user){
            const error = new Error('invalid user!!.');
            error.code  = 401;
            throw error ;
        }
        const post = new Post({
        title:postInput.title,
        content:postInput.content,
        imageUrl:postInput.imageUrl,
        creator:user
        });
            return post.save();
    }).then(newPost=>{
        newNewPost = newPost ;
        return User.findById(req.userId)
    }).then(user=>{
        user.posts.push(newNewPost);
        return user.save();
    }).then(ress=>{
        return{
            ...newNewPost._doc,
             _id: newNewPost._id,
             createdAt: newNewPost.createdAt.toISOString(),
             updatedAt: newNewPost.updatedAt.toISOString()
        }
        }).catch(err=>{
            console.log(err);
        });

    },posts: async function({page},req) {
        if(!req.isAuth){
            const error = new Error('un Authrized!!');
            error.code  = 401;
            throw error ;
        }
        const postsPerPage = 2 ;

        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
        .skip((page-1)*postsPerPage)
        .limit(postsPerPage)
        .sort({createdAt:-1})
        .populate('creator');
        return {
            posts:posts.map(p=>{
                return{
                    ...p._doc,
                    _id:p._id.toString(),
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString()
                }
            }),
            total:totalPosts
        };
    },singlePost:async function({postId},req){
        if(!req.isAuth){
            const error = new Error('un Authrized!!');
            error.code  = 401;
            throw error ;
        }

        const post =  await Post.findById(postId)
        .populate('creator');

        if(!post){
            const error = new Error('post not Found!!');
            error.code  = 404;
            throw error ;
        }
        return{
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }
    },updatePost:async function({id,postInput},req){
        const errors = [];
        if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title,{min:5})){
            errors.push({message:'invalid title!!'});
        }
        if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content,{min:5})){
            errors.push({message:'invalid content!!'});
        }
        if(errors.length>0){
            const error   = new Error('invalid input!!.');
            error.data = errors ;
            error.code = 422    ;  
            throw error ;
        }
        if(!req.isAuth){
            const error = new Error('un Authrized!!');
            error.code  = 401;
            throw error ;
        }
        const post = await Post.findById(id)
        .populate('creator');
        if(!post){
            const error = new Error('post not Found!!');
            error.code  = 404;
            throw error ;
        }
        if(post.creator._id.toString()!==req.userId.toString()){
            const error = new Error('un Authrized!!');
            error.code  = 403;
            throw error ;
        }
        post.title = postInput.title;
        post.content = postInput.content;
        console.log(postInput.imageUrl);
        
        if(postInput.imageUrl){
            post.imageUrl = postInput.imageUrl;
        }
        const newPost = await post.save();
        return{
            ...newPost._doc,
            _id: newPost._id.toString(),
            createdAt: newPost.createdAt.toISOString(),
            updatedAt: newPost.updatedAt.toISOString()
        } 
    },deletePost: async function({id},req){
        if(!req.isAuth){
            const error = new Error('un Authrized!!');
            error.code  = 401;
            throw error ;
        }
        const post = await Post.findById(id)
        .populate('creator');
        if(!post){
            const error = new Error('post not Found!!');
            error.code  = 404;
            throw error ;
        }
        if(post.creator._id.toString()!==req.userId.toString()){
            const error = new Error('un Authrized!!');
            error.code  = 403;
            throw error ;
        }
        clearImage(post.imageUrl);
        const deletedPost = await Post.findByIdAndDelete(id);
        const user = await Post.findById(req.userId);
        user.posts.pull(id);
        await user.save();
        return true ;
    }
};

const clearImage = filePath =>{
    filePath = path.join(__dirname,'..',filePath);
    fs.unlink(filePath,err=>console.log(err));
  }