# clooney

Hangs out in our [Discord](https://discord.gg/feVZWwysqM) to answer your questions.

## Why?

Our [docs](https://docs.colony.io) and [white paper](https://colony.io/whitepaper.pdf) are extensive reads and maybe you can't find the information you're looking for fast or easily enough. **clooney** can help here. They read all of our documentation, including the white paper and will try to answer your question based on that knowledge in a brief and concise way.

## How?

**clooney** works by ingesting markdown files into a vector database (we are using [Weaviate](https://weaviate.io/) for this at the moment). See the [importer.ts](https://github.com/JoinColony/clooney/blob/main/src/importer.ts) file for how the program works. When you ask a question it generates a vector from your input and compares it to the data that's currently in the database (see [ask.ts](https://github.com/JoinColony/clooney/blob/main/src/ask.ts)). As soon it found a few documents it sorts them by relevance and concatenates all the content. That is then fed into a request to OpenAIs GPT-3.5-turbo API (see [openai.ts](https://github.com/JoinColony/clooney/blob/main/src/openai.ts)). The answer is then posted publicly in the Discord channel the bot was asked in.

## Running and building

To run the bot for development, run

```bash
npm run start
```

To build their JavaScript files, run

```bash
npm run build
```

## Contribute

Did you find a bug? Do you think we can improve? Feel free to open issues and/or PRs. We appreciate any kind of contribution!

## Code of Conduct

See [Code of Conduct](CODE_OF_CONDUCT.md).

## License

GNU General Public License v3.0
