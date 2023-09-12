# <img src="./public/logo512.png" width="48" style="vertical-align: middle;"></img>raphologue

Graphologue transforms Large Language Model (LLM, such as GPT-4) responses into interactive diagrams in real-time with _Inline Annotation_. Please refer to our [full paper](https://doi.org/10.1145/3586183.3606737) and [website](https://creativity.ucsd.edu) for more information.

![](./media/teaser.png)

[**Live Demo**](https://graphologue.app/) (An OpenAI API key is needed.)

## Development

Install all the dependencies.

```bash
npm install
```

Start the local server.

```bash
npm start
```

## External APIs

- OpenAI API for GPT-4. Key (`REACT_APP_OPENAI_API_KEY`) is stored in Netlify and the `.env` file locally.
- Semantic Scholar API for research papers. Key (`REACT_APP_SEMANTIC_SCHOLAR_API_KEY`) is stored in Netlify and the `.env` file locally. Access through Netlify Functions. (deprecated)
- SpaCy tokenization, self-hosted through Heroku (`wss://graphologue.herokuapp.com/`). (deprecated)
- WikiBase through `wikibase-sdk` package. (deprecated)
