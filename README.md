# <img src="./public/logo512.png" width="48" style="vertical-align: middle;"></img>raphologue

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Development

```bash
# client
# npm run start:netlify
npm start

# python server
npm run start:server
```

## External APIs

- OpenAI API for GPT-4. Key (`REACT_APP_OPENAI_API_KEY`) is stored in Netlify and the `.env` file locally.
- Semantic Scholar API for research papers. Key (`REACT_APP_SEMANTIC_SCHOLAR_API_KEY`) is stored in Netlify and the `.env` file locally. Access through Netlify Functions. (deprecated)
- SpaCy tokenization, self-hosted through Heroku (`wss://graphologue.herokuapp.com/`). (deprecated)
- WikiBase through `wikibase-sdk` package. (deprecated)
