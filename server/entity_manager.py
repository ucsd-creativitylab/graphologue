class EntityManager:
    def __init__(self):
        self.entities = []
        self.entities_by_type = {
            "noun": [],
            "proper_noun": [],
            "verb": [],
            "number": [],
            "symbol": [],
            "misc": []
        }

    def add_noun(self, entity):
        self.entities.append(entity)
        self.entities_by_type["noun"].append(entity)

    def add_proper_noun(self, entity):
        self.entities.append(entity)
        self.entities_by_type["proper_noun"].append(entity)

    def add_verb(self, entity):
        self.entities.append(entity)
        self.entities_by_type["verb"].append(entity)

    def add_number(self, entity):
        self.entities.append(entity)
        self.entities_by_type["number"].append(entity)

    def add_symbol(self, entity):
        self.entities.append(entity)
        self.entities_by_type["symbol"].append(entity)

    def add_misc(self, entity):
        self.entities.append(entity)
        self.entities_by_type["misc"].append(entity)

    def get_entities(self):
        return self.entities

    def get_entities_by_type(self, entity_type: str = None):
        if entity_type is None:
            return self.entities_by_type
        return self.entities_by_type[entity_type]
