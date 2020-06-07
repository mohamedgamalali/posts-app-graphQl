const express    = require('express');
const mongoose   = require('mongoose');
const bodyParser = require('body-parser');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const app        = express();
const graphQL    = require('express-graphql'); 

const graphqlSchema   = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const Auth = require('./middlewere/auth');


const MONGODB_URI =
  'URL';

const fileStorage = multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'images');
  },
  filename:(req,file,cb)=>{
    cb(null,new Date().toISOString()+'-' + file.originalname);
  }
});

const fileFilter = (req,file,cb)=>{
  if(file.mimetype==='image/png'||
  file.mimetype==='image/jpg' ||
  file.mimetype==='image/jpeg' ){
      cb(null,true);
  }else {
    cb(null,false);
  }
}

//medewere
app.use(bodyParser.json()); //app json data
app.use(multer({storage:fileStorage,fileFilter:fileFilter}).single('image'));
app.use('/images',express.static(path.join(__dirname,'images')));

app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Headers','Content-type,Authorization');
  next();
});
app.use(Auth);
app.use(
  '/graphql',
  graphQL({
    schema:graphqlSchema,
    rootValue:graphqlResolver,
    graphiql:true,
    customFormatErrorFn:(err)=>{
      if(!err.originalError){
        return err;
      }
      const data    =  err.originalError.data;
      const message =  err.message || 'an error ocured';
      const code    =  err.originalError.code || 500 ;
      return {
        message:message,
        status:code,
        data:data
      }
    }
  })
);
app.put('/post-image',(req,res,next)=>{
  if(!req.isAuth){
    const error = new Error('un Authrized!!');
    error.code  = 401;
    throw error ;
}
  if(!req.file){
    return res.status(200).json({message:'No File provided!'});
  }
  if(req.body.oldPath){
    clearImage(req.body.oldPath);
  }
  return res.status(201).json({message:'file stored!',filePath:req.file.path});
});
app.use((error,req,res,next)=>{
  console.log(error);
  const status  = error.statusCode || 500 ;
  const message = error.message ;
  const data    = error.data ;
  res.status(status).json({message:message,data:data});

});

mongoose
.connect(
  MONGODB_URI,{
      useNewUrlParser: true,useUnifiedTopology: true}
)
  .then(result => {
    app.listen(5000,()=>{
      console.log('listen and connected to db...');
      
    });
    
  })
  .catch(err => {
    console.log(err);
  });


  const clearImage = filePath =>{
    filePath = path.join(__dirname,'..',filePath);
    fs.unlink(filePath,err=>console.log(err));
  }