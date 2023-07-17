import { providers, type BigNumberish } from 'ethers';
import { ColonyNetwork } from '@colony/sdk';

const sendButton = document.querySelector('#button-send') as HTMLButtonElement;
const argsButton = document.querySelector('#button-args') as HTMLButtonElement;
const fnText = document.querySelector('#text-fn') as HTMLHeadingElement;
const argsText = document.querySelector('#text-args') as HTMLPreElement;
const errorText = document.querySelector('#text-error') as HTMLParagraphElement;
const successText = document.querySelector(
  '#text-success',
) as HTMLParagraphElement;
const dataTemplate = document.querySelector(
  '#data-encoded',
) as HTMLTemplateElement;

interface PayArgs {
  colonyAddress: string;
  recipient: string;
  amount: string;
  teamId?: BigNumberish;
  tokenAddress?: string;
}

const SCHEMA_MAP = {
  async pay(colonyNetwork: ColonyNetwork, args: PayArgs) {
    const { colonyAddress, recipient, amount, teamId, tokenAddress } = args;
    const colony = await colonyNetwork.getColony(colonyAddress);
    if (!colony.ext.oneTx) {
      throw new Error(
        `One Transaction Payment Extension is not installed in Colony ${colonyAddress}`,
      );
    }
    const [{ hash }] = await colony.ext.oneTx
      .pay(recipient, amount, teamId, tokenAddress)
      .metaTx()
      .send();

    return hash;
  },
};

argsButton.addEventListener('click', () => {
  if (argsButton.dataset.state === 'hidden') {
    argsButton.dataset.state = 'shown';
    argsButton.innerText = '▲ Hide all arguments';
    argsText.style.display = 'block';
  } else {
    argsButton.dataset.state = 'hidden';
    argsButton.innerText = '▼ Show all arguments';
    argsText.style.display = 'none';
  }
});

sendButton.addEventListener('click', async () => {
  sendButton.disabled = true;

  // If MetaMask is installed there will be an `ethereum` object on the `window`
  const provider = new providers.Web3Provider((window as any).ethereum);

  // This will try to connect the page to MetaMask
  await provider.send('eth_requestAccounts', []);

  const signer = provider.getSigner();
  const colonyNetwork = new ColonyNetwork(signer);

  try {
    const data = JSON.parse(dataTemplate.innerHTML);
    const fn = fnText.innerText as keyof typeof SCHEMA_MAP;
    if (!SCHEMA_MAP[fn]) {
      throw new Error(`Could not find ${fn} function schema`);
    }
    const hash = await SCHEMA_MAP[fn](colonyNetwork, data);

    await fetch(window.location.href, {
      method: 'DELETE',
    });

    successText.innerText = `Transaction ${hash} created! You can close this window now`;
    successText.style.visibility = 'visible';
  } catch (e) {
    errorText.innerText = `I'm sorry, this didn't work. We got an error: ${
      (e as Error).message
    }`;
    errorText.style.visibility = 'visible';
    sendButton.disabled = false;
  }
});
