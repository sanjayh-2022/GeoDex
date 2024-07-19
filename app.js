const express = require('express')
const fs = require('fs')
const nodemailer = require('nodemailer')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')
const ethers = require('ethers')
const multer = require('multer')
const ejsmate = require('ejs-mate')
const methodOverride = require('method-override')
const dotenv = require('dotenv')
const cryptoJS = require('crypto-js')

dotenv.config()

const app = express()
const port = 8080

const otpStore = {}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  auth: {
    user: 'landchain.gov@gmail.com',
    pass: process.env.NODE_MAILER_PASS,
  },
  tls: { rejectUnauthorized: false },
})

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.engine('ejs', ejsmate)
app.use(methodOverride('_method'))

const abiPath = path.resolve(__dirname, 'public', 'cleanedLandRegistry.json')
const abiJSON = fs.readFileSync(abiPath, 'utf8')
const contractABI = JSON.parse(abiJSON)
const abiPath2 = path.resolve(__dirname, 'public', 'cleanedLandNFT.json')
const abiJSON2 = fs.readFileSync(abiPath2, 'utf8')
const contractABI2 = JSON.parse(abiJSON2)
const contractAddress = process.env.CONTRACT_ADDRESS
const JWT = process.env.PINATA_JWT_KEY

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const upload = multer({ dest: uploadsDir })

