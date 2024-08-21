import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import { createDebugLogger, createPXEClient, waitForPXE, } from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { TokenBridgeContract } from './artifacts/TokenBridge.js';
import { format } from 'util';

const { PXE_URL = 'http://localhost:8080' } = process.env;

async function main() {
    const logger = createDebugLogger('token');
    const pxe = createPXEClient(PXE_URL);
    await waitForPXE(pxe, logger);
    const nodeInfo = await pxe.getNodeInfo();
    logger.info(format('Aztec Sandbox Info ', nodeInfo));
    const accounts = await getDeployedTestAccountsWallets(pxe);
    const adminWallet = accounts[0];
    const admin = adminWallet.getAddress();
    logger.info(`Deploying token contract...`);
    const tokenContract = await TokenContract.deploy(adminWallet, admin, 'FATHOM', 'FTH', 18).send().deployed();
    logger.info(`Token Contract successfully deployed at address ${tokenContract.address.toShortString()}`);
    const bridgeContract = await TokenBridgeContract.deploy(adminWallet, tokenContract.address).send().deployed();
    logger.info(`Token Bridge Contract successfully deployed at address ${bridgeContract.address.toShortString()}`);
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDekUsT0FBTyxFQU9MLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsVUFBVSxHQUNYLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLDRCQUE0QixDQUFBO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFOUIsTUFBTSxFQUFFLE9BQU8sR0FBRyx1QkFBdUIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFFMUQsS0FBSyxVQUFVLElBQUk7SUFFbkIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFMUMsTUFBTSxHQUFHLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXJDLE1BQU0sVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU5QixNQUFNLFFBQVEsR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUV6QyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRXJELE1BQU0sUUFBUSxHQUFHLE1BQU0sOEJBQThCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFM0QsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWhDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUV2QyxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFM0MsZ0VBQWdFO0lBQ2hFLE1BQU0sYUFBYSxHQUFHLE1BQU0sYUFBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFFNUcsTUFBTSxDQUFDLElBQUksQ0FBQyxtREFBbUQsYUFBYSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFeEcsTUFBTSxjQUFjLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUU3RyxNQUFNLENBQUMsSUFBSSxDQUFDLDBEQUEwRCxjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVoSCxDQUFDO0FBSUQsSUFBSSxFQUFFLENBQUMifQ==