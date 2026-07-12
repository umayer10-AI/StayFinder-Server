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
    const subscriptionCollections = db.collection('subscription')
    const paymentCollections = db.collection('payment')
    const userCollections = db.collection('user')
    const bookingCollections = db.collection('booking')

    app.get('/api/hotels', async (req,res) => {
      const result = await hotelCollections.find().toArray()
      res.json(result)
    })

    app.get('/api/hotels/single/:id', async (req,res) => {
      const {id} = req.params
      const result = await hotelCollections.findOne({_id: new ObjectId(id)})
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

    app.post('/api/subscription', async (req,res) => {

      const {session_id, priceId, userId, userEmail} = req.body

      const isExist = await subscriptionCollections.findOne({session_id})
        if(isExist){
          return res.json({message: 'Aready Exist'})
        }

      await subscriptionCollections.insertOne({
          session_id,
          priceId,
          userId,
          userEmail,
        })

        await userCollections.updateOne(
          {_id: new ObjectId(userId)},
          { $set: { plan: 'pro'}}
        )

        res.json({message: 'Payment Successfull'})

    })

    app.post('/api/payment', async (req,res) => {

      const {session_id, price, userId, userEmail, hotelName, hotelId} = req.body

      const isExist = await paymentCollections.findOne({session_id})
        if(isExist){
          return res.json({message: 'Aready Exist'})
        }

      await paymentCollections.insertOne({
          session_id,
          price,
          userId,
          userEmail,
          hotelName,
          hotelId,
          paidAt: new Date(),
        })

        const findData = await hotelCollections.findOne({_id: new ObjectId(hotelId)})

        delete findData._id;

        await bookingCollections.insertOne({
          ...findData,
          bookingAt: new Date(),
        });

        res.json({message: 'Payment Successfull'})

    })

    app.get('/api/hotels/customer/transiction/:id', async (req,res) => {
      const {id} = req.params
      const result = await paymentCollections.find({userId: id}).toArray()
      res.json(result)
    })

    app.get('/api/hotels/customer/transiction/booking/:id', async (req,res) => {
      const {id} = req.params
      const result = await bookingCollections.find({userId: id}).toArray()
      res.json(result)
    })

    app.delete('/api/hotels/customer/transiction/booking/delete/:id', async (req,res) => {
      const {id} = req.params
      const result = await bookingCollections.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    })

    app.get('/api/hotels/transiction/colection', async (req,res) => {
      const result = await paymentCollections.find().toArray()
      res.json(result)
    })

    app.get('/api/hotels/admin/booking', async (req,res) => {
      const result = await bookingCollections.find().toArray()
      res.json(result)
    })

    app.get('/api/users', async (req,res) => {
      const result = await userCollections.find().toArray()
      res.json(result)
    })




    app.patch("/api/users/block/:id", async (req, res) => {
        const { id } = req.params;

        const user = await userCollections.findOne({
          _id: new ObjectId(id),
        });

        if (!user) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        const result = await userCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isBlock: !user.isBlock,
            },
          }
        );

        res.json(result);
      });

      app.get('/api/admin/hotels', async(req,res) => {
        const result = await hotelCollections.find().toArray()
        res.json(result)
      })

      app.get('/api/admin/hotels/plan', async(req,res) => {
        const result = await userCollections.find({plan: 'pro'}).toArray()
        res.json(result)
      })

      app.get('/api/admin/block', async(req,res) => {
        const result = await userCollections.find({isBlock: true}).toArray()
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