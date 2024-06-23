const express = require('express')
const app = express()
const path = require('path')
const ethers = require('ethers')
const { abi } = require('./public/Land.json')
const port = 8080
const ejsmate = require('ejs-mate')
const methodoverride = require('method-override')
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.engine('ejs', ejsmate)
app.use(methodoverride('_method'))

const rpcUrl = 'http://127.0.0.1:8545/'
const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
const gasPrice = ethers.utils.parseUnits('100', 'gwei')

const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const contract = new ethers.Contract(contractAddress, abi, provider)
const privateKey =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

let walletAddress = null

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

app.post('/connect-wallet', async (req, res) => {
  try {
    const { walletAddress: address, type: type } = req.body
    walletAddress = address
    if (type == 'buyer') res.redirect('/userdetails')
    if (type == 'owner') res.redirect('/ownerdetails')
    if (type == 'govt') res.redirect('/govtauth')
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
app.get('/ownerdetails', (req, res) => {
  res.render('listings/ownerdetails.ejs')
})
app.get('/userdetails', ensureWalletAddress, async (req, res) => {
  res.render('listings/userdetails.ejs')
})
app.get('/govtauth', (req, res) => {
  res.render('listings/govtauthdetails.ejs')
})
app.post('/gotownerdetails', async (req, res) => {
  const wallet = new ethers.Wallet(privateKey, provider)
  const signer = wallet.connect(provider)
  const contractWithSigner = contract.connect(signer)

  let ownerdetails = req.body
  console.log(
    ownerdetails.unitarea,
    ownerdetails.landaddress,
    ownerdetails.landprice,
    ownerdetails.propertyid,
    ownerdetails.documentno
  )
  const transaction = await contractWithSigner.addLand(
    ownerdetails.unitarea,
    ownerdetails.landaddress,
    ownerdetails.landprice,
    ownerdetails.propertyid,
    ownerdetails.documentno
  )
  await transaction.wait()
  console.log('Transaction done')
  res.redirect('/owner')
})

app.get('/owner', async (req, res) => {
  const landDetailsArray = []
  const receivedRequests = []
  const landSaleArray = []
  const landIds = await contract.ReturnAllLandList()
  for (let i = 0; i < landIds.length; i++) {
    const landId = landIds[i]
    const landDetails = await contract.lands(landId)

    const id = landDetails.id.toNumber()
    const area = landDetails.area.toNumber()
    const landPrice = landDetails.landPrice.toNumber()
    const landObject = {
      id: id,
      area: area,
      landAddress: landDetails.landAddress,
      landPrice: landPrice,
    }

    if (landDetails.isforSell) {
      landSaleArray.push(landObject)
    }
    landDetailsArray.push(landObject)
  }
  try {
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
        landPrice: landPrice,
        buyerId: request.buyerId,
      })
    }
  } catch (error) {
    console.error('Error fetching buy requests:', error.message)
    res.send('Error fetching buy requests')
  }
  res.render('listings/owner.ejs', {
    landDetailsArray,
    landSaleArray,
    receivedRequests,
  })
})
app.post('/gotuserdetails', ensureWalletAddress, async (req, res) => {
  try {
    const {
      username: username,
      age: age,
      city: city,
      aadharno: aadharno,
      panno: panno,
      emailid: emailid,
    } = req.body

    const wallet = new ethers.Wallet(privateKey, provider)
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)
    console.log(username, age, city, aadharno, panno, emailid)
    const transaction = await contractWithSigner.registerUser(
      username,
      age,
      city,
      aadharno,
      panno,
      emailid,
      {
        gasLimit: 3000000,
        gasPrice,
      }
    )
    await transaction.wait()
    res.redirect('/registeredUsers')
  } catch (error) {
    console.error(error)
  }
})

app.get('/registeredUsers', async (req, res) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider)
    const landDetailsArray = []
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)
    const userDetails = await contractWithSigner.UserMapping(walletAddress)
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

    const landIds = await contract.ReturnAllLandList()
    for (let i = 0; i < landIds.length; i++) {
      const landId = landIds[i]
      const landDetails = await contract.lands(landId)

      const id = landDetails.id.toNumber()
      const area = landDetails.area.toNumber()
      const landPrice = landDetails.landPrice.toNumber()
      const landObject = {
        id: id,
        area: area,
        landAddress: landDetails.landAddress,
        landPrice: landPrice,
      }
      landDetailsArray.push(landObject)
    }

    res.render('listings/buyer.ejs', {
      landDetailsArray,
      userObject,
    })
  } catch (error) {
    console.error(error)
  }
})

