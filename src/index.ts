// @ts-nocheck

const { jwtVerify, createRemoteJWKSet } = require("jose-cjs");

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

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.NEXT_PUBLIC_CLIENT_API}/api/auth/jwks`)
)

const verify = async(req,res,next) => {
  const header = req.headers.authorization
  if(!header){
    return res.status(401).json({message: 'Unauthorized'})
  }
  const token = header.split(' ')[1]
  if(!token){
    return res.status(401).json({message: 'Unauthorized'})
  }
  // console.log(token)
  try{
    const { payload } = await jwtVerify(token, JWKS)
    req.user = payload
    next()
  }
  catch(error){
    return res.status(403).json({message: 'Forbidden'})
  }
}

const customerVerify = async(req,res,next) => {
  const user = req.user
  console.log(user)
  if(user.role !== 'customer'){
    return res.status(403).json({message: 'Forbidden'})
  }
  next()
}
const adminVerify = async(req,res,next) => {
  const user = req.user
  console.log(user)
  if(user.role !== 'admin'){
    return res.status(403).json({message: 'Forbidden'})
  }
  next()
}

const run = async() => {
  try {

    const db = client.db('StayFinder')
    const hotelCollections = db.collection('hotels')
    const subscriptionCollections = db.collection('subscription')
    const paymentCollections = db.collection('payment')
    const userCollections = db.collection('user')
    const bookingCollections = db.collection('booking')


    app.get("/api/hotels", async (req, res) => {
      const {
        search = "",
        category = "",
        page = 1,
        limit = 8,
      } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          {
            title: {
              $regex: search,
              $options: "i",
            },
          },
          {
            description: {
              $regex: search,
              $options: "i",
            },
          },
          {
            location: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      if (category) {
        query.type = category;
      }

      const currentPage = Number(page);
      const perPage = Number(limit);

      const total = await hotelCollections.countDocuments(query);

      const hotels = await hotelCollections
        .find(query)
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .toArray();

      res.json({
        hotels,
        total,
        totalPages: Math.ceil(total / perPage),
        currentPage,
      });
    });

    app.get('/api/hotels/single/:id', async (req,res) => {
      const {id} = req.params
      const result = await hotelCollections.findOne({_id: new ObjectId(id)})
      res.json(result)
    })

    app.post('/api/hotels',verify, customerVerify, async (req,res) => {
      const newData = req.body
      const result = await hotelCollections.insertOne(newData)
      res.json(result)
    })

    app.get('/api/hotels/:id',verify, customerVerify, async (req,res) => {
      const {id} = req.params
      const result = await hotelCollections.find({userId: id}).toArray()
      res.json(result)
    })

    app.patch('/api/hotels/edit/:id', verify, async (req,res) => {
      const {id} = req.params
      const m = req.body
      const updateDocument = {
        $set: m
      }
      const result = await hotelCollections.updateOne({_id: new ObjectId(id)}, updateDocument)
      res.json(result)
    })

    app.delete('/api/hotels/delete/:id', verify, async (req,res) => {
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
      console.log({userId, userEmail})

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

        if (!findData) {
          return res.status(404).json({
            message: "Hotel not found",
          });
        }

        delete findData._id;

        await bookingCollections.insertOne({
          hotelName,
          type: findData.type,
          description: findData.description,
          location: findData.location,
          contact: findData.contact,
          image: findData.image,
          price: findData.price,
          userId,
          userEmail,
          hotelId,
          bookingAt: new Date(),
        });

        res.json({message: 'Payment Successfull'})

    })

    app.get('/api/hotels/customer/transiction/:id', verify, customerVerify, async (req,res) => {
      const {id} = req.params
      const result = await paymentCollections.find({userId: id}).toArray()
      res.json(result)
    })

    app.get('/api/hotels/customer/transiction/booking/:id', async (req,res) => {
      const {id} = req.params
      const result = await bookingCollections.find({userId: id}).toArray()
      res.json(result)
      // console.log(id)
    })

    app.delete('/api/hotels/customer/transiction/booking/delete/:id',verify, async (req,res) => {
      const {id} = req.params
      const result = await bookingCollections.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    })

    app.get('/api/hotels/transiction/colection',verify, adminVerify, async (req,res) => {
      const result = await paymentCollections.find().toArray()
      res.json(result)
    })

    app.get('/api/hotels/admin/booking', async (req,res) => {
      const result = await bookingCollections.find().toArray()
      res.json(result)
    })

    app.get('/api/users', verify, adminVerify, async (req,res) => {
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

      app.get('/api/admin/hotels', verify, adminVerify, async(req,res) => {
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