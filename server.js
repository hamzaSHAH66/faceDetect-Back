import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import knex from 'knex';
import bcrypt from 'bcrypt-nodejs';
import Clarifai from 'clarifai';

const api = new Clarifai.App({apiKey : '2436676414ff434e9f4ba94d46bcf4c8'});


const app = express();
app.use(cors());
app.use(bodyParser.json());

// const db = knex({
//     client:'pg',
//     connection:{
//         host:'localhost',
//         user:'postgres',
//         password:'root',
//         database:'projectprac'
//     }
// });

const db = knex({
    client:'pg',
    connection:{
        connectionString:process.env.DATABASE_URL,
        ssl:{
            rejectUnauthorized:false
        }
    }
});


app.post('/signin',(req,res)=>{

    const {email,pass} = req.body;

    if(!email || !pass){


        return  res.status(400).json('inccorrect form submission');
      }

    db.select('email','hash').from('login').where('email', '=',email )
    .then(data=>{
        const isValid = bcrypt.compareSync(pass,data[0].hash);
        if(isValid){
            return db.select('*').from('users')
            .where('email','=',email)
            .then(user =>{
                res.json(user[0])
            }).catch(err=>res.status(400).json('unable to get a user'))

        }
        else{
            res.status(400).json('wrong credentials');
        }
    }).catch(err=> res.status(400).json('wrong credentials'))


});
app.post('/register',(req,res)=>{

    const {name,email,pass} = req.body;

    if (!name || !pass || !email){


        return  res.status(400).json('inccorrect form submission');
      }


    const hash = bcrypt.hashSync(pass);

    db.transaction(trx =>{
        trx.insert({
            hash: hash,
            email:email
        })
        .into('login')
        .returning('email')
        .then(loginEmail =>{
            return trx('users')
            .returning('*')
            .insert({
                email:loginEmail[0],
                name:name,
                joined:new Date()
            }).then(user =>{
                res.json(user[0]);
            })
        }).then(trx.commit)
            .catch(trx.rollback);
    }).catch(err=>res.status(400).json('unable to register'));
    
})

app.post('/imageurl',(req,res)=>{

    api.models.predict("a403429f2ddf4b49b307e318f00e528b",req.body.input)
    .then(data=>{

        res.json(data);
    }).catch(err=>res.status(400).json('unable to work with API')) 
})

app.put('/image',(req,res)=>{

    const {id} = req.body;

    db('users').where('id','=',id)
    .increment('entries',1)
    .returning('entries')
    .then(entries =>{

        res.json(entries);
    }).catch(err =>res.status(400).json('unable to get entries'))
})

app.listen(process.env.PORT||5000,()=>{
    console.log(`App is ruuning on port ${process.env.PORT}`);
})
