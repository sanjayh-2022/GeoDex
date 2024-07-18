// // Import Gun.js and CryptoJS
const Gun = require('gun')
const CryptoJS = require('crypto-js')

const gun = Gun(['http://localhost:8765/gun'])

// // Initialize Gun with a local instance
// const gun = Gun()

// // Function to generate SHA-256 hash from user data
// function generateHash(userData) {
//   // Convert userData to a string for hashing
//   const userDataString = JSON.stringify(userData)

//   // Generate SHA-256 hash
//   const hash = CryptoJS.SHA256(userDataString).toString(CryptoJS.enc.Hex)
//   return hash
// }

// // Example function to store user details and return the generated hash
// function storeUserDetails(userData) {
//   // Generate SHA-256 hash from user data
//   const hash = generateHash(userData)

//   // Store user data using the generated hash as key
//   gun.get('user_details').get(hash).put(userData)

//   // Return the generated hash
//   return hash
// }

// // Example function to retrieve user details using a given hash
// function retrieveUserDetails() {
//   // Retrieve user data using the provided hash
//   return new Promise((resolve, reject) => {
//     gun
//       .get('user_details')
//       .get('a591a121138d4bd0b1d3e2a36c2e964901e3abf1990388b958b3783ee6a0fcc1')
//       .once((data) => {
//         if (data) {
//           resolve(data)
//         } else {
//           reject(new Error('User data not found'))
//         }
//       })
//   })
// }

// // Example usage:
// const userData = {
//   name: 'John Doe',
//   aadharNo: '1234-5678-9012',
//   panNo: 'ABCDE1234F',
//   phoneNumber: '1234567890',
//   email: 'john.doe@example.com',
// }

// // // Store user details and get the generated hash
// // const hash = storeUserDetails(userData)
// // console.log('Generated Hash:', hash)

// // Retrieve user details using the generated hash
// retrieveUserDetails()
//   .then((data) => {
//     console.log('Retrieved User Details:', data.aadharNo, data.panNo)
//   })
//   .catch((error) => {
//     console.error('Error retrieving user details:', error)
//   })

// retrieveData.js

function retrieveUserDetails(hash) {
  // Retrieve user data using the provided hash
  gun
    .get('users')
    .get(hash)
    .once((data) => {
      console.log('Retrieved User Details:', data)
    })
}
const landTokenURIs = {
  tokenURI:
    'https://gateway.pinata.cloud/ipfs/bafybeiec2sidi74ri7nzttl2az3fpf3grgzpocmmq34ng64ueez5oajkpy',
}
gun
  .get('userTokenURIs')
  .get('b621f39660261730aa779625bd632fbe25a069f7f14a3486014d18dd3ddcd982')
  .put(landTokenURIs, (ack) => {
    if (ack.err) {
      console.error('Error storing data:', ack.err)
    } else {
      console.log('Data stored successfully')
    }
  })

gun
  .get('userDetails')
  .get('b621f39660261730aa779625bd632fbe25a069f7f14a3486014d18dd3ddcd982')
  .once((data) => {
    if (data) {
      const { tokenURI } = data
      console.log('Token URI', tokenURI, data)
    } else {
      console.log('No user details found for the given hash.')
    }
  })

// Example usage: Replace '<generated_hash>' with the actual hash generated from addData.js
const hashToRetrieve =
  '74ba4a961da3fcaa241506138dc5d38ba41eeebc398f4e8e1c443e645adc9aa8' // Replace with actual hash
retrieveUserDetails(hashToRetrieve)
