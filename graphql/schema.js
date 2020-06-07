const { buildSchema } = require('graphql');

module.exports  = buildSchema(`
type post{
    _id:String!
    title:String!
    imageUrl:String!
    content:String!
    creator:User!
    createdAt: String!
    updatedAt: String!
}
type User {
    _id: ID!
    name:String!
    email:String!
    password:String
    status: String!
    posts:[post!]!
}

type AuthData {
    token:String!
    userID:String!
}

type postData{
    posts:[post!]!
    total:Int!
}

input UserInputData{
    email:String!
    name:String!
    password:String!
}

input UserInputlogin{
    email:String!
    password:String!
}

input userPostInput{
    title:String!
    content:String!
    imageUrl:String
}

type RootQuery{
    login(userInput:UserInputlogin):AuthData!
    posts(page:Int):postData
    singlePost(postId:ID):post!
}

type RootMutation{
    createUser(userInput:UserInputData):User!
    createPost(postInput:userPostInput):post!
    updatePost(id:ID!,postInput:userPostInput):post!
    deletePost(id:ID!):Boolean
}

schema{
        query:RootQuery
        mutation: RootMutation
    }
`);