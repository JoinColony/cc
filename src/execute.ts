import { BigNumber, constants, providers } from 'ethers';
import {
  ColonyRpcEndpoint,
  ColonyNetwork,
  ColonyRole,
  toEth,
} from '@colony/sdk';

import { isAddress } from 'ethers/lib/utils.js';
import { openai } from './openai.js';

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
];

interface SchemaEntry {
  args: string[];
  format: (colonyAddress: string, args: any, result: any) => Promise<string>;
  transform?: (args: any) => Promise<any>;
}

const SCHEMA_MAP: Record<string, SchemaEntry> = {
  getRoles: {
    args: ['walletAddress', 'teamId'],
    async format(
      colonyAddress,
      { walletAddress, teamId }: { walletAddress: string; teamId: string },
      roles: ColonyRole[],
    ) {
      if (!roles.length) {
        return `The user ${walletAddress} does not have any roles in team ${
          teamId || 'root'
        } of the Colony ${colonyAddress}.`;
      }
      return `The roles of the user with address ${walletAddress} in team ${
        teamId || 'root'
      } of the Colony ${colonyAddress} are ${roles
        .map((role) => ColonyRole[role])
        .join(', ')}`;
    },
    async transform({ walletAddress, ...rest }) {
      if (!isAddress(walletAddress)) {
        const address = await colonyNetwork.getUserAddress(walletAddress);
        if (address) {
          return { walletAddress: address, ...rest };
        }
      }
      return { walletAddress, ...rest };
    },
  },
  getReputation: {
    args: ['walletAddress', 'teamId'],
    async format(
      colonyAddress,
      { walletAddress, teamId }: { walletAddress: string; teamId: string },
      rep: BigNumber,
    ) {
      return `The reputation of ${walletAddress} in team ${
        teamId || 'root'
      } of the Colony ${colonyAddress} is ${toEth(rep).toString()}`;
    },
    async transform({ walletAddress, ...rest }) {
      if (!isAddress(walletAddress)) {
        const address = await colonyNetwork.getUserAddress(walletAddress);
        if (address) {
          return { walletAddress: address, ...rest };
        }
      }
      return { walletAddress, ...rest };
    },
  },
  getBalance: {
    args: ['tokenAddress', 'teamId'],
    async format(
      colonyAddress,
      args: { tokenAddress: string; teamId: string },
      balance: BigNumber,
    ) {
      return toEth(balance).toString();
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
    let parsedArgs = JSON.parse(args);
    const schema = SCHEMA_MAP[fn as keyof typeof SCHEMA_MAP];
    if (!schema) {
      throw new Error(`No schema definition found for ${fn}`);
    }
    if (schema.transform) {
      parsedArgs = await schema.transform(parsedArgs);
    }
    const filledArgs = schema.args.map((arg) => parsedArgs[arg]);
    const { colonyAddress } = parsedArgs;
    const colony = await colonyNetwork.getColony(colonyAddress);
    const result = await (
      colony[fn as keyof typeof colony] as (...args: any[]) => any
    ).apply(colony, filledArgs);
    return schema.format(colonyAddress, parsedArgs, result);
  }
  if (chatCompletion?.data?.choices[0]?.message?.content) {
    const { content } = chatCompletion.data.choices[0].message;
    return content;
  }
  throw new Error('Did not get a valid API response');
};