app.post('/gotgovtauth', ensureWalletAddress, async (req, res) => {
  try {
    const { username, age, designation, city } = req.body

    console.log(username, age, designation, city)

    const wallet = new ethers.Wallet(privateKey, provider)

    const signer = wallet.connect(provider)

    const contractWithSigner = contract.connect(signer)

    console.log(walletAddress)

    const transaction = await contractWithSigner.addGovtAuthority(
      walletAddress,
      username,
      age,
      designation,
      city
    )
    await transaction.wait()
    res.render('listings/index.ejs')
  } catch (error) {
    console.error('Error registering government authority:', error)
    res.status(500).json({ error: 'Error registering government authority' })
  }
})

app.get('/', async (req, res) => {
  res.render('listings/govtauthdetails.ejs')
})
app.get('/ownerdetails', (req, res) => {
  res.render('listings/ownerdetails.ejs')
})
app.get('/userdetails', (req, res) => {
  res.render('listings/userdetails.ejs')
})
app.post('/gotownerdetails', (req, res) => {
  let ownerdetails = req.body
  res.render('listings/owner.ejs', { ownerdetails })
})
app.post('/gotuserdetails', (req, res) => {
  let userdetails = req.body
  res.render('listings/buyer.ejs', { userdetails })
})
app.get('/owner/:id', async (req, res) => {
  let { id } = req.params
  const landDetails = []
  const land = await contract.ReturnAllLandList()
  const landId = land[id - 1]
  const idland = id
  const lands = await contract.lands(landId)
  const area = lands.area.toNumber()
  const landPrice = lands.landPrice.toNumber()
  const propertyid = lands.propertyPID.toNumber()
  const address = lands.landAddress
  const document = lands.document
  landObj = {
    idland: idland,
    area: area,
    address: address,
    landPrice: landPrice,
    propertyid: propertyid,
    document: document,
  }
  landDetails.push(landObj)
  res.render('listings/showpropowner.ejs', { landDetails })
})
app.get('/buyer/:id', async (req, res) => {
  let { id } = req.params
  const landDetails = []
  const land = await contract.ReturnAllLandList()
  const landId = land[id - 1]
  const idland = id
  const lands = await contract.lands(landId)
  const area = lands.area.toNumber()
  const landPrice = lands.landPrice.toNumber()
  const propertyid = lands.propertyPID.toNumber()
  const address = lands.landAddress
  const document = lands.document
  landObj = {
    idland: idland,
    area: area,
    address: address,
    landPrice: landPrice,
    propertyid: propertyid,
  }
  landDetails.push(landObj)
  res.render('listings/showpropuser.ejs', { landDetails })
})
app.get('/addtosale/:id', async (req, res) => {
  let { id } = req.params
  const wallet = new ethers.Wallet(privateKey, provider)
  const signer = wallet.connect(provider)
  const contractWithSigner = contract.connect(signer)
  const tx = await contractWithSigner.makeItforSell(id, {
    gasLimit: 3000000,
    gasPrice,
  })
  const receipt = await tx.wait()
  console.log('Transaction receipt:', receipt)
  res.redirect('/owner')
})

app.get('/request-for-buy/:id', async (req, res) => {
  let { id } = req.params
  console.log(id)
  const wallet = new ethers.Wallet(privateKey, provider)
  const signer = wallet.connect(provider)
  const contractWithSigner = contract.connect(signer)

  try {
    const transaction = await contractWithSigner.requestforBuy(id, {
      gasLimit: 300000,
      gasPrice,
    })
    await transaction.wait()
    res.redirect('/registeredUsers')
  } catch (error) {
    console.error('Error sending buy request:', error)
    res.send('An error occurred while sending the buy request')
  }
})

