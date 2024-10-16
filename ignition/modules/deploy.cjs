const { run } = require("hardhat");

async function main() {
    const { token, bridge } = await run("deploy:your_module_name"); // Replace with your actual module name

    console.log(`Token deployed at: ${token.address}`);
    console.log(`Bridge deployed at: ${bridge.address}`);

    // Code to update .env...
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
