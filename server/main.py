import spacy
from websocket_server import WebsocketServer
import os

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
    'message':    '[*] New Task %d [%s]'
}


# Called for every client connecting (after handshake)
def new_client(client, server):
    print(server_side_messages['connect'] % client['id'])
    # server.send_message_to_all("Hey all, a new client has joined us")


# Called for every client disconnecting
def client_left(client, server):
    print(server_side_messages['disconnect'] % client['id'])


# Called when a client sends a message
def message_received(client, server, message):
    if len(message) > 10:
        short_message = message[:10] + '...'
    else:
        short_message = message
    print(server_side_messages['message'] % (client['id'], short_message))

    doc = nlp(message)
    entities = extract_entities(EntityManager(), doc)

    server.send_message(client, str(entities))


if __name__ == '__main__':
    PORT = int(os.environ.get("PORT", 2023))
    server = WebsocketServer(port=PORT)

    print(server_side_messages['start'] % PORT)

    # https://github.com/Pithikos/python-websocket-server/blob/master/server.py
    server.set_fn_new_client(new_client)
    server.set_fn_client_left(client_left)
    server.set_fn_message_received(message_received)
    server.run_forever()
