import { constants, providers, utils, type BigNumberish } from 'ethers';
import typia, { type IValidation } from 'typia';
import {
  ColonyRpcEndpoint,
  ColonyNetwork,
  ColonyRole,
  toEth,
} from '@colony/sdk';
import { ERC20TokenFactory } from '@colony/tokens';

import { formatUnits } from 'ethers/lib/utils.js';
import { openai } from './openai.js';
import { createPendingTx, type TxResult } from './tx.js';

const { CLOONEY_URL } = process.env;

if (!CLOONEY_URL) {
  throw new Error('Need CLOONEY_URL');
}

const { isAddress, parseUnits } = utils;

const provider = new providers.JsonRpcProvider(ColonyRpcEndpoint.Gnosis);
const colonyNetwork = new ColonyNetwork(provider);

const FN_SCHEMAS = [
  {
    name: 'getRoles',
    description: 'Get the roles of a user within a certain team of a Colony',
    parameters: {
      type: 'object',
      properties: {
        colonyAddress: {
          type: 'string',
          description: 'The address of the Colony to check the roles in',
        },
        walletAddress: {
          type: 'string',
          description: 'The wallet address of the user to get the roles of',
        },
        teamId: {
          type: 'number',
          description:
            'The id of the team in which the roles should be checked',
        },
      },
      required: ['colonyAddress', 'walletAddress'],
    },
  },
  {
    name: 'getReputation',
    description:
      'Get the reputation of a user within a certain team in a Colony',
    parameters: {
      type: 'object',
      properties: {
        colonyAddress: {
          type: 'string',
          description: 'The address of the Colony to check the roles in',
        },
        walletAddress: {
          type: 'string',
          description:
            'The wallet address of the user to get the reputation of',
        },
        teamId: {
          type: 'number',
          description:
            'The id of the team in which the reputation should be checked',
        },
      },
      required: ['colonyAddress', 'walletAddress'],
    },
  },
  {
    name: 'getBalance',
    description: 'Get token balance of a certain token team in a Colony',
    parameters: {
      type: 'object',
      properties: {
        colonyAddress: {
          type: 'string',
          description: 'The address of the Colony to check the roles in',
        },
        tokenAddress: {
          type: 'string',
          description: `The token address of the token whose balance needs to be checked`,
        },
        teamId: {
          type: 'number',
          description:
            'The team in the Colony whose balance needs to be checked',
        },
      },
      required: ['colonyAddress'],
    },
  },
  {
    name: 'pay',
    description: `Pay a person or address using tokens that are in the Colony's treasury`,
    parameters: {
      type: 'object',
      properties: {
        colonyAddress: {
          type: 'string',
          description: 'The address of the Colony to pay the person from',
        },
        recipient: {
          type: 'string',
          description: `The address of the person who receives the tokens`,
        },
        amount: {
          type: 'string',
          description: 'The amount of tokens to send',
        },
        tokenAddress: {
          type: 'string',
          description: `The token address of the token which will be sent`,
        },
        teamId: {
          type: 'number',
          description: 'The team within the Colony to send the tokens from',
        },
      },
      required: ['colonyAddress', 'recipient', 'amount'],
    },
  },
];

enum SchemaKind {
  Fn = 'FunctionCall',
  Tx = 'Transaction',
}

interface FnSchema {
  kind: SchemaKind.Fn;
  call: (args: any) => Promise<string>;
}

interface TxSchema {
  kind: SchemaKind.Tx;
  createTx: (args: any) => Promise<TxResult>;
}

type SchemaEntry = FnSchema | TxSchema;

const getTargetAddress = async (usernameOrAddress: string) => {
  if (!isAddress(usernameOrAddress)) {
    const address = await colonyNetwork.getUserAddress(usernameOrAddress);
    if (!address) {
      throw new Error(`No address found for ${usernameOrAddress}`);
    }
    return address;
  }
  return usernameOrAddress;
};

const handleValidated = (validated: IValidation) => {
  if (!validated.success) {
    const errs = validated.errors
      .map(
        ({ path, expected, value }) =>
          `In ${path}: expected ${expected}, got ${value}`,
      )
      .join('\n');
    throw new Error(
      `Your input seems to be invalid. I found the following errors:\n${errs}`,
    );
  }
};