app.get('/', async (req, res) => {
  res.render('listings/index.ejs')
})
app.get('/ownerdetails', (req, res) => {
  res.render('listings/ownerdetails.ejs')
})
app.get('/userdetails', (req, res) => {
  res.render('listings/userdetails.ejs')
})
app.post('/gotownerdetails', (req, res) => {
  let ownerdetails = req.body
  res.render('listings/owner.ejs', { ownerdetails })
})
app.post('/gotuserdetails', (req, res) => {
  let userdetails = req.body
  res.render('listings/buyer.ejs', { userdetails })
})
app.get('/verifybygovt', async (req, res) => {
  const wallet = new ethers.Wallet(privateKey, provider)
  const signer = wallet.connect(provider)
  const contractWithSigner = contract.connect(signer)
  const userCount = await contract.ReturnAllUserList()
  const userAddresses = []
  const landDetailsArray = []
  for (let i = 0; i < userCount.length; i++) {
    const user = await contract.UserMapping(userCount[i])
    const isVerified = await contractWithSigner.isUserVerified(user.id)
    const userObject = {
      id: user.id,
      name: user.name,
      age: user.age.toNumber(),
      city: user.city,
      aadharNumber: user.aadharNumber,
      panNumber: user.panNumber,
      email: user.email,
    }
    if (!isVerified) {
      userAddresses.push(userObject)
    }
  }
  const landIds = await contract.ReturnAllLandList()
  for (let i = 0; i < landIds.length; i++) {
    const landId = landIds[i]
    const landDetails = await contract.lands(landId)

    const id = landDetails.id.toNumber()
    const area = landDetails.area.toNumber()
    const landPrice = landDetails.landPrice.toNumber()
    const address = landDetails.landAddress
    const propertyid = landDetails.propertyPID.toNumber()
    const document = landDetails.document
    const landObject = {
      id: id,
      area: area,
      landAddress: landDetails.landAddress,
      landPrice: landPrice,
      propertyid: propertyid,
      document: document,
    }
    const isVerified = await contractWithSigner.isLandVerified(id)
    if (!isVerified) {
      landDetailsArray.push(landObject)
    }
  }
  const allLandRequests = await contractWithSigner.ReturnAllLandList()
  const approvedRequests = []

  for (let i = 0; i < allLandRequests.length; i++) {
    const requestId = allLandRequests[i]
    const request = await contractWithSigner.LandRequestMapping(requestId)
    if (request.requestStatus === 1) {
      const landDetails = await contractWithSigner.lands(request.landId)
      const buyerDetails = await contractWithSigner.UserMapping(request.buyerId)

      const requestObject = {
        requestId: requestId.toNumber(),
        landId: request.landId.toNumber(),
        landAddress: landDetails.landAddress,
        landPrice: landDetails.landPrice.toNumber(),
        buyerId: buyerDetails.id,
        buyerName: buyerDetails.name,
        buyerEmail: buyerDetails.email,
      }

      approvedRequests.push(requestObject)
    }
  }
  res.render('listings/verifybygovt.ejs', {
    userAddresses,
    landDetailsArray,
    approvedRequests,
  })
})

app.get('/verify-buyer/:id', async (req, res) => {
  let { id } = req.params
  try {
    const wallet = new ethers.Wallet(privateKey, provider)
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)
    const transaction = await contractWithSigner.verifyUser(id, {
      gasLimit: 100000,
      gasPrice,
    })
    await transaction.wait()
    console.log('Registration approved successfully!')
    res.redirect('/verifybygovt')
  } catch (error) {
    console.error('Error approving registration:', error.message)
  }
})

app.get('/verify-land/:id', async (req, res) => {
  let { id } = req.params
  try {
    const wallet = new ethers.Wallet(privateKey, provider)
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)
    const transaction = await contractWithSigner.verifyLand(id)
    await transaction.wait()
    console.log('Registration approved successfully!')
    res.redirect('/verifybygovt')
  } catch (error) {
    console.error('Error approving registration:', error.message)
  }
})

app.get('/accept-buy-request/:requestId', async (req, res) => {
  const { requestId } = req.params
  try {
    const wallet = new ethers.Wallet(privateKey, provider)
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)
    const transaction = await contractWithSigner.acceptRequest(requestId)
    await transaction.wait()
    console.log('Buy request accepted successfully!')
    res.redirect('/owner')
  } catch (error) {
    console.error('Error accepting buy request:', error.message)
  }
})

app.get('/reject-buy-request/:requestId', async (req, res) => {
  const { requestId } = req.params
  try {
    const wallet = new ethers.Wallet(privateKey, provider)
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)
    const transaction = await contractWithSigner.rejectRequest(requestId)
    await transaction.wait()
    console.log('Buy request rejected successfully!')
    res.redirect('/owner')
  } catch (error) {
    console.error('Error rejecting buy request:', error.message)
  }
})

app.get('/make-payment/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params
    const wallet = new ethers.Wallet(privateKey, provider)
    const signer = wallet.connect(provider)
    const contractWithSigner = contract.connect(signer)

    const transaction = await contractWithSigner.makePayment(requestId, {
      value: ethers.utils.parseEther('0.1'),
    })
    await transaction.wait()
    console.log('Payment made successfully!')
    res.redirect('/registeredUsers')
  } catch (error) {
    console.error('Error making payment:', error.message)
    res.send('Error making payment')
  }
})

app.get('/process-transaction/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params
    const wallet = new ethers.Wallet(privateKey, provider)
    const contractWithSigner = contract.connect(wallet)
    console.log(requestId)
    const tx = await contractWithSigner.transferOwnership(requestId)
    await tx.wait()
    res.redirect('/verifybygovt')
  } catch (error) {
    console.error(error)
    res.send('Error in Transaction')
  }
})

app.get('/user/64', (req, res) => {
  res.render('listings/showpropuser.ejs')
})
app.get('/verifybygovt', (req, res) => {
  res.render('listings/verifybygovt.ejs')
})
app.get('/connectbuyer', (req, res) => {
  res.render('listings/connectbuyer.ejs')
})
app.get('/connectowner', (req, res) => {
  res.render('listings/connectowner.ejs')
})
app.get('/connectgovtauth', (req, res) => {
  res.render('listings/connectgovtauth.ejs')
})
