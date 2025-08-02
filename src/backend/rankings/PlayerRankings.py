class Player:
    def __init__(self, name, team, pos, rank, tier=1, value=None):
        if team == '':
            team = 'FA'
        if str(team).lower() == 'nan':
            team = "N/A"
        self.name = name
        self.team = team
        self.pos = pos
        self.rank = rank
        self.tier = tier if tier and str(tier).lower() != 'nan' else 999
        self.value = value if value and str(value).lower() != 'nan' else None
        self.changeTeamName()

    def __str__(self):
        name = self.name
        team = self.team
        return f"{self.rank}) {name} {self.pos} {team}"

    def __eq__(self, other):
        return self.checkNameSame(other.name) and (self.team == other.team or self.team == "N/A" or other.team == "N/A") and self.pos == other.pos

    def removeWeirdChars(self, name):
        name = name.replace('III', '')
        name = name.replace('II', '')
        name = name.upper()
        name = name.replace('KENNETH', 'KEN')
        name = name.replace('GABRIEL', 'GABE')
        name = name.replace('\'', '')
        name = name.replace('JR', '')
        name = name.replace('SR', '')
        name = name.replace('.', '')
        name = name.replace(' ', '')
        name = name.replace('/', '')
        return name

    def changeTeamName(self):
        if self.team in ['JAC', 'JAX']:
            self.team = 'JAX'

        if self.team in ['WAS', 'WSH']:
            self.team = 'WAS'

    def checkNameSame(self, otherName):
        return self.removeWeirdChars(self.name) == (self.removeWeirdChars(otherName))
