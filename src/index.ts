require('dotenv').config()
const express = require('express');
const cors = require('cors')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const uri = process.env.MONGODB_URL

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const run = async() => {
  try {
    await client.connect();

    const db = client.db('StayFinder')
    const hotelCollections = db.collection('hotels')

    app.get('/api/hotels', async (req,res) => {
      const result = await hotelCollections.find().toArray()
      res.json(result)
    })

    app.post('/api/hotels', async (req,res) => {
      const newData = req.body
      const result = await hotelCollections.insertOne(newData)
      res.json(result)
    })

    app.get('/api/hotels/:id', async (req,res) => {
      const {id} = req.params
      const result = await hotelCollections.find({userId: id}).toArray()
      res.json(result)
    })

    app.patch('/api/hotels/edit/:id', async (req,res) => {
      const {id} = req.params
      const m = req.body
      const updateDocument = {
        $set: m
      }
      const result = await hotelCollections.updateOne({_id: new ObjectId(id)}, updateDocument)
      res.json(result)
    })

    app.delete('/api/hotels/delete/:id', async (req,res) => {
      const {id} = req.params
      const result = await hotelCollections.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } 
  finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World Umayer')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})