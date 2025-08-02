import requests
import re
from Rankings.PlayerRankings import Player

def printTopXPlayersForPositions(positions, playerRankings, count=5):
    positionsStr = '/'.join(positions)
    print(f"\nTop {count} {positionsStr}s")
    i = 0
    posCount = 0
    while posCount < count and i < len(playerRankings):
        # print(playerRankings[i].pos)
        if playerRankings[i].pos in positions:
            print(playerRankings[i])
            posCount += 1
        i += 1


def getNameFromMetaData(metadata):
    return f"{metadata['first_name']} {metadata['last_name']}"


def getPlayersDrafted(draftID):
    draftData = requests.get(f"https://api.sleeper.app/v1/draft/{draftID}/picks").json()

    playersDrafted = []
    for item in draftData:
        metadata = item['metadata']
        name = getNameFromMetaData(metadata)
        team = metadata['team']
        pos = metadata['position']
        playersDrafted.append(Player(name, team, pos, -1))

    return playersDrafted

def remove_numbers_from_string(input_string):
    # Use regular expression to remove all numbers from the input string
    result_string = re.sub(r'\d+', '', input_string)
    return result_string

def addNewLineSpacing(numNewLines=10):
    for i in range(numNewLines):
        print()

def printTopAvailablePlayersMessage():
    print("#############################")
    print("### TOP AVAILABLE PLAYERS ###")
    print("#############################")
