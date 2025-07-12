# GeoDex - Decentralized Real Estate Platform 🌍

## Overview 🏠
GeoDex is a blockchain-based real estate dApp that revolutionizes property transactions by bringing transparency, efficiency, and security to the real estate market. The traditional real estate market is often bogged down by slow, opaque, and costly processes, plagued by inefficiencies, fraud, and lack of transparency.

Our platform provides a decentralized land registry where ownership records are immutable and transparent, significantly reducing fraud risks. We leverage IPFS for decentralized document storage and GUN DB for securing sensitive user data and land details. Through the Reclaim Protocol, we implement zero-knowledge proof verification ensuring only legitimate users and authorities can interact with the platform.

The system automates property transactions through smart contracts, minting NFTs for ownership representation and enabling seamless transfers. By reducing intermediaries and automating processes, GeoDex makes real estate transactions more time and cost-efficient.

**🎥 Demo video link:** [https://youtu.be/CmqegaqZsFE](https://youtu.be/CmqegaqZsFE) <br>
**🌐 Devfolio link:** [https://devfolio.co/projects/geodex-83ef](https://devfolio.co/projects/geodex-83ef)

## Technologies Used 🛠️
- **Solidity**: Smart contract development
- **IPFS**: Decentralized file storage
- **JavaScript**: Core programming language
- **Embedded JavaScript (EJS)**: Template engine
- **ethers.js**: Ethereum wallet implementation
- **Express.js**: Backend framework
- **Hardhat**: Development environment
- **GUN DB**: Decentralized database
- **Reclaim Protocol SDK**: User verification.

## Getting Started 🚀

### Prerequisites 📋
- Node.js installed
- npm package manager
- MetaMask or similar Web3 wallet

### Installation ⚙️

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanjayh-2022/GeoDex.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd GeoDex
   ```

3. **Install dependencies:**
   ```bash
   npm i
   ```

   #### Environment Setup 🌐

4. **Create a .env file in the root directory and configure the following variables:**

    ```
    PINATA_JWT_KEY=<your_pinata_key>
    NODE_MAILER_PASS=<your_nodemailer_passkey>
    CONTRACT_ADDRESS=<your_contract_address>
    API_KEY=<your_api_key>
    MAP_TOKEN=<your_map_token>
    ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Contributing 🤝
Contributions are welcome! If you find any bugs or have suggestions for improvements, please open an issue or clone the repository and submit a pull request on GitHub.
