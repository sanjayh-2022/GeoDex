const express = require('express')
const fs = require('fs')
const nodemailer = require('nodemailer')
const path = require('path')
const ethers = require('ethers')
const ejsmate = require('ejs-mate')
const methodOverride = require('method-override')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const port = 8080

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
const contractAddress = process.env.CONTRACT_ADDRESS

const provider = new ethers.providers.JsonRpcProvider(
  `https://eth-sepolia.g.alchemy.com/v2/${process.env.API_KEY}`
)

let walletAddress = null
let signer = null

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

app.get('/dummy', (req, res) => {
  res.render('listings/dummy.ejs', { contractABI })
})

app.post('/connect-wallet', async (req, res) => {
  try {
    const { walletAddress: address } = req.body
    walletAddress = address
    signer = provider.getSigner(walletAddress)
    provider
      .getBlockNumber()
      .then((blockNumber) =>
        console.log(`Current block number: ${blockNumber}`)
      )
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

app.get('/', async (req, res) => {
  res.render('listings/index.ejs')
})

app.get('/registerLand', (req, res) => {
  res.render('listings/landregister.ejs', { contractABI })
})

app.post('/sendLandId', (req, res) => {
  const { landId, name, email, phoneNumber } = req.body

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    auth: {
      user: 'landchain.gov@gmail.com',
      pass: 'yniu ubrs nlol aolv',
    },
    tls: { rejectUnauthorized: false },
  })

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
  res.render('listings/user.ejs', { userId: '1', contractABI })
})

app.get('/govtauth', (req, res) => {
  res.render('listings/govtauthdetails.ejs', { contractABI })
})

app.post('/registerGovtAuth', async (req, res) => {
  try {
    const txReceipt = req.body.txReceipt
    console.log('Transaction Receipt:', txReceipt)

    res.redirect(`/govt`)
  } catch (error) {
    console.error('Error processing transaction receipt:', error)
    res.status(500).send('Error processing transaction receipt')
  }
})

app.get('/govt', (req, res) => {
  res.render('listings/verifybygovt.ejs', { contractABI })
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

app.get('/owner', ensureWalletAddress, async (req, res) => {
  try {
    const landDetailsArray = []
    const receivedRequests = []
    const landSaleArray = []
    const contract = new ethers.Contract(contractAddress, contractABI, signer)

    const landIds = await contract.ReturnAllLandList()
    for (let i = 0; i < landIds.length; i++) {
      const landId = landIds[i]
      const landDetails = await contract.lands(landId)
      const id = landDetails.id.toNumber()
      const area = landDetails.area.toNumber()
      const landPrice = landDetails.landPrice.toNumber()
      const landObject = {
        id,
        area,
        landAddress: landDetails.landAddress,
        landPrice,
      }
      if (landDetails.isforSell) {
        landSaleArray.push(landObject)
      }
      landDetailsArray.push(landObject)
    }

    const receivedRequestIds = await contract.myReceivedLandRequests()
    for (let i = 0; i < receivedRequestIds.length; i++) {
      const requestId = receivedRequestIds[i]
      const request = await contract.LandRequestMapping(requestId)
      const landDetails = await contract.lands(request.landId)
      const id = requestId.toNumber()
      const landId = request.landId.toNumber()
      const landPrice = landDetails.landPrice.toNumber()

      receivedRequests.push({
        requestId: id,
        landId: landId,
        landAddress: landDetails.landAddress,
        landPrice,
        buyerId: request.buyerId,
      })
    }

    res.render('listings/owner.ejs', {
      landDetailsArray,
      landSaleArray,
      receivedRequests,
    })
  } catch (error) {
    console.error('Error fetching owner details:', error)
    res.status(500).send('Failed to fetch owner details.')
  }
})

app.post('/gotuserdetails', ensureWalletAddress, async (req, res) => {
  try {
    const { username, age, city, aadharno, panno, emailid } = req.body
    const contract = new ethers.Contract(contractAddress, contractABI, signer)
    const tx = await contract.registerUser(
      username,
      age,
      city,
      aadharno,
      panno,
      emailid,
      {
        gasLimit: 3000000,
        gasPrice: ethers.utils.parseUnits('100', 'gwei'),
      }
    )
    await tx.wait()
    res.redirect('/registeredUsers')
  } catch (error) {
    console.error('Error registering user:', error)
    res.status(500).send('Failed to register user.')
  }
})

app.get('/registeredUsers', ensureWalletAddress, async (req, res) => {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, signer)
    const userDetails = await contract.UserMapping(walletAddress)
    if (!userDetails.id) {
      return res.status(404).send('User not found')
    }

    const userObject = {
      id: userDetails.id,
      name: userDetails.name,
      age: userDetails.age.toNumber(),
      city: userDetails.city,
      aadharNumber: userDetails.aadharNumber,
      panNumber: userDetails.panNumber,
      email: userDetails.email,
    }

    const landDetailsArray = []
    const landIds = await contract.ReturnAllLandList()
    for (let i = 0; i < landIds.length; i++) {
      const landId = landIds[i]
      const landDetails = await contract.lands(landId)
      const id = landDetails.id.toNumber()
      const area = landDetails.area.toNumber()
      const landPrice = landDetails.landPrice.toNumber()
      const landObject = {
        id,
        area,
        landAddress: landDetails.landAddress,
        landPrice,
      }
      landDetailsArray.push(landObject)
    }

    res.render('listings/buyer.ejs', {
      landDetailsArray,
      userObject,
    })
  } catch (error) {
    console.error('Error fetching registered users:', error)
    res.status(500).send('Failed to fetch registered users.')
  }
})

app.post('/gotgovtauth', ensureWalletAddress, async (req, res) => {
  try {
    const { username, age, designation, city } = req.body
    const contract = new ethers.Contract(contractAddress, contractABI, signer)
    const tx = await contract.addGovtAuthority(
      walletAddress,
      username,
      age,
      designation,
      city
    )
    await tx.wait()
    res.render('listings/index.ejs')
  } catch (error) {
    console.error('Error registering government authority:', error)
    res.status(500).json({ error: 'Error registering government authority' })
  }
})
