// // Import Gun.js and CryptoJS
const Gun = require('gun')
const CryptoJS = require('crypto-js')

const gun = Gun(['https://your-vercel-deployment-url.vercel.app/api/gun']);



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