const SCHEMA_MAP: Record<string, SchemaEntry> = {
  getBalance: {
    kind: SchemaKind.Fn,
    async call(args: {
      colonyAddress: string;
      tokenAddress?: string;
      teamId?: BigNumberish;
    }) {
      const validated = typia.validate(args);
      handleValidated(validated);
      const { colonyAddress, tokenAddress, teamId } = args;
      const colony = await colonyNetwork.getColony(colonyAddress);
      const balance = await colony.getBalance(tokenAddress, teamId);
      const token = tokenAddress
        ? ERC20TokenFactory.connect(tokenAddress, provider)
        : colony.token;
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      return `There's a balance of ${symbol} ${formatUnits(
        balance,
        decimals,
      )} in Colony ${colonyAddress}`;
    },
  },
  getRoles: {
    kind: SchemaKind.Fn,
    async call(args: {
      colonyAddress: string;
      walletAddress: string;
      teamId?: BigNumberish;
    }) {
      const validated = typia.validate(args);
      handleValidated(validated);
      const { colonyAddress, walletAddress, teamId } = args;
      const colony = await colonyNetwork.getColony(colonyAddress);
      const targetAddress = await getTargetAddress(walletAddress);
      const roles = await colony.getRoles(targetAddress, teamId);
      if (!roles.length) {
        return `The user ${targetAddress} does not have any roles in team ${
          teamId || 'root'
        } of the Colony ${colonyAddress}.`;
      }
      return `The roles of the user with address ${targetAddress} in team ${
        teamId || 'root'
      } of the Colony ${colonyAddress} are ${roles
        .map((role) => ColonyRole[role])
        .join(', ')}`;
    },
  },
  getReputation: {
    kind: SchemaKind.Fn,
    async call(args: {
      colonyAddress: string;
      walletAddress: string;
      teamId?: BigNumberish;
    }) {
      const validated = typia.validate(args);
      handleValidated(validated);
      const { colonyAddress, walletAddress, teamId } = args;
      const colony = await colonyNetwork.getColony(colonyAddress);
      const targetAddress = await getTargetAddress(walletAddress);
      const rep = await colony.getReputation(targetAddress, teamId);
      return `The reputation of ${walletAddress} in team ${
        teamId || 'root'
      } of the Colony ${colonyAddress} is ${rep * 100}%`;
    },
  },
  pay: {
    kind: SchemaKind.Tx,
    async createTx(args: {
      colonyAddress: string;
      recipient: string;
      amount: string;
      teamId?: BigNumberish;
      tokenAddress?: string;
    }) {
      const validated = typia.validate(args);
      handleValidated(validated);
      const { colonyAddress, recipient, amount, teamId, tokenAddress } = args;
      const colony = await colonyNetwork.getColony(colonyAddress);
      if (!colony.ext.oneTx) {
        throw new Error(
          `One Transaction Payment Extension is not installed in Colony ${colonyAddress}`,
        );
      }
      const targetAddress = await getTargetAddress(recipient);
      const token = tokenAddress
        ? ERC20TokenFactory.connect(tokenAddress, provider)
        : colony.token;
      const symbol = await token.symbol();
      const decimals = await token.decimals();

      const encoded = await colony.ext.oneTx
        .pay(targetAddress, parseUnits(amount, decimals), teamId, tokenAddress)
        .tx()
        .encode();
      // eslint-disable-next-line max-len
      const readable = `Send ${symbol} ${amount} to address ${recipient} within team ${
        teamId || 'root'
      } in Colony ${colonyAddress}`;

      return {
        encoded,
        readable,
      };
    },
  },
};

export const execute = async (cmd: string) => {
  const chatCompletion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo-0613',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant with knowledge about the Colony DAO ecosystem. You know that the root team id of a Colony is 1. The address of the Metacolony is 0xCFD3aa1EbC6119D80Ed47955a87A9d9C281A97B3. You know the following token addresses: DAI: 0x44fA8E6f47987339850636F88629646662444217, Colony (or CLNY) token: 0xc9B6218AffE8Aba68a13899Cbf7cF7f14DDd304C, xDAI: ${constants.AddressZero}`,
      },
      {
        role: 'user',
        content: cmd,
      },
    ],
    functions: FN_SCHEMAS,
  });
  if (chatCompletion?.data?.choices[0]?.message?.function_call) {
    const { name: fn, arguments: args } =
      chatCompletion.data.choices[0].message.function_call;
    if (!fn || !args) {
      throw new Error('Could not get fn or args');
    }
    const parsedArgs = JSON.parse(args);
    const schema = SCHEMA_MAP[fn as keyof typeof SCHEMA_MAP];
    if (!schema) {
      throw new Error(`No schema definition found for ${fn}`);
    }

    if (schema.kind === SchemaKind.Fn) {
      return schema.call(parsedArgs);
    }

    if (schema.kind === SchemaKind.Tx) {
      try {
        const result = await schema.createTx(parsedArgs);
        return result;
        // const sessionId = await createPendingTx(result);
        // return `Transaction successfully encoded. Please go to this page to sign and send off the transaction: ${CLOONEY_URL}/${sessionId}`;
      } catch (e) {
        // eslint-disable-next-line max-len
        return `**There was an error during the creation of the transaction**:\n${
          (e as Error).message
        }`;
      }
    }
  }
  if (chatCompletion?.data?.choices[0]?.message?.content) {
    const { content } = chatCompletion.data.choices[0].message;
    return content;
  }
  throw new Error('Did not get a valid API response');
};