let walletAddress = null
let signer = null

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}`,
  }

  return transporter.sendMail(mailOptions)
}

app.post('/connect-wallet', async (req, res) => {
  try {
    const { walletAddress: address } = req.body
    walletAddress = address
    res.json({ message: 'Wallet connected successfully!' })
  } catch (error) {
    console.error('Error connecting wallet:', error)
    res.status(500).json({ error: 'Error connecting wallet' })
  }
})

const ensureWalletAddress = async (req, res, next) => {
  try {
    while (!walletAddress) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    next()
  } catch (error) {
    console.error('Error ensuring wallet address:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

app.post('/request-otp', (req, res) => {
  const { email } = req.body
  const otp = generateRandomOtp()
  const otpHash = cryptoJS.SHA256(otp).toString()
  otpStore[email] = otpHash
  console.log(`Generated OTP for ${email}: ${otp}`)

  sendOTPEmail(email, otp)
  res.send(`OTP sent to ${email}`)
})

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body
  const otpHash = otpStore[email]
  if (otpHash && otpHash === cryptoJS.SHA256(otp).toString()) {
    delete otpStore[email] // Remove OTP after successful verification
    res.json({ success: true })
  } else {
    res.json({ success: false })
  }
})

// Function to generate a 6-digit OTP
function generateRandomOtp(length = 6) {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length) - 1
  const otp = Math.floor(Math.random() * (max - min + 1)) + min
  return otp.toString()
}

app.post('/uploadDocument', upload.single('file'), async (req, res) => {
  const file = req.file
  console.log(file)
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const filePath = file.path
  try {
    const formData = new FormData()
    formData.append('file', fs.createReadStream(filePath))
    const pinataMetadata = JSON.stringify({
      name: file.originalname,
    })
    formData.append('pinataMetadata', pinataMetadata)

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    })
    formData.append('pinataOptions', pinataOptions)

    const pinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxContentLength: Infinity, // Set maxContentLength instead of maxBodyLength
        headers: {
          Authorization: `Bearer ${JWT}`, // Use JWT for authorization
          ...formData.getHeaders(),
        },
      }
    )
    ipfsHash = pinataResponse.data.IpfsHash
    res.json({ ipfsHash })
  } catch (error) {
    console.log(error)
  }
})

app.get('/', async (req, res) => {
  res.render('listings/index.ejs')
})

app.get('/registerLand', (req, res) => {
  res.render('listings/landregister.ejs', { contractABI })
})

app.post('/sendLandId', (req, res) => {
  const { landId, name, email, phoneNumber } = req.body

  const mailOptions = {
    from: 'landchain.gov@gmail.com',
    to: email,
    subject: 'Land Registration Confirmation',
    text: `Hello ${name},\n\nYour land registration has been confirmed. Your land ID is: ${landId}.\n
      You will recieve you Land Verification report soon!\n\nRegards,\nLandChain`,
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error)
      res.status(500).json({ success: false, message: 'Failed to send email.' })
    } else {
      console.log('Email sent:', info.response)
      res
        .status(200)
        .json({ success: true, message: 'Email sent successfully.' })
    }
  })
})

app.get('/userdetails', ensureWalletAddress, async (req, res) => {
  res.render('listings/userdetails.ejs', { contractABI, walletAddress })
})

app.post('/registerUser', async (req, res) => {
  try {
    const txReceipt = req.body.txReceipt
    console.log('Transaction Receipt:', txReceipt)

    const topics = txReceipt.logs[0].topics
    console.log('Topics:', topics)

    const userIdHex = topics[1].substring(2)
    const userIdInt = parseInt(userIdHex, 16)
    console.log('User ID (Integer):', userIdInt)

    res.redirect(`/user?userId=${userIdInt}`)
  } catch (error) {
    console.error('Error processing transaction receipt:', error)
    res.status(500).send('Error processing transaction receipt')
  }
})

app.get('/user', (req, res) => {
  res.render('listings/user.ejs', { contractABI })
})

app.get('/govtauth', (req, res) => {
  res.render('listings/govtauthdetails.ejs', { contractABI })
})

app.get('/govt', (req, res) => {
  res.render('listings/verifybygovt.ejs', { contractABI, contractABI2 })
})

app.get('/landowned', (req, res) => {
  res.render('listings/showpropowner.ejs', { contractABI })
})

app.get('/land', (req, res) => {
  res.render('listings/showpropuser.ejs', { contractABI })
})

app.get('/tokendetails', (req, res) => {
  res.render('listings/tokenURIdetails.ejs', { contractABI })
})

app.post('/setTokenURI', upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const filePath = file.path
  try {
    const formData = new FormData()
    formData.append('file', fs.createReadStream(filePath))
    const pinataMetadata = JSON.stringify({
      name: file.originalname,
    })
    formData.append('pinataMetadata', pinataMetadata)

    const pinataOptions = JSON.stringify({
      cidVersion: 1, // Use CID version 1
    })
    formData.append('pinataOptions', pinataOptions)

    const pinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxContentLength: Infinity, // Set maxContentLength instead of maxBodyLength
        headers: {
          Authorization: `Bearer ${JWT}`, // Use JWT for authorization
          ...formData.getHeaders(),
        },
      }
    )

    const ipfsHash = pinataResponse.data.IpfsHash
    console.log(pinataResponse)
    const pinataLink = `ipfs://${ipfsHash}`
    fs.unlinkSync(filePath)
    const jsonContent = JSON.stringify({
      name: req.body.name + "'s Land Token",
      description: req.body.description,
      image: pinataLink,
      price: req.body.price,
    })
    const jsonFilePath = path.join(uploadsDir, `${req.body.sname}.json`)
    fs.writeFileSync(jsonFilePath, jsonContent)
    const jsonFormData = new FormData()
    jsonFormData.append('file', fs.createReadStream(jsonFilePath))

    const jsonPinataMetadata = JSON.stringify({
      name: 'metadata.json', // JSON file metadata
    })
    jsonFormData.append('pinataMetadata', jsonPinataMetadata)

    const jsonPinataOptions = JSON.stringify({
      cidVersion: 1, // Use CID version 1
    })
    jsonFormData.append('pinataOptions', jsonPinataOptions)

    const jsonPinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      jsonFormData,
      {
        maxContentLength: Infinity, // Set maxContentLength instead of maxBodyLength
        headers: {
          Authorization: `Bearer ${JWT}`, // Use JWT for authorization
          ...jsonFormData.getHeaders(),
        },
      }
    )

    // Clean up the JSON file
    fs.unlinkSync(jsonFilePath)

    // Return the hash of the uploaded JSON file
    const jsonPinataLink = `https://gateway.pinata.cloud/ipfs/${jsonPinataResponse.data.IpfsHash}`
    res.json({ jsonPinataLink })
  } catch (error) {
    console.error('Error uploading to Pinata:', error)
    res.status(500).json({ error: 'Error uploading to Pinata' })
  }
})

app.post('/gotownerdetails', ensureWalletAddress, async (req, res) => {
  try {
    const { unitarea, landaddress, landprice, propertyid, documentno } =
      req.body
    const contract = new ethers.Contract(contractAddress, contractABI, signer)
    const tx = await contract.addLand(
      unitarea,
      landaddress,
      landprice,
      propertyid,
      documentno
    )
    await tx.wait()
    console.log('Transaction done')
    res.redirect('/owner')
  } catch (error) {
    console.error('Error adding land:', error)
    res.status(500).send('Failed to add land.')
  }
})
