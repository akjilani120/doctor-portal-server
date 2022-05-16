const express = require('express')
const app = express()
const cors = require('cors');
const port =process.env.PORT || 5000
require('dotenv').config() 
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json())

const uri =`mongodb+srv://doctor-portal:ISsdPmGjJWdAUwd1@cluster0.8uxou.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
 const doctorCollection = client.db("doctor-portal").collection("service");
 const bookingCollection = client.db("doctor-portal").collection("bookings");
async function  run (){
  try{
   
    await client.connect();
    app.get('/service', async (req, res) =>{
      const query ={}
      const cursor = doctorCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })
    app.post('/booking', async(req, res) =>{
      const booking = req.body;
      console.log(booking)

      const query = {treatment:booking.treatment, date:booking.date, patient:booking.patient}
      console.log(query)
       const exits = await bookingCollection.findOne(query)
       
       if(exits){
         return res.send({sucess:false, booking:exits})
       }
      const result = await bookingCollection.insertOne(booking)
       return res.send({sucess:true , result})
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