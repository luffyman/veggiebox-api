require('dotenv').config();
const _ = require('lodash/lang')
const express = require('express');
const turf = require('@turf/turf');
const bodyParser = require('body-parser');
const cors = require('cors');
var { expressjwt: jwt } = require("express-jwt");
var randomstring = require("randomstring");
const dayjs = require('dayjs');
const cookieParser = require('cookie-parser');
const jwtDecode = require('jwt-decode');
const mongoose = require('mongoose');
const { parseInt } = require('lodash');
const {
    createToken,
    createTokenMobileApp,
    hashPassword,
    verifyPassword
  } = require('./util');
const users = require('./db/users');
const items = require('./db/items');
const orders = require('./db/orders');
const { all } = require('underscore');
  const app = express()
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json());
  app.use(cookieParser());

  const port = process.env.PORT || 3001;
  app.get('/', (req, res) => {
    res.send('Holle from Team Dopbip!')
  })

  //Post unverified user
  app.post('/api/checkUser', async (req, res) => {
    const { phoneNumber } = req.body;
    try {
      const userData = await users.find({phoneNumber:phoneNumber})
      
      if (_.isEmpty(userData)) {
        users.create({ phoneNumber }, async (error, data) => {
          if (error) {
            console.error(error);
            res.status(500).send('Something bro00ooke!🤖⚡. We are looking into it\nPlease again later');
          }
          res.status(201)       
        })
      } else {
        res.status(201)
      }
      
    }
    catch(e) {
      console.error(e)
    }
  })

  app.get('/api/all_items', async (req, res) => {
    try {
      const itemsInStore = await items.find({qty_in_store: {$gt: 0}})
      console.log(items.find({}))
      if (_.isEmpty(itemsInStore)) {
        res.status(404).send('Out of Otock')
      } else {
        res.status(200).json(itemsInStore)
      }  //.lean().select("_id role")
      
    }
    catch(e) {
      console.error(e)
    }
  })

  app.post('/api/products/price', async(req,res) => {
    let  data = req.body
    console.log(data)
        let replyMsg = ``
        for (let i = 0; i < data.length; i++) {
         
          const element = data[i];
          let itemName = element[0]
          let itemPacksQty = element[1]
          let itemPrice
          try {
            const queryData = await items
              .find({
                $and: [
                  { key_word: { $in: [itemName.replaceAll(" ", "").toLowerCase()] } },
                  { qty_in_store: { $gt: 0 } }
                ]
              })
              .exec();
              if (_.isEmpty(queryData)) {
                replyMsg += `${itemName} _out of stock, will notify you when available._`
              } else {
                if (parseInt(itemPacksQty) < 1 || itemPacksQty == null) {
                  itemPrice = parseInt(queryData[0].pack_price);
                  replyMsg += `1 ${queryData[0].package_type} of ${queryData[0].packed_items} ${itemName} will cost k${itemPrice}\n`;
                } else {
                  console.log(queryData);
                  itemPrice = parseInt(queryData[0].pack_price) * parseInt(itemPacksQty);
                  replyMsg += `${itemPacksQty} ${queryData[0].package_type} of ${queryData[0].packed_items} ${itemName} will cost k${itemPrice}\n`;
                }
              }
           
          } catch (error) {
            console.error(error);
            res.status(500).send('Something bro00ooke!🤖⚡. We are looking into it\nPlease again later');
          }
          
        } 
        console.log(replyMsg)
        res.status(200).send(replyMsg)
    res.status(200)
  })

  app.post('/api/products/saveOrder', async (req, res) => {
    const data = req.body
    console.log(JSON.stringify(data, undefined,2))
    console.log(data['oderdetails']['cart'])
    console.log('################000')
    const {recipientPhone} = data['oderdetails']
    const {location} = data['oderdetails']
    let orderedItemList = []
    let totalAmount = 0
    // Define the town {Lusaka} boundaries as a polygon
    const lusakaCoordinates = [
      [28.2546 ,-15.4547], // Position 1
      [28.5054 ,-15.4547], // Position 2
      [28.2546 ,-15.2306], // Position 3
      [28.5054 ,-15.2306], // Position 4
      [28.2546 ,-15.4547]
      // Add more positions if needed
    ];

    const townPolygon = turf.polygon([lusakaCoordinates]);
    const user_longitude = data['oderdetails']['location']["longitude"]
    const user_latitude = data['oderdetails']['location']["latitude"]
    console.log(`${user_longitude} <><><> ${user_latitude}`)
    // Get the user's coordinates
    const userCoordinates = turf.point([user_longitude, user_latitude]);
    // Check if the user's coordinates are within the town boundaries
    if (turf.booleanPointInPolygon(userCoordinates, townPolygon)) {
      // Allow delivery
      console.log("Delivery allowed in the specified town.");
      for (let i = 0; i < data['oderdetails']['cart'].length; i++) {
        const element = data['oderdetails']['cart'][i];
        console.log(element)
        console.log('################')
        let itemName = element[0]
        let itemPacksQty = element[1]
        let itemPrice
        let packageType
  
        try {
          const queryData = await items.find({ key_word: { $in: [itemName.replaceAll(" ", "").toLowerCase()] } }).exec();
          
          if (parseInt(itemPacksQty) < 1 || itemPacksQty == null) {
            itemPrice = parseInt(queryData[0].pack_price);
            packageType = queryData[0].package_type
            orderedItemList.push({
              "itemName": itemName,
              "itemPrice": itemPrice,
              "itemPacksQty": itemPacksQty,
              "packageType": packageType
            })
            totalAmount += itemPrice
          } else {
            itemPrice = parseInt(queryData[0].pack_price) * parseInt(itemPacksQty)
            packageType = queryData[0].package_type
            orderedItemList.push({
              "itemName": itemName,
              "itemPrice": itemPrice,
              "itemPacksQty": itemPacksQty,
              "packageType": packageType
            })
            totalAmount += itemPrice
          }
        } catch (error) {
          console.error(error);
          res.status(500).send('Something bro00ooke!🤖⚡. We are looking into it\nPlease again later');
        }
  
      }
    } else {
      // Insert town cordinates
      // Restrict or deny delivery
      console.log("Delivery not allowed in the specified town.");
      res.status(500).send(`*I'm sorry, but we are not yet you in your town*\nWe will late you know once we available`);
    }
    
       // Create order
       const orderDetails = Object.assign({}, {
        recipientPhone,
        location,
        itemOrdered: orderedItemList,
        totalAmount: totalAmount
      })
      const odersDocument = await orders.create(orderDetails)
      odersDocument.save()
        .then(()=> {
          res.status(200).json({orderedItemList})
        })
        .catch((error) => {
          console.log(error)
          res.status(500).send('Something bro00ooke!🤖⚡. We are looking into it\nPlease again later');
        })
  })

                  ///////////////////////////////////
                  ////                            ///
                  ///  Mobile app Delivery app  ////
                  ///////////////////////////////////


