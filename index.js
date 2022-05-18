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
  console.log(token , "access token",process.env.ACCESS_TOKEN_SECRET )
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(403).send({message:"Forbidden access"} )
    }
    req.decoded = decoded

  next()
  
  });
  
} 
 
async function  run (){
  console.log("data base connect")
  try{
    const doctorCollection = client.db("doctor-portal").collection("service");
    const bookingCollection = client.db("doctor-portal").collection("bookings");
    const userCollection = client.db("doctor-portal").collection("user");
    await client.connect();
    app.get('/service', async (req, res) =>{
      const query ={}
      const cursor = doctorCollection.find(query)
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

    // app.get('/booking',   async(req ,res) =>{
    
    //   const query=req.query.patient
     
    //  const booking = await bookingCollection.find(query).toArray() 
    //  res.send(booking)
        
    
      
    // })
    app.get('/booking', varifyJWT,  async(req ,res) =>{
       const patient = req.query.patient
      const query={patient}
      const decordedEmail= req.decoded.email
      // console.log(patient)
      console.log("decoded email", decordedEmail,"patient", patient)         
     
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