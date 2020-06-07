const bycript = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const {validationResult} = require('express-validator/check');

const privateKey = 'hellothatisourincriptionpleasedonothackme';

const User = require('../models/user');


exports.signup=(req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('validation faild');
        error.statusCode = 422 ;
        error.data = errors.array();
        throw error ; 
    }

    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;

    bycript.hash(password,12)
    .then(hashed=>{
        const newUser =new  User({
            name:name,
            email:email,
            password:hashed,
            posts:[]
        });
        return newUser.save()
    })
    .then(result=>{
        res.status(201).json({message:'user created',userId:result._id});
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode = 500;
          }
          next(err);
    });
};


exports.login=(req,res,next)=>{
    const email     = req.body.email;
    const password  = req.body.password;
    let ourUser;
    User.findOne({email:email})
    .then(user=>{
        if(!user){
            const error = new Error('user not Found');
            error.statusCode = 401;
            throw error;
        }
        ourUser = user;
        return bycript.compare(password,user.password);
    })
    .then(isEqual=>{
        if(!isEqual){
            const error = new Error('entered wrond password');
            error.statusCode = 401;
            throw error;
        }else{
            const token  = jwt.sign(
                {
                    email:ourUser.email,
                    userId:ourUser._id.toString()
                },
                privateKey,
                {expiresIn:'1h'}
            );
        res.status(200).json({token:token ,userId:ourUser._id});

        }
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode = 500 ;
        }
        next(err);
    })
};
