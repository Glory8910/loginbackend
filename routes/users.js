var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var mongodb = require('mongodb')
var mongoose = require('mongoose')
var cors = require('cors');
var bodyparser = require('body-parser')
const nodemailer = require("nodemailer");
const { google } = require('googleapis')
var jwt = require('jsonwebtoken')
var { nanoid } = require("nanoid");
var ids = nanoid(5);
require('dotenv/config');


var { userdata } = require("../models/userslist");
const { gmail } = require('googleapis/build/src/apis/gmail');
const { defaultMaxListeners } = require('nodemailer/lib/mailer');
const { realtimebidding } = require('googleapis/build/src/apis/realtimebidding');
router.use(bodyparser.urlencoded({ extended: false }))

let jwtsecret = process.env.JWT_SECRET
let CLIENT_ID = process.env.ID
let CLIENT_SECRET = process.env.SECRET
let REDIRECT_URI = process.env.URI
let REFRESH_TOKEN = process.env.TOKEN
let key = process.env.PASSWORD

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

const acessToken = oAuth2Client.getAccessToken()

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: "oAuth2",
    user: "workatalltimemail@gmail.com",
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    accessToken: acessToken
  }
})


async function sendMail(a) {
  try {


    if (a.id) {
      console.log(`http://localhost:3000/users/checkmail/${a.id}/${a.email}`)
      const opt = {
        from: "workatalltimemail@gmail.com",
        to: a.email,
        subject: "Reset link",
        text: "you can clik the link for resetting you password",


        html: `<a href="http://localhost:3000/users/checkmail/${a.id}/${a.email}""> reset password </a>`
      }

      const result1 = await transport.sendMail(opt)
      return result1
    }
    else {

      const mailoptions = {
        from: "workatalltimemail@gmail.com",
        to: a,
        subject: "hii hello and we are glad you are here",
        text: "Greetings",
        html: "<h1>welcome</h1>"
      }


      const mailtoadmin = {
        from: "workatalltimemail@gmail.com",
        to: "workatalltimemail@gmail.com",
        subject: "new user have registered",
        text: `${a} has registered`
      }

      const result = await transport.sendMail(mailoptions)


      const alertnotify = await transport.sendMail(mailtoadmin)


      return result, alertnotify
    }


  } catch (err) {
    console.log(err)
  }
}


const uri = `mongodb+srv://seeli:${key}@user.mcvkn.mongodb.net/user?retryWrites=true&w=majority`


router.use(cors())
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

var corsOptions = {
  origin: 'null' || "http://169.254.254.71",
  methods:"POST GET",
  optionsSuccessStatus: 200 || 204
}


router.options('*', cors(corsOptions))

router.post('/reg', cors(), async function (req, res, next) {

  try {
    await mongoose.connect(uri, { useNewUrlParser: true }, { useUnifiedTopology: true });
    const salt = bcrypt.genSaltSync(10);

    let hash = await bcrypt.hash(req.body.password, salt)
    console.log(salt, hash)
    req.body.password = hash;
    await mongoose.connect(uri, { useNewUrlParser: true }, { useUnifiedTopology: true });
    let value = new userdata({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password
    })

    await value.save()

    await mongoose.disconnect()
    sendMail(req.body.email)
      .then((result) => console.log("mail sent", result))
      .catch((error) => console.log(error))
    res.json({ "mess": "welcome" })
  }
  catch (err) {
    console.log(err)
  }


})



router.options('/login', cors(corsOptions))
router.post("/login", cors(), async (req, res) => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });

    console.log(req.body.email, "mail")

    let user = await userdata.findOne({ email: req.body.email })
    console.log(user);


    if (user) {

      let comp = await bcrypt.compare(req.body.password, user.password);
      console.log(comp, "value")
      if (comp) {

        let token = jwt.sign({ userid: user._id }, jwtsecret, { expiresIn: '1h' })

        console.log(token)
        res.json({ token: token })


        await mongoose.disconnect()


      }
      else {
        res.json({ "mess": "invalid credentials" })
      }

    } else {
      console.log("user not found")
    }

  }
  catch (err) {
    console.log(err)
  }

})




router.post("/resetpassword", cors(), async (req, res) => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });

    console.log(req.body, "given data");


    let user = await userdata.findOne({ email: { $eq: req.body.email } })

    console.log(user);


    if (user) {

      const salt = bcrypt.genSaltSync(10);

      let hash = await bcrypt.hash(req.body.password, salt)
      console.log(salt, hash)


      let doc = await userdata.updateOne({ _id: user._id }, {
        $set: { password: hash }
      });

      userdata.updateOne({ _id: user._id }, { $set: { resetid: "" } })



      await mongoose.disconnect()

      res.json({ "mess": "password is reset" })

    }
    else {
      res.json({ "mess": "invalid credentials" })
    }

  }
  catch (err) {
    console.log(err)
  }

})



router.post("/reset", cors(), async (req, res) => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });

    console.log(req.body)
    let user = await userdata.findOne({ email: { $eq: req.body.email } })
    if (user) {
      console.log(ids)
      let identity = {};
      identity.id = ids;
      identity.email = req.body.email;

      await userdata.findOneAndUpdate({ email: req.body.email }, { $set: { resetid: ids } })


      sendMail(identity)
        .then((result) => console.log("mail sent", result))
        .catch((error) => console.log(error))
      await mongoose.disconnect();

      res.json({ "mess": "reset ready" })
    }
    else {
      res.json({ "mess": "user not found" })
    }

  } catch (err) {
    console.log(err)
  }
})



router.get("/checkmail/:splid/:emailid", cors(), async (req, res) => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
    let user = await userdata.findOne({ email: { $eq: req.params.emailid } })
    if (user.resetid === req.params.splid) {
res.redirect("https://heuristic-bardeen-9b8469.netlify.app/")
     
    }
    else {
      res.json({ 'mess': "invalid details" })
    }

  }
  catch (error) {
    console.log(error)
  }
})



function authenticate(req, res, next) {
  console.log(req.headers, "SEE", req.body)
  try {
    if (req.headers.authorization) {

      jwt.verify(req.headers.authorization, jwtsecret, function (err, data){
        if( err) throw err
        if (data) {
          next();
        }
      }
      );


    }
    else {
      res.json({ "mess": "invalid creditials" })
    }
  }
  catch (err) {
    console.log(err)
  }
}



router.get("/mainurlpage",cors(), authenticate, (req, res) => {

  console.log("hi")

  
  res.redirect("https://heuristic-bardeen-9b8469.netlify.app/")

})

module.exports = router;
