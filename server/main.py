import asyncio
import signal
import os

import websockets
import spacy
import json

from entity_manager import EntityManager


# Create a blank English nlp object
nlp = spacy.load("en_core_web_sm")


# Extract entities and assign the token type
def extract_entities(entity_manager, doc):
    entities = []

    for token in doc:
        token_obj = {
            'value': token.text,
            'type': token.pos_,
            'offset': token.idx,
            'length': len(token.text),
        }
        entities.append(token_obj)

    return categorize_entities(entity_manager, entities)


# Extract entity types
def categorize_entities(entity_manager, entities):
    for entity in entities:
        match entity['type']:
            case 'NOUN':
                entity_manager.add_noun(entity)

            case 'PROPN':
                entity_manager.add_proper_noun(entity)

            case 'VERB':
                entity_manager.add_verb(entity)

            case 'NUM':
                entity_manager.add_number(entity)

            case 'SYM':
                entity_manager.add_symbol(entity)

            case _:
                entity_manager.add_misc(entity)

    return entity_manager.get_entities_by_type()


# ---------------------------------------------------------------------------- #


server_side_messages = {
    'start':      '[0] Server @ %d',
    'connect':    '[+] New user %d',
    'disconnect': '[-] User bye %d',
    'message':    '[*] New task %s'
}


# def new_client(client, server):
#     print(server_side_messages['connect'] % client['id'])


# def client_left(client, server):
#     print(server_side_messages['disconnect'] % client['id'])


# def message_received(client, server, message):
#     if len(message) > 10:
#         short_message = message[:10] + '...'
#     else:
#         short_message = message
#     print(server_side_messages['message'] % (client['id'], short_message))

#     doc = nlp(message)
#     entities = extract_entities(EntityManager(), doc)

#     server.send_message(client, str(entities))


async def parse(websocket):
    async for data in websocket:
        # parse incoming json
        data = json.loads(data)

        message = data['message']
        id = data['id']

        if len(message) > 10:
            short_message = message[:10] + '...'
        else:
            short_message = message
        print(server_side_messages['message'] % short_message)

        doc = nlp(message)
        entities = extract_entities(EntityManager(), doc)

        await websocket.send(json.dumps({
            'entities': entities,
            'id': id
        }))


async def main():
    # Set the stop condition when receiving SIGTERM.
    loop = asyncio.get_running_loop()
    stop = loop.create_future()
    loop.add_signal_handler(signal.SIGTERM, stop.set_result, None)

    port = int(os.environ["PORT"])
    print(server_side_messages['start'] % port)

    async with websockets.serve(
        parse,
        host="",
        port=port,
    ):
        await stop


if __name__ == "__main__":
    asyncio.run(main())
