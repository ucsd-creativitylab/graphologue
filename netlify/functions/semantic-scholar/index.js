import fetch from 'node-fetch'

const responseWrapper = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

const taskToQuery = task => {
  return task.replace('paper/', '').replace(/ |%20/g, '+')
}

exports.handler = async (event, context) => {
  let statusCode, data

  // 'users/me/' or 'studies/' or 'projects/id/studies'
  const task = event.path.replace('/.netlify/functions/semantic-scholar/', '')

  if (task.includes('paper')) {
    // ! paper
    try {
      const response = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${taskToQuery(
          task
        )}&limit=3&sort=relevance&fields=title,abstract,authors,venue,year,url`,
        {
          method: 'GET',
          headers: {
            ...event.headers,
            host: 'api.semanticscholar.org',
            'Access-Control-Allow-Origin': '*',
          },
          redirect: 'follow',
        }
      )

      data = await response.json()
      statusCode = 200
    } catch (error) {
      console.error('ERROR', error)

      data = {
        error: error.message,
      }
      statusCode = 500
    }

    return responseWrapper(statusCode, data)
  } else {
    return responseWrapper(404, { error: 'Not found' })
  }
}
