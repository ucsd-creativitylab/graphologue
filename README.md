# Graphologue

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Development

```bash
# client
npm run start:netlify

# python server
npm run start:server
```

## External APIs

- OpenAI API for GPT-3, and (soon) Chat GPT. Key (`REACT_APP_OPENAI_API_KEY`) is stored in Netlify and the `.env` file locally.
- Semantic Scholar API for research papers. Key (`REACT_APP_SEMANTIC_SCHOLAR_API_KEY`) is stored in Netlify and the `.env` file locally.
- SpaCy tokenization, self-hosted through Heroku (`wss://graphologue.herokuapp.com/`).
- WikiBase through `wikibase-sdk` package.
