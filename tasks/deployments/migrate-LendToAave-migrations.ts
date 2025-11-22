import { task } from "hardhat/config";
import { parseUnits } from "ethers";
import {
  getLendToAaveMigrator,
  getLendToken,
  getEthersSigners,
} from "../../helpers/contracts-helpers";

task("lend-migration", "Create migration to test the contracts")
  .setAction(async (_, hre) => {
    console.log("\n- Lend Migration started");
    
    // Hardhat Runtime Environment (HRE) initialization is automatic, 
    // but we can explicitly access it via 'hre' if needed.
    
    if (!hre.network.config.chainId) {
      throw new Error("INVALID_CHAIN_ID");
    }

    // 1. Setup Accounts
    const signers = await getEthersSigners();
    const user1 = signers[2]; // Keeping original index logic
    const user2 = signers[3];

    // 2. Get Contracts
    const mockLend = await getLendToken();
    const lendToAaveMigrator = await getLendToAaveMigrator();
    const migratorAddress = await lendToAaveMigrator.getAddress(); // Ethers v6 syntax

    // 3. Calculate Amounts (Using native Ethers BigInt)
    // 1000 LEND (18 decimals)
    const lendAmountRaw = "1000";
    const lendTokenAmount = parseUnits(lendAmountRaw, 18);
    
    // 500 LEND
    const halfLendAmountRaw = "500"; 
    const halfLendTokenAmount = parseUnits(halfLendAmountRaw, 18);

    console.log(`  - Minting ${lendAmountRaw} LEND to users...`);

    // 4. Mint Tokens (Setup State)
    await (await mockLend.connect(user1).mint(lendTokenAmount)).wait();
    await (await mockLend.connect(user2).mint(lendTokenAmount)).wait();

    console.log(`  - Approving Migrator...`);

    // 5. Approve Migrator
    await (await mockLend.connect(user1).approve(migratorAddress, lendTokenAmount)).wait();
    await (await mockLend.connect(user2).approve(migratorAddress, lendTokenAmount)).wait();

    console.log(`  - Executing Migrations...`);

    // 6. Execute Migration
    // User 1 migrates in two batches
    await (await lendToAaveMigrator.connect(user1).migrateFromLEND(halfLendTokenAmount)).wait();
    await (await lendToAaveMigrator.connect(user1).migrateFromLEND(halfLendTokenAmount)).wait();
    
    // User 2 migrates all at once
    await (await lendToAaveMigrator.connect(user2).migrateFromLEND(lendTokenAmount)).wait();

    console.log(`\n- Finished migrating LEND balances successfully.`);
  });
