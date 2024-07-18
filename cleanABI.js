const fs = require('fs')
const path = require('path')

// Assuming 'LandRegistry.json' contains your ABI
const abiPath = path.resolve(__dirname, 'public', 'LandRegistry.json')

try {
  // Read ABI file
  const abiJSON = fs.readFileSync(abiPath, 'utf8')

  console.log('Read ABI JSON:', abiJSON) // Debugging output

  // Parse JSON into an array
  let abi = JSON.parse(abiJSON).abi

  if (!Array.isArray(abi)) {
    throw new Error('ABI is not an array')
  }

  // Clean the ABI by filtering out error entries
  const cleanAbi = abi.filter((fragment) => fragment.type !== 'error')

  // Optionally, write the cleaned ABI back to a file
  const cleanedAbiPath = path.resolve(
    __dirname,
    'public',
    'cleanedLandRegistry.json'
  )
  fs.writeFileSync(cleanedAbiPath, JSON.stringify(cleanAbi, null, 2))

  console.log('ABI cleaned and saved to cleanedLandRegistry.json')
} catch (error) {
  console.error('Error cleaning ABI:', error.message)
}