app.post('/api/deliveryUserOtpVerify', async (req, res) => {
  try {
    const { phoneNumber, pin } = req.body;
    const user = await clientUser.findOne({
      phoneNumber: phoneNumber
    }).lean();

    if (!user) {
      return res.status(403).json({
        errorMsg: 'WRONG_AUTH'
      });
    }

    const passwordValid = await verifyPassword(
      pin,
      user.password
    );

    if (passwordValid) {
      
      const { 
        //firstName, 
        //lastName, 
        //phoneNumber, 
        role, 
        _id,
        //phoneNumber 
       } = user;
      const userInfo = Object.assign(
        {}, 
        { 
          // firstName, 
          // lastName,
          // phoneNumber, 
          role, 
          _id,
          //phoneNumber 
         });
      if (user.otpState == 1) {
        const token = createToken(userInfo);
        const decodedToken = jwtDecode(token);
        const expiresAt = decodedToken.exp;
        res.cookie('token', token, {httpOnly: true});
        res.status(201).json({
          errorMsg: 'OTP_UPDATE',
          token,
          userInfo,
          expiresAt
        });
      } 
      else {
        const token = createToken(userInfo);
        const decodedToken = jwtDecode(token);
        const expiresAt = decodedToken.exp;
        //res.cookie('token', token, {httpOnly: true});
        res.status(200).json({
          errorMsg: 'SUCCESS_AUTH',
          token,
          userInfo,
          expiresAt
        });
      }
      
    }
     else {
      res.status(401).json({
        errorMsg: 'WRONG_AUTH'
      });
    }
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .json({ errorMsg: 'UNKNOWN_AUTH_ERROR' });
  }
});

// const attachUser = (req, res, next) => {
//   const token = req.body.token;
//   if (!token) {
//     return res
//       .status(401)
//       .json({ message: 'Authentication invalid' });
//   }
//   const decodedToken = jwtDecode(token.slice(7));

//   if (!decodedToken) {
//     return res.status(401).json({
//       message: 'There was a problem authorizing the request'
//     });
//   } else {
//     req.user = decodedToken;
//     next();
//   }
// };

// app.use(attachUser);

// const requireAuth = jwt({
//   secret: process.env.JWT_SECRET,
//   audience: 'api.veggieBox.mobileApp',
//   issuer: 'api.veggieBox.mobileApp',
//   algorithms: ["HS256"],
//   getToken: req => req.body.token
// });

app.post("/api/vb_delivery_service/all_pending", async(req, res) => {
  try {
    const allPendingOders = await orders.find({status: "Pending"}).exec();
    if (_.isElement(all)) {
      res.status(404).send('No pending orders')
    } else {
      res.status(200).json(allPendingOders)
    }
  } catch (error) {
    console.log(error)
  }
})

/// Create delivery user ///
app.post('/api/add_delivery_user',
  async (req, res) => {
    //console.log(req)name
    
    try {
      const {phoneNumber, role} = req.body
      let deliveryUser = await users.findOne({
        phoneNumber
      }).lean().exec();

      if (_.isEmpty(deliveryUser)) {
        // Generate pin
        let randString = randomstring.generate({
          length: 4,
          charset: 'numeric'
        })
        let pin = await hashPassword(randString)
        console.log(randString)
        // create user
        let userData = await users.create({
          phoneNumber, 
          pin: pin,
          role
        })
        userData.save()
        .then(() => {
          res.status(201).json({"pin": randString})
        })
        .catch((error) => {
          console.log(error)
          res.status(500).send('Something bro00ooke!🤖⚡. We are looking into it\nPlease again later');
        })
        
      } else {
        return res.status(300)
        .json({ message: 'Delivery user already exists' });
      }
    
    } catch (err) {
      console.log(err)
      return res.status(500).json('There was a problem creating delivery user');
    }
  }
);

  async function connect() {
    try {
      mongoose.Promise = global.Promise;
      mongoose.connect(process.env.ATLAS_URL, {
      });
    } catch (err) {
      console.log('Mongoose error', err);
    }
    app.listen(port, () => {
      console.log("App is running on port " + port);
  });
  }
  
  connect();