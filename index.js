const express = require('express')
const app = express()
const cors = require('cors');
const port =process.env.PORT || 5000
require('dotenv').config() 
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
app.use(cors())
app.use(express.json())

const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8uxou.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function varifyJWT (req, res, next){  
  const authorizationHead = req.headers.authorization;
  
  if(!authorizationHead){
    return res.status(401).send({message:"Unauthorization access"})
  }
  const token = authorizationHead.split(" ")[1]
 
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(403).send({message:"Forbidden access"} )
    }
    req.decoded = decoded

  next()
  
  });
  
} 
 
async function  run (){
 
  try{
    await client.connect();
    const doctorCollection = client.db("doctor-portal").collection("service");
    const bookingCollection = client.db("doctor-portal").collection("bookings");
    const userCollection = client.db("doctor-portal").collection("user");
    const doctorsDataCollection = client.db("doctor-portal").collection("doctor");
    
    // varify Admin function
    const varifyAdmin = async (res , req , next) =>{
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester})
      if(requesterAccount.role === "admin"){
        next()
      } else{
        return res.status(403).send({message:"Forbidden Access"})
      }     
    }
    
    app.get('/service', async (req, res) =>{
      const query ={}
      const cursor = doctorCollection.find(query).project({name:1})
      const result = await cursor.toArray()
      res.send(result)
    })
    app.post('/booking', async(req, res) =>{
      const booking = req.body;     
      const query = {treatment:booking.treatment, date:booking.date, patient:booking.patient}     
       const exits = await bookingCollection.findOne(query)       
       if(exits){
         return res.send({sucess:false, booking:exits})
       }
      const result = await bookingCollection.insertOne(booking)
       return res.send({sucess:true , result})
    })

    
    app.get('/booking', varifyJWT,  async(req ,res) =>{
       const patient = req.query.patient
      const query={patient}
      const decordedEmail= req.decoded.email    
               
     
      if(patient === decordedEmail){
        const booking = await bookingCollection.find(query).toArray() 
       return res.send(booking)
      } else{
        return res.status(403).send({message:"Forbidden Access"})
      }     
    
      
    })

    app.get("/available", async(req, res) =>{
    //  Step: 1
      const date = req.query.date; 
      const services = await doctorCollection.find().toArray()
    // Step: 2
      const query ={date}
      const booking = await bookingCollection.find(query).toArray() 
      
   // step:3
    services.forEach(service =>{
      const serviceBookings = booking.filter(b => b.treatment === service.name)
     const booked = serviceBookings.map(s => s.slot);
     const available = service.slots.filter(s => !booked.includes(s))     
     service.available = available
    }) 
      res.send(services)
      
    })
    app.get('/users', varifyJWT, async(req , res) =>{
      const users = await  userCollection.find().toArray()
      res.send(users)
    })
    app.put('/user/:email' , async (req , res) =>{
      const email = req.params.email;     
      const filter={email}
      const options = { upsert: true };
      const user = req.body;     
      const updateDoc = {
        $set: user
      };
      const result = await userCollection.updateOne(filter, updateDoc, options)     
      const token = jwt.sign({email}, `${process.env.ACCESS_TOKEN_SECRET}`, );     
      res.send({result , token})
    })
    app.put('/user/admin/:email',  varifyJWT , async (req , res) =>{
      const email = req.params.email;     
      const filter={email}      
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester})
      if(requesterAccount.role === "admin"){
        const updateDoc = {
          $set: { role :  'admin' } ,
        };
        const result = await userCollection.updateOne(filter, updateDoc)     
          
        res.send(result )
      }else{
        res.status(403).send({message:" forbidden admin access"})
      }
     
    })
    app.get('/admin/:email', async(req , res) =>{
      const email = req.params.email;
      const user  = await userCollection.findOne({email: email})
      const isAdmin = user.role ==="admin";
      res.send({admin : isAdmin})
    })
    app.get('/doctor', varifyJWT,  async(req , res) =>{
      const result = await doctorsDataCollection.find().toArray()
      res.send(result)
    })

   
    app.post('/doctor',varifyJWT,   async(req , res) =>{
      const doctor = req.body;
      const result = await doctorsDataCollection.insertOne(doctor)
      res.send(result)
    })
  }finally{

  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('I am doctor portal')
})

app.listen(port, () => {
  console.log(`Doctor portal service center ${port}`)
})